import { PrismaClient, Teacher, TeacherStatus, Gender, TeacherRole } from '@prisma/client';
import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import {
  CreateTeacherDTO,
  UpdateTeacherDTO,
  TeacherFilters,
  TeacherResponse,
  TeacherWithClasses,
  AssignClassDTO,
  PaginatedResult,
} from '../types/teacher.types';
import { NotFoundException, ConflictException, BadRequestException } from '../../../shared/types/error.types';

export class TeacherService {
  /**
   * Create a new teacher
   */
  async create(data: CreateTeacherDTO): Promise<TeacherResponse> {
    // Check center exists
    const center = await prisma.center.findUnique({
      where: { id: data.centerId },
    });
    if (!center) {
      throw new NotFoundException('Center');
    }

    // Check for duplicate email in center
    const existing = await prisma.teacher.findFirst({
      where: { centerId: data.centerId, email: data.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered in this center', 'DUPLICATE_EMAIL');
    }

    const teacher = await prisma.teacher.create({
      data: {
        centerId: data.centerId,
        fullName: data.fullName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        phone: data.phone,
        email: data.email,
        address: data.address || null,
        qualification: data.qualification || null,
        specialization: data.specialization || null,
        hireDate: data.hireDate ? new Date(data.hireDate) : null,
        salary: data.salary ?? null,
        notes: data.notes || null,
        status: TeacherStatus.active,
      },
      include: {
        center: { select: { id: true, name: true, code: true } },
      },
    });

    logger.info('Teacher created', { teacherId: teacher.id, centerId: data.centerId });

    return this.formatTeacher(teacher);
  }

  /**
   * Get teacher by ID with classes
   */
  async getById(id: string): Promise<TeacherWithClasses> {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        center: { select: { id: true, name: true, code: true } },
        classTeachers: {
          include: {
            class: {
              select: { id: true, name: true, academicLevel: true, status: true },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher');
    }

    const response = this.formatTeacherWithClasses(teacher);
    return response;
  }

  /**
   * Get all teachers with filters
   */
  async getAll(filters: TeacherFilters): Promise<PaginatedResult<TeacherResponse>> {
    const {
      centerId,
      status,
      gender,
      search,
      hireDateFrom,
      hireDateTo,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
    } = filters;

    // Build where clause
    const where: any = {};
    if (centerId) where.centerId = centerId;
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    if (hireDateFrom) {
      where.hireDate = { ...where.hireDate, gte: new Date(hireDateFrom) };
    }
    if (hireDateTo) {
      where.hireDate = { ...where.hireDate, lte: new Date(hireDateTo) };
    }

    // Get total count
    const total = await prisma.teacher.count({ where });

    // Get teachers
    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        center: { select: { id: true, name: true, code: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sort]: order },
    });

    return {
      data: teachers.map((t) => this.formatTeacher(t)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update teacher
   */
  async update(id: string, data: UpdateTeacherDTO): Promise<TeacherResponse> {
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      throw new NotFoundException('Teacher');
    }

    // Check email uniqueness if changing
    if (data.email && data.email !== teacher.email) {
      const existing = await prisma.teacher.findFirst({
        where: { centerId: teacher.centerId, email: data.email, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Email already in use', 'DUPLICATE_EMAIL');
      }
    }

    const updated = await prisma.teacher.update({
      where: { id },
      data: {
        ...data,
        salary: data.salary,
      },
      include: {
        center: { select: { id: true, name: true, code: true } },
      },
    });

    logger.info('Teacher updated', { teacherId: id });
    return this.formatTeacher(updated);
  }

  /**
   * Archive teacher (soft delete)
   */
  async archive(id: string): Promise<TeacherResponse> {
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      throw new NotFoundException('Teacher');
    }

    const archived = await prisma.teacher.update({
      where: { id },
      data: { status: TeacherStatus.terminated },
      include: {
        center: { select: { id: true, name: true, code: true } },
      },
    });

    logger.info('Teacher archived', { teacherId: id });
    return this.formatTeacher(archived);
  }

  /**
   * Assign teacher to class
   */
  async assignClass(teacherId: string, data: AssignClassDTO): Promise<void> {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundException('Teacher');
    }

    const classRecord = await prisma.class.findUnique({
      where: { id: data.classId },
    });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    // Check if already assigned
    const existing = await prisma.classTeacher.findFirst({
      where: { classId: data.classId, teacherId },
    });
    if (existing) {
      throw new ConflictException('Teacher already assigned to this class', 'ALREADY_ASSIGNED');
    }

    // Check primary teacher limit
    if (data.role === 'primary' || !data.role) {
      const primaryExists = await prisma.classTeacher.findFirst({
        where: { classId: data.classId, role: 'primary' },
      });
      if (primaryExists) {
        throw new ConflictException('Class already has a primary teacher', 'PRIMARY_EXISTS');
      }
    }

    await prisma.classTeacher.create({
      data: {
        teacherId,
        classId: data.classId,
        role: data.role || 'primary',
      },
    });

    logger.info('Teacher assigned to class', { teacherId, classId: data.classId });
  }

  /**
   * Bulk assign classes to teacher
   */
  async bulkAssignClasses(teacherId: string, classes: AssignClassDTO[]): Promise<void> {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundException('Teacher');
    }

    for (const item of classes) {
      try {
        await this.assignClass(teacherId, { classId: item.classId, role: item.role });
      } catch (error) {
        // Continue with other classes even if one fails
        logger.warn('Failed to assign class', { teacherId, classId: item.classId, error });
      }
    }
  }

  /**
   * Remove teacher from class
   */
  async unassignClass(teacherId: string, classId: string): Promise<void> {
    const assignment = await prisma.classTeacher.findFirst({
      where: { teacherId, classId },
    });

    if (!assignment) {
      throw new NotFoundException('Class assignment');
    }

    await prisma.classTeacher.delete({ where: { id: assignment.id } });
    logger.info('Teacher unassigned from class', { teacherId, classId });
  }

  /**
   * Get teacher's class assignments
   */
  async getClassAssignments(teacherId: string): Promise<any[]> {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundException('Teacher');
    }

    const assignments = await prisma.classTeacher.findMany({
      where: { teacherId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            academicLevel: true,
            status: true,
          },
        },
      },
    });

    return assignments.map((a) => ({
      id: a.id,
      class: a.class,
      role: a.role,
      assignedAt: a.assignedAt,
    }));
  }

