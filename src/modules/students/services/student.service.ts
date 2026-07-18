import { PrismaClient, Student, StudentStatus, Gender, EnrollmentStatus, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../../../config/database';
import { config } from '../../../config';
import { logger } from '../../../shared/services/logger.service';
import { generateInitialPassword, isValidStudentPassword } from '../../../shared/utils/password';
import {
  CreateStudentDTO,
  UpdateStudentDTO,
  StudentFilters,
  StudentResponse,
  CreateStudentResult,
  ParentDTO,
  ImportResult,
  PaginatedResult,
} from '../types/student.types';
import { NotFoundException, ConflictException, BadRequestException } from '../../../shared/types/error.types';
import { format } from 'date-fns';

export class StudentService {
  /**
   * Create a new student
   */
  async create(data: CreateStudentDTO): Promise<CreateStudentResult> {
    const {
      centerId,
      fullName,
      dateOfBirth,
      gender,
      phone,
      email,
      password,
      isOffline = false,
      address,
      enrollmentDate,
      notes,
    } = data;
    const loginEmail = email?.trim().toLowerCase() || null;

    // Check center exists
    const center = await prisma.center.findUnique({ where: { id: centerId } });
    if (!center) {
      throw new NotFoundException('Center');
    }

    // Check for duplicate (same name + center + enrollment date)
    const existing = await prisma.student.findFirst({
      where: {
        centerId,
        fullName,
        enrollmentDate: new Date(enrollmentDate),
      },
    });

    if (existing) {
      throw new ConflictException(
        'A student with this name and enrollment date already exists',
        'DUPLICATE_STUDENT'
      );
    }

    // Offline / roster-only: no User account, no login credentials
    if (isOffline) {
      const student = await prisma.student.create({
        data: {
          userId: null,
          centerId,
          fullName,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          phone: phone || null,
          email: loginEmail,
          address: address || null,
          enrollmentDate: new Date(enrollmentDate),
          notes: notes || null,
          loginPassword: null,
          status: StudentStatus.active,
        },
        include: {
          center: { select: { id: true, name: true, code: true } },
        },
      });

      logger.info('Offline student created', { studentId: student.id, centerId });

      return this.formatStudent(student);
    }

    if (!loginEmail) {
      throw new BadRequestException('Email is required to create a student login account', 'EMAIL_REQUIRED');
    }

    const existingUser = await prisma.user.findUnique({ where: { email: loginEmail } });
    if (existingUser) {
      throw new ConflictException('Email already registered', 'EMAIL_EXISTS');
    }

    const studentRole = await prisma.role.findUnique({ where: { name: 'student' } });
    if (!studentRole) {
      throw new BadRequestException('Student role is not configured', 'STUDENT_ROLE_MISSING');
    }

    const initialPassword = password?.trim() || generateInitialPassword(8);
    if (!isValidStudentPassword(initialPassword)) {
      throw new BadRequestException('Password must be at least 8 characters', 'INVALID_PASSWORD');
    }
    const passwordHash = await bcrypt.hash(initialPassword, config.bcrypt.saltRounds);

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: loginEmail,
          passwordHash,
          phone: phone || null,
          centerId,
          status: UserStatus.active,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: studentRole.id,
          centerId,
        },
      });

      return tx.student.create({
        data: {
          userId: user.id,
          centerId,
          fullName,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          phone: phone || null,
          email: loginEmail,
          address: address || null,
          enrollmentDate: new Date(enrollmentDate),
          notes: notes || null,
          loginPassword: initialPassword,
          status: StudentStatus.active,
        },
        include: {
          center: { select: { id: true, name: true, code: true } },
        },
      });
    });

    logger.info('Student created', { studentId: student.id, centerId, loginEmail });

    return {
      ...this.formatStudent(student),
      loginEmail,
      initialPassword,
    };
  }

  /**
   * Get student by ID
   */
  async getById(id: string): Promise<StudentResponse> {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        center: { select: { id: true, name: true, code: true } },
        parents: true,
        enrollments: {
          where: { status: EnrollmentStatus.active },
          include: {
            class: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student');
    }

    const response = this.formatStudent(student);

    // Add current enrollment if exists
    if (student.enrollments.length > 0) {
      response.currentEnrollment = student.enrollments[0] as any;
    }

    return response;
  }

  /**
   * Get students with filters and pagination
   */
  async getAll(
    filters: StudentFilters
  ): Promise<PaginatedResult<StudentResponse>> {
    const {
      centerId,
      status,
      gender,
      search,
      enrollmentDateFrom,
      enrollmentDateTo,
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

    if (enrollmentDateFrom) {
      where.enrollmentDate = {
        ...where.enrollmentDate,
        gte: new Date(enrollmentDateFrom),
      };
    }

    if (enrollmentDateTo) {
      where.enrollmentDate = {
        ...where.enrollmentDate,
        lte: new Date(enrollmentDateTo),
      };
    }

    // Get total count
    const total = await prisma.student.count({ where });

    // Get students
    const students = await prisma.student.findMany({
      where,
      include: {
        center: { select: { id: true, name: true, code: true } },
        enrollments: {
          where: { status: EnrollmentStatus.active },
          include: { class: { select: { id: true, name: true } } },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sort]: order },
    });

    const data = students.map((s) => {
      const formatted = this.formatStudent(s);
      if (s.enrollments.length > 0) {
        formatted.currentEnrollment = s.enrollments[0] as any;
      }
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
   * Update student
   */
  async update(id: string, data: UpdateStudentDTO): Promise<StudentResponse> {
    const student = await prisma.student.findUnique({ where: { id } });

    if (!student) {
      throw new NotFoundException('Student');
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...data,
      },
      include: {
        center: { select: { id: true, name: true, code: true } },
      },
    });

    logger.info('Student updated', { studentId: id });

    return this.formatStudent(updated);
  }

  /**
   * Archive student (soft delete)
   */
  async archive(id: string): Promise<StudentResponse> {
    const student = await prisma.student.findUnique({ where: { id } });

    if (!student) {
      throw new NotFoundException('Student');
    }

    const archived = await prisma.student.update({
      where: { id },
      data: { status: StudentStatus.archived },
      include: {
        center: { select: { id: true, name: true, code: true } },
      },
    });

    logger.info('Student archived', { studentId: id });

    return this.formatStudent(archived);
  }

  /**
   * Bulk archive students
   */
  async bulkArchive(ids: string[]): Promise<{ archived: number }> {
    const result = await prisma.student.updateMany({
      where: { id: { in: ids } },
      data: { status: StudentStatus.archived },
    });

    logger.info('Students bulk archived', { count: result.count });

    return { archived: result.count };
  }

  /**
   * Add parent to student
   */
  async addParent(studentId: string, parent: ParentDTO): Promise<void> {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student');
    }

    await prisma.parent.create({
      data: {
        studentId,
        ...parent,
      },
    });

    logger.info('Parent added to student', { studentId });
  }

  /**
   * Smart class transfer: withdraw from old class, enroll in new, preserve history
   */
  async transferClass(
    studentId: string,
    data: {
      fromClassId: string;
      toClassId: string;
      effectiveDate: Date;
      reason: string;
    }
  ): Promise<{
    withdrawnEnrollment: { id: string; classId: string; status: string };
    newEnrollment: { id: string; classId: string; status: string };
    message: string;
  }> {
    const { fromClassId, toClassId, effectiveDate, reason } = data;

    if (fromClassId === toClassId) {
      throw new BadRequestException('Source and target class must be different');
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student');
    }

    const fromEnrollment = await prisma.enrollment.findFirst({
      where: { studentId, classId: fromClassId, status: EnrollmentStatus.active },
    });

    if (!fromEnrollment) {
      throw new NotFoundException('Active enrollment in source class');
    }

    const toClass = await prisma.class.findUnique({
      where: { id: toClassId },
      include: { _count: { select: { enrollments: { where: { status: 'active' } } } } },
    });

    if (!toClass) {
      throw new NotFoundException('Target class');
    }

    if (toClass.centerId !== student.centerId) {
      throw new BadRequestException('Target class must belong to the same center as the student');
    }

    const activeInTarget = await prisma.enrollment.findFirst({
      where: { studentId, classId: toClassId, status: EnrollmentStatus.active },
    });

    if (activeInTarget) {
      throw new ConflictException('Student is already enrolled in the target class', 'ALREADY_ENROLLED');
    }

    const availableSlots = toClass.capacity - toClass._count.enrollments;
    if (availableSlots < 1) {
      throw new BadRequestException('Target class is at full capacity', 'CAPACITY_EXCEEDED');
    }

    const transferNote = `[Transfer ${format(effectiveDate, 'yyyy-MM-dd')}] ${reason}`;

    const result = await prisma.$transaction(async (tx) => {
      const withdrawn = await tx.enrollment.update({
        where: { id: fromEnrollment.id },
        data: {
          status: EnrollmentStatus.withdrawn,
          endDate: effectiveDate,
          notes: fromEnrollment.notes
            ? `${fromEnrollment.notes}\n${transferNote}`
            : transferNote,
        },
      });

      const existingTarget = await tx.enrollment.findUnique({
        where: { studentId_classId: { studentId, classId: toClassId } },
      });

      let newEnrollment;
      if (existingTarget) {
        newEnrollment = await tx.enrollment.update({
          where: { id: existingTarget.id },
          data: {
            status: EnrollmentStatus.active,
            startDate: effectiveDate,
            endDate: null,
            enrolledAt: new Date(),
            notes: existingTarget.notes
              ? `${existingTarget.notes}\n${transferNote}`
              : transferNote,
          },
        });
      } else {
        newEnrollment = await tx.enrollment.create({
          data: {
            studentId,
            classId: toClassId,
            enrolledAt: new Date(),
            startDate: effectiveDate,
            status: EnrollmentStatus.active,
            notes: transferNote,
          },
        });
      }

      return { withdrawn, newEnrollment };
    });

    logger.info('Student transferred between classes', {
      studentId,
      fromClassId,
      toClassId,
      effectiveDate,
    });

    return {
      withdrawnEnrollment: {
        id: result.withdrawn.id,
        classId: result.withdrawn.classId,
        status: result.withdrawn.status,
      },
      newEnrollment: {
        id: result.newEnrollment.id,
        classId: result.newEnrollment.classId,
        status: result.newEnrollment.status,
      },
      message: 'Student transferred successfully',
    };
  }

  /**
   * Import students from Excel data
   */
  async importFromExcel(
    centerId: string,
    rows: any[]
  ): Promise<ImportResult> {
    const errors: Array<{ row: number; message: string }> = [];
    const students: Array<{ id: string; fullName: string }> = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        // Validate required fields
        if (!row.fullName || !row.dateOfBirth || !row.gender || !row.enrollmentDate) {
          errors.push({ row: i + 1, message: 'Missing required fields' });
          continue;
        }

        // Parse and validate date
        const dateOfBirth = new Date(row.dateOfBirth);
        const enrollmentDate = new Date(row.enrollmentDate);

        if (isNaN(dateOfBirth.getTime()) || isNaN(enrollmentDate.getTime())) {
          errors.push({ row: i + 1, message: 'Invalid date format' });
          continue;
        }

        // Check for duplicate
        const existing = await prisma.student.findFirst({
          where: {
            centerId,
            fullName: row.fullName,
            enrollmentDate,
          },
        });

        if (existing) {
          errors.push({ row: i + 1, message: 'Duplicate student' });
          continue;
        }

        const student = await prisma.student.create({
          data: {
            centerId,
            fullName: row.fullName,
            dateOfBirth,
            gender: row.gender,
            phone: row.phone || null,
            email: row.email || null,
            address: row.address || null,
            enrollmentDate,
            status: StudentStatus.active,
          },
        });

        students.push({ id: student.id, fullName: student.fullName });
        imported++;
      } catch (error: any) {
        errors.push({ row: i + 1, message: error.message });
      }
    }

    logger.info('Students imported', { centerId, imported, failed: errors.length });

    return {
      totalRows: rows.length,
      imported,
      failed: errors.length,
      errors,
      students,
    };
  }

  /**
   * Export students to Excel-compatible JSON
   */
  async exportToExcel(filters: StudentFilters): Promise<any[]> {
    const students = await this.getAll({ ...filters, page: 1, limit: 10000 });

    return students.data.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      dateOfBirth: format(new Date(s.dateOfBirth), 'yyyy-MM-dd'),
      gender: s.gender,
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      enrollmentDate: format(new Date(s.enrollmentDate), 'yyyy-MM-dd'),
      status: s.status,
      center: s.center?.name || '',
    }));
  }

  /**
   * Format student for response
   */
  private formatStudent(student: any): StudentResponse {
    return {
      id: student.id,
      fullName: student.fullName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      phone: student.phone,
      email: student.email,
      address: student.address,
      avatarUrl: student.avatarUrl,
      enrollmentDate: student.enrollmentDate,
      status: student.status,
      notes: student.notes,
      loginPassword: student.loginPassword ?? null,
      hasPortalAccess: !!student.userId,
      centerId: student.centerId,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      center: student.center
        ? {
            id: student.center.id,
            name: student.center.name,
            code: student.center.code,
          }
        : undefined,
    };
  }
}

export const studentService = new StudentService();
export default studentService;