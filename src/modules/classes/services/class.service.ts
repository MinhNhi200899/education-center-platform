import { PrismaClient, Class, ClassTeacher, Enrollment, ClassStatus, AcademicLevel } from '@prisma/client';
import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import {
  CreateClassDTO,
  UpdateClassDTO,
  ClassFilters,
  ClassResponse,
  ClassDetailResponse,
  PaginatedResult,
  EnrollmentResult,
  TeacherAssignmentResult,
  WeeklySchedule,
  ClassTeacherRole,
  EnrollStudentsDTO,
} from '../types/class.types';
import { NotFoundException, ConflictException, BadRequestException } from '../../../shared/types/error.types';
import { scheduleService } from './schedule.service';

export class ClassService {
  async generateSessionsForMonth(classId: string, startDate: Date, endDate: Date) {
    return scheduleService.generateSessions(classId, startDate, endDate);
  }
  /**
   * Create a new class
   */
  async create(data: CreateClassDTO): Promise<ClassResponse> {
    const {
      centerId,
      name,
      description,
      academicLevel,
      capacity,
      classroom,
      schedule,
      startDate,
      endDate,
      notes,
    } = data;

    // Check center exists
    const center = await prisma.center.findUnique({ where: { id: centerId } });
    if (!center) {
      throw new NotFoundException('Center');
    }

    // Check for duplicate class name within center
    const existing = await prisma.class.findFirst({
      where: { centerId, name },
    });

    if (existing) {
      throw new ConflictException('A class with this name already exists in this center', 'DUPLICATE_CLASS');
    }

    // Validate endDate >= startDate
    if (endDate && new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('End date must be greater than or equal to start date');
    }

    const classRecord = await prisma.class.create({
      data: {
        centerId,
        name,
        description: description || null,
        academicLevel: academicLevel as AcademicLevel,
        capacity,
        classroom: classroom || null,
        schedule: schedule as any,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
        status: ClassStatus.active,
      },
      include: {
        center: { select: { id: true, name: true, code: true } },
      },
    });

    logger.info('Class created', { classId: classRecord.id, centerId });

    return this.formatClass(classRecord);
  }