  /**
   * Get teacher's teaching history
   */
  async getTeachingHistory(teacherId: string): Promise<any[]> {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundException('Teacher');
    }

    const sessions = await prisma.session.findMany({
      where: { teacherId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            academicLevel: true,
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
      take: 100, // Last 100 sessions
    });

    return sessions.map((s) => ({
      id: s.id,
      class: s.class,
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      sessionType: s.sessionType,
      status: s.status,
    }));
  }

  /**
   * Format teacher for response
   */
  private formatTeacher(teacher: any): TeacherResponse {
    return {
      id: teacher.id,
      fullName: teacher.fullName,
      dateOfBirth: teacher.dateOfBirth,
      gender: teacher.gender,
      phone: teacher.phone,
      email: teacher.email,
      address: teacher.address,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
      hireDate: teacher.hireDate,
      salary: teacher.salary ? Number(teacher.salary) / 100 : null,
      status: teacher.status,
      avatarUrl: teacher.avatarUrl,
      notes: teacher.notes,
      loginPassword: teacher.loginPassword ?? null,
      centerId: teacher.centerId,
      center: teacher.center,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };
  }

  /**
   * Format teacher with classes for response
   */
  private formatTeacherWithClasses(teacher: any): TeacherWithClasses {
    return {
      ...this.formatTeacher(teacher),
      classes: teacher.classTeachers.map((ct: any) => ({
        id: ct.id,
        class: ct.class,
        role: ct.role,
        assignedAt: ct.assignedAt,
      })),
    };
  }
}

export const teacherService = new TeacherService();
export default teacherService;