  /**
   * Get class by ID
   */
  async getById(id: string): Promise<ClassDetailResponse> {
    const classRecord = await prisma.class.findUnique({
      where: { id },
      include: {
        center: { select: { id: true, name: true, code: true } },
        classTeachers: {
          include: {
            teacher: {
              select: { id: true, fullName: true, email: true, phone: true, status: true },
            },
          },
        },
        enrollments: {
          where: { status: 'active' },
          include: {
            student: { select: { id: true, fullName: true, status: true } },
          },
          orderBy: { enrolledAt: 'desc' },
        },
        _count: {
          select: { enrollments: { where: { status: 'active' } } },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    return this.formatClassDetail(classRecord);
  }

  /**
   * Get classes with filters and pagination
   */
  async getAll(filters: ClassFilters): Promise<PaginatedResult<ClassResponse>> {
    const {
      centerId,
      status,
      academicLevel,
      search,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
    } = filters;

    // Build where clause
    const where: any = {};

    if (centerId) where.centerId = centerId;
    if (status) where.status = status;
    if (academicLevel) where.academicLevel = academicLevel;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { classroom: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.class.count({ where });

    // Get classes with enrollment count
    const classes = await prisma.class.findMany({
      where,
      include: {
        center: { select: { id: true, name: true, code: true } },
        classTeachers: {
          where: { role: 'primary' },
          include: {
            teacher: { select: { id: true, fullName: true } },
          },
        },
        _count: {
          select: { enrollments: { where: { status: 'active' } } },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sort]: order },
    });

    const data = classes.map((c) => {
      const formatted = this.formatClass(c as any);
      formatted.currentEnrollment = c._count.enrollments;
      formatted.primaryTeacher = c.classTeachers[0]?.teacher || null;
      return formatted;
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update class
   */
  async update(id: string, data: UpdateClassDTO): Promise<ClassResponse> {
    const classRecord = await prisma.class.findUnique({ where: { id } });

    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== classRecord.name) {
      const existing = await prisma.class.findFirst({
        where: { centerId: classRecord.centerId, name: data.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('A class with this name already exists in this center', 'DUPLICATE_CLASS');
      }
    }

    // Validate endDate >= startDate if both dates are being updated
    const newEndDate = data.endDate ? new Date(data.endDate as any) : classRecord.endDate;
    const startDate = classRecord.startDate;
    if (newEndDate && newEndDate < startDate) {
      throw new BadRequestException('End date must be greater than or equal to start date');
    }

    // Check capacity constraint if reducing
    const activeEnrollment = await prisma.enrollment.count({
      where: { classId: id, status: 'active' },
    });
    if (data.capacity && data.capacity < activeEnrollment) {
      throw new BadRequestException(
        `Cannot reduce capacity below current enrollment of ${activeEnrollment}`
      );
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        capacity: data.capacity,
        classroom: data.classroom,
        schedule: data.schedule as any,
        endDate: data.endDate ? new Date(data.endDate as any) : undefined,
        notes: data.notes,
        status: data.status,
      },
      include: {
        center: { select: { id: true, name: true, code: true } },
      },
    });

    logger.info('Class updated', { classId: id });

    return this.formatClass(updated);
  }

  /**
   * Archive class (soft delete)
   */
  async archive(id: string): Promise<ClassResponse> {
    const classRecord = await prisma.class.findUnique({ where: { id } });

    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const archived = await prisma.class.update({
      where: { id },
      data: { status: ClassStatus.archived },
      include: {
        center: { select: { id: true, name: true, code: true } },
      },
    });

    logger.info('Class archived', { classId: id });

    return this.formatClass(archived);
  }

  /**
   * Assign teacher to class
   */
  async assignTeacher(classId: string, teacherId: string, role: ClassTeacherRole): Promise<TeacherAssignmentResult> {
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundException('Teacher');
    }

    // Check if teacher belongs to the same center
    if (teacher.centerId !== classRecord.centerId) {
      throw new BadRequestException('Teacher must belong to the same center as the class');
    }

    // Check if teacher is already assigned in the same role
    const existingAssignment = await prisma.classTeacher.findFirst({
      where: { classId, teacherId, role },
    });

    if (existingAssignment) {
      throw new ConflictException('Teacher is already assigned to this class with this role');
    }

    // If assigning as primary, check if there's already a primary teacher
    if (role === 'primary') {
      const existingPrimary = await prisma.classTeacher.findFirst({
        where: { classId, role: 'primary' },
      });
      if (existingPrimary) {
        throw new ConflictException('Only one primary teacher is allowed per class', 'DUPLICATE_PRIMARY');
      }
    }

    // Create assignment
    await prisma.classTeacher.create({
      data: {
        classId,
        teacherId,
        role: role as any,
        assignedAt: new Date(),
      },
    });

    logger.info('Teacher assigned to class', { classId, teacherId, role });

    // Return updated teachers list
    const teachers = await this.getClassTeachers(classId);
    return { teachers };
  }

  /**
   * Bulk assign teachers to class
   */
  async bulkAssignTeachers(classId: string, teachers: Array<{ teacherId: string; role: ClassTeacherRole }>): Promise<TeacherAssignmentResult> {
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    // Check for existing primary teacher
    const hasPrimary = teachers.some((t) => t.role === 'primary');
    if (!hasPrimary) {
      // Check if class already has a primary teacher
      const existingPrimary = await prisma.classTeacher.findFirst({
        where: { classId, role: 'primary' },
      });
      if (!existingPrimary) {
        throw new BadRequestException('At least one primary teacher is required');
      }
    }

    // Validate all teachers belong to the same center
    const teacherIds = teachers.map((t) => t.teacherId);
    const existingTeachers = await prisma.teacher.findMany({
      where: { id: { in: teacherIds } },
    });

    if (existingTeachers.length !== teacherIds.length) {
      throw new BadRequestException('One or more teachers not found');
    }

    const invalidTeachers = existingTeachers.filter((t) => t.centerId !== classRecord.centerId);
    if (invalidTeachers.length > 0) {
      throw new BadRequestException('All teachers must belong to the same center as the class');
    }

    // Use transaction to assign teachers
    await prisma.$transaction(async (tx) => {
      // Remove existing assignments
      await tx.classTeacher.deleteMany({ where: { classId } });

      // Create new assignments
      await tx.classTeacher.createMany({
        data: teachers.map((t) => ({
          classId,
          teacherId: t.teacherId,
          role: t.role as any,
          assignedAt: new Date(),
        })),
      });
    });

    logger.info('Teachers bulk assigned to class', { classId, count: teachers.length });

    const updatedTeachers = await this.getClassTeachers(classId);
    return { teachers: updatedTeachers };
  }

  /**
   * Remove teacher from class
   */
  async removeTeacher(classId: string, teacherId: string, role?: ClassTeacherRole): Promise<void> {
    const classTeacher = await prisma.classTeacher.findFirst({
      where: {
        classId,
        teacherId,
        ...(role ? { role: role as any } : {}),
      },
    });

    if (!classTeacher) {
      throw new NotFoundException('Teacher assignment');
    }

    // Prevent removing the only primary teacher if class has active enrollments
    if (classTeacher.role === 'primary') {
      const classRecord = await prisma.class.findUnique({
        where: { id: classId },
        include: { _count: { select: { enrollments: { where: { status: 'active' } } } } },
      });

      if (classRecord && classRecord._count.enrollments > 0) {
        const remainingPrimary = await prisma.classTeacher.count({
          where: { classId, role: 'primary', teacherId: { not: teacherId } },
        });
        if (remainingPrimary === 0) {
          throw new BadRequestException('Cannot remove the only primary teacher from a class with active students');
        }
      }
    }

    await prisma.classTeacher.delete({
      where: { id: classTeacher.id },
    });

    logger.info('Teacher removed from class', { classId, teacherId, role });
  }

  /**
   * Enroll students in class
   */
  async enrollStudents(classId: string, data: EnrollStudentsDTO): Promise<EnrollmentResult> {
    const { studentIds, startDate, notes } = data;

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { enrollments: { where: { status: 'active' } } } } },
    });

    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    // Load existing enrollments for these students (any status)
    const existingEnrollments = await prisma.enrollment.findMany({
      where: { classId, studentId: { in: studentIds } },
      select: { id: true, studentId: true, status: true },
    });
    const existingByStudentId = new Map(existingEnrollments.map((e) => [e.studentId, e]));

    const alreadyActiveIds: string[] = [];
    const toReactivateIds: string[] = [];
    const toCreateIds: string[] = [];
    for (const sid of studentIds) {
      const ex = existingByStudentId.get(sid);
      if (!ex) toCreateIds.push(sid);
      else if (ex.status === 'active') alreadyActiveIds.push(sid);
      else toReactivateIds.push(sid);
    }

    const toEnrollIds = [...toCreateIds, ...toReactivateIds];

    // Check capacity (only for net-new enrollments)
    const availableSlots = classRecord.capacity - classRecord._count.enrollments;
    if (toEnrollIds.length > availableSlots) {
      throw new BadRequestException(
        `Only ${availableSlots} slots available. Cannot enroll ${toEnrollIds.length} students.`,
        'CAPACITY_EXCEEDED'
      );
    }

    // Verify all students exist and are active (only for net-new/re-activated)
    const students = await prisma.student.findMany({
      where: { id: { in: toEnrollIds }, status: 'active' },
    });

    if (students.length !== toEnrollIds.length) {
      throw new BadRequestException('One or more students not found or not active');
    }

    // Check that all students belong to the same center
    const invalidStudents = students.filter((s) => s.centerId !== classRecord.centerId);
    if (invalidStudents.length > 0) {
      throw new BadRequestException('All students must belong to the same center as the class');
    }

    // If everything was already enrolled, treat as a no-op success
    if (toEnrollIds.length === 0) {
      return {
        enrollments: [],
        message: 'No new students to enroll (all selected students are already enrolled)',
      };
    }

    // Enroll students in transaction
    const effectiveStartDate = startDate ? new Date(startDate) : classRecord.startDate;
    const enrollments = await prisma.$transaction(async (tx) => {
      // Reactivate old enrollments (withdrawn/completed)
      if (toReactivateIds.length > 0) {
        await tx.enrollment.updateMany({
          where: { classId, studentId: { in: toReactivateIds } },
          data: {
            status: 'active',
            startDate: effectiveStartDate,
            endDate: null,
            notes: notes || null,
          },
        });
      }

      // Create new enrollments
      if (toCreateIds.length > 0) {
        await tx.enrollment.createMany({
          data: toCreateIds.map((studentId) => ({
            studentId,
            classId,
            enrolledAt: new Date(),
            startDate: effectiveStartDate,
            status: 'active',
            notes: notes || null,
          })),
        });
      }

      // Fetch active enrollments affected
      return tx.enrollment.findMany({
        where: { classId, studentId: { in: toEnrollIds }, status: 'active' },
        select: { id: true, studentId: true, status: true },
      });
    });

    logger.info('Students enrolled in class', {
      classId,
      requested: studentIds.length,
      created: toCreateIds.length,
      reactivated: toReactivateIds.length,
      alreadyActive: alreadyActiveIds.length,
    });

    return {
      enrollments: enrollments.map((e) => ({ id: e.id, studentId: e.studentId, status: e.status })),
      message: `${toEnrollIds.length} students enrolled successfully`,
    };
  }

  /**
   * Withdraw student from class
   */
  async withdrawStudent(classId: string, studentId: string): Promise<void> {
    const enrollment = await prisma.enrollment.findFirst({
      where: { classId, studentId, status: 'active' },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment');
    }

    await prisma.$transaction(async (tx) => {
      // Update enrollment status
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { status: 'withdrawn', endDate: new Date() },
      });

    });

    logger.info('Student withdrawn from class', { classId, studentId });
  }

  /**
   * Get enrolled students for a class
   */
  async getEnrolledStudents(classId: string) {
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: 'active' },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            phone: true,
            status: true,
          },
        },
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    return enrollments.map((e) => e.student);
  }

  /**
   * Get class sessions
   */
  async getClassSessions(
    classId: string,
    filters: { startDate?: string; endDate?: string; status?: string }
  ): Promise<any[]> {
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const where: any = { classId };
    if (filters.startDate) where.sessionDate = { ...where.sessionDate, gte: new Date(filters.startDate) };
    if (filters.endDate) where.sessionDate = { ...where.sessionDate, lte: new Date(filters.endDate) };
    if (filters.status) where.status = filters.status;

    const sessions = await prisma.session.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            teacher: { select: { fullName: true } },
          },
        },
        _count: {
          select: {
            attendanceRecords: true,
          },
        },
      },
      orderBy: { sessionDate: 'asc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      classroom: s.classroom,
      sessionType: s.sessionType,
      status: s.status,
      teacher: s.teacher
        ? {
            id: s.teacher.id,
            fullName: s.teacher.teacher?.fullName ?? s.teacher.email,
          }
        : null,
      attendanceSummary: s._count.attendanceRecords,
    }));
  }

  /**
   * Validate class schedule for conflicts
   */
  async validateSchedule(
    classId: string,
    schedule: WeeklySchedule
  ): Promise<{ valid: boolean; conflicts: string[] }> {
    const conflicts: string[] = [];

    // Check for empty schedule in active class
    const hasSlots = Object.values(schedule).some((day) => day.length > 0);
    if (!hasSlots) {
      conflicts.push('Schedule cannot be empty');
    }

    // Validate time slots
    for (const [day, slots] of Object.entries(schedule)) {
      for (const slot of slots) {
        if (slot.startTime >= slot.endTime) {
          conflicts.push(`${day}: Start time must be before end time`);
        }
      }

      // Check for overlapping slots in the same day
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          if (slots[i].startTime < slots[j].endTime && slots[j].startTime < slots[i].endTime) {
            conflicts.push(`${day}: Overlapping time slots detected`);
          }
        }
      }
    }

    return { valid: conflicts.length === 0, conflicts };
  }

  /**
   * Get teachers assigned to class
   */
  private async getClassTeachers(classId: string): Promise<Array<{ id: string; fullName: string; role: ClassTeacherRole }>> {
    const classTeachers = await prisma.classTeacher.findMany({
      where: { classId },
      include: { teacher: { select: { id: true, fullName: true } } },
    });

    return classTeachers.map((ct) => ({
      id: ct.teacher.id,
      fullName: ct.teacher.fullName,
      role: ct.role as ClassTeacherRole,
    }));
  }

  /**
   * Format class for response
   */
  private formatClass(classRecord: any): ClassResponse {
    return {
      id: classRecord.id,
      name: classRecord.name,
      description: classRecord.description,
      academicLevel: classRecord.academicLevel,
      capacity: classRecord.capacity,
      currentEnrollment: classRecord._count?.enrollments ?? 0,
      status: classRecord.status,
      classroom: classRecord.classroom,
      schedule: classRecord.schedule,
      startDate: classRecord.startDate,
      endDate: classRecord.endDate,
      notes: classRecord.notes,
      centerId: classRecord.centerId,
      createdAt: classRecord.createdAt,
      updatedAt: classRecord.updatedAt,
      center: classRecord.center
        ? {
            id: classRecord.center.id,
            name: classRecord.center.name,
            code: classRecord.center.code,
          }
        : undefined,
      primaryTeacher: classRecord.primaryTeacher || undefined,
      teachers: classRecord.teachers || undefined,
      students: classRecord.students || undefined,
    };
  }

  /**
   * Format class detail for response
   */
  private formatClassDetail(classRecord: any): ClassDetailResponse {
    const base = this.formatClass(classRecord);
    return {
      ...base,
      primaryTeacher: classRecord.classTeachers?.find((ct: any) => ct.role === 'primary')?.teacher || null,
      teachers: classRecord.classTeachers?.map((ct: any) => ({
        id: ct.teacher.id,
        fullName: ct.teacher.fullName,
        role: ct.role,
      })) || [],
      students: classRecord.enrollments?.map((e: any) => ({
        id: e.student.id,
        fullName: e.student.fullName,
        status: e.status,
      })) || [],
      enrollments: classRecord.enrollments || [],
    };
  }
}

export const classService = new ClassService();
export default classService;