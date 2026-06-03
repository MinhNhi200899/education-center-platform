import {
  AttendanceStatus,
  SessionStatus,
  EnrollmentStatus,
  PrismaClient,
} from '@prisma/client';
import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import {
  MarkAttendanceDTO,
  BulkAttendanceDTO,
  CreateAttendanceSessionDTO,
  UpdateAttendanceDTO,
  ApproveAbsenceDTO,
  AttendanceFilters,
  AttendanceRecordResponse,
  StudentAttendanceStats,
  ClassAttendanceStats,
  PaginatedAttendanceResult,
  MarkAttendanceResult,
  AbsenceReasonDTO,
  AbsenceReasonResponse,
  StudentAttendanceStatus,
  MonthlyAttendanceGrid,
  MonthlyBulkAttendanceDTO,
} from '../types/attendance.types';
import { NotFoundException, BadRequestException } from '../../../shared/types/error.types';
import { startOfMonth, endOfMonth } from 'date-fns';
import { scheduleService } from '../../classes/services/schedule.service';

// ============================================================
// ATTENDANCE SERVICE
// Education Center Management Platform
// ============================================================

export class AttendanceService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Mark a single attendance record
   */
  async markAttendance(
    data: MarkAttendanceDTO,
    recordedBy: string
  ): Promise<AttendanceRecordResponse> {
    const { studentId, sessionId, status, reason } = data;

    // Verify session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException('Session');
    }

    // Verify student is enrolled in the class
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId,
          classId: session.classId,
        },
      },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.active) {
      throw new BadRequestException('Student is not enrolled in this class');
    }

    // Check for existing attendance record (upsert behavior)
    const existingRecord = await this.prisma.attendanceRecord.findUnique({
      where: { studentId_sessionId: { studentId, sessionId } },
    });

    let attendanceRecord;

    if (existingRecord) {
      // Update existing record
      attendanceRecord = await this.prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          status,
          reason: this.shouldStoreReason(status) ? reason : null,
          recordedBy,
          recordedAt: new Date(),
        },
        include: {
          student: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
          session: {
            include: {
              class: { select: { id: true, name: true } },
            },
          },
        },
      });

      logger.info('Attendance record updated', {
        attendanceId: attendanceRecord.id,
        studentId,
        sessionId,
        status,
      });
    } else {
      // Create new record
      attendanceRecord = await this.prisma.attendanceRecord.create({
        data: {
          studentId,
          sessionId,
          status,
          reason: this.shouldStoreReason(status) ? reason : null,
          recordedBy,
          recordedAt: new Date(),
        },
        include: {
          student: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
          session: {
            include: {
              class: { select: { id: true, name: true } },
            },
          },
        },
      });

      logger.info('Attendance record created', {
        attendanceId: attendanceRecord.id,
        studentId,
        sessionId,
        status,
      });
    }

    return this.formatAttendanceRecord(attendanceRecord);
  }

  /**
   * Bulk mark attendance for a session
   */
  async bulkMarkAttendance(
    data: BulkAttendanceDTO,
    recordedBy: string
  ): Promise<MarkAttendanceResult> {
    const { sessionId, records } = data;

    // Verify session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException('Session');
    }

    const results = { marked: 0, updated: 0, absentStudents: [] as string[] };

    // Process each record
    for (const record of records) {
      try {
        const existingRecord = await this.prisma.attendanceRecord.findUnique({
          where: { studentId_sessionId: { studentId: record.studentId, sessionId } },
        });

        if (existingRecord) {
          await this.prisma.attendanceRecord.update({
            where: { id: existingRecord.id },
            data: {
              status: record.status,
              reason: this.shouldStoreReason(record.status) ? record.reason : null,
              recordedBy,
              recordedAt: new Date(),
            },
          });
          results.updated++;
        } else {
          await this.prisma.attendanceRecord.create({
            data: {
              studentId: record.studentId,
              sessionId,
              status: record.status,
              reason: this.shouldStoreReason(record.status) ? record.reason : null,
              recordedBy,
              recordedAt: new Date(),
            },
          });
          results.marked++;
        }

        // Track absent students for notification
        if (record.status === AttendanceStatus.absent || record.status === AttendanceStatus.late) {
          results.absentStudents.push(record.studentId);
        }
      } catch (error) {
        logger.error('Error processing attendance record', { studentId: record.studentId, error });
      }
    }

    // Update session status to completed if not already
    if (session.status === SessionStatus.scheduled) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.completed },
      });
    }

    if (results.absentStudents.length > 0) {
      await this.notifyParentsOfAbsence(results.absentStudents, sessionId);
    }

    logger.info('Bulk attendance marked', {
      sessionId,
      marked: results.marked,
      updated: results.updated,
    });

    return results;
  }

  /**
   * Mark attendance for all students in a session (create session attendance)
   */
  async markSessionAttendance(
    data: CreateAttendanceSessionDTO,
    recordedBy: string
  ): Promise<MarkAttendanceResult> {
    const { sessionId, defaultStatus = AttendanceStatus.present, records } = data;

    // Verify session exists and get enrollments
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          include: {
            enrollments: {
              where: { status: EnrollmentStatus.active },
              include: {
                student: {
                  select: { id: true, fullName: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session');
    }

    const enrolledStudents = session.class.enrollments;
    const results = { marked: 0, updated: 0, absentStudents: [] as string[] };

    // Get existing attendance records for this session
    const existingRecords = await this.prisma.attendanceRecord.findMany({
      where: { sessionId },
    });

    const existingMap = new Map(
      existingRecords.map((record) => [record.studentId, record])
    );

    // Process each enrolled student
    for (const enrollment of enrolledStudents) {
      const studentId = enrollment.studentId;

      // Check if there's a specific record for this student
      const specificRecord = records?.find((r) => r.studentId === studentId);
      const status = specificRecord?.status || defaultStatus;
      const reason = specificRecord?.reason;

      const existing = existingMap.get(studentId);

      if (existing) {
        await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            status,
            reason: this.shouldStoreReason(status) ? reason : null,
            recordedBy,
            recordedAt: new Date(),
          },
        });
        results.updated++;
      } else {
        await this.prisma.attendanceRecord.create({
          data: {
            studentId,
            sessionId,
            status,
            reason: this.shouldStoreReason(status) ? reason : null,
            recordedBy,
            recordedAt: new Date(),
          },
        });
        results.marked++;
      }

      // Track absent/late students
      if (status === AttendanceStatus.absent || status === AttendanceStatus.late) {
        results.absentStudents.push(studentId);
      }
    }

    // Update session status
    if (session.status === SessionStatus.scheduled) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.completed },
      });
    }

    if (results.absentStudents.length > 0) {
      await this.notifyParentsOfAbsence(results.absentStudents, sessionId);
    }

    logger.info('Session attendance marked', {
      sessionId,
      totalStudents: enrolledStudents.length,
      marked: results.marked,
      updated: results.updated,
    });

    return results;
  }

  /**
   * Get session detail for attendance UI
   */
  async getSessionDetail(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: { select: { id: true, name: true, centerId: true } },
        teacher: { select: { id: true, email: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session');
    }

    return {
      id: session.id,
      classId: session.classId,
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      class: session.class,
      teacher: session.teacher,
    };
  }

  /**
   * Update an attendance record
   */
  async updateAttendance(
    id: string,
    data: UpdateAttendanceDTO
  ): Promise<AttendanceRecordResponse> {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Attendance record');
    }

    const updated = await this.prisma.attendanceRecord.update({
      where: { id },
      data: {
        status: data.status,
        reason: data.status && this.shouldStoreReason(data.status) ? data.reason : null,
      },
      include: {
        student: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        session: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
      },
    });

    logger.info('Attendance record updated', { attendanceId: id });

    return this.formatAttendanceRecord(updated);
  }

  /**
   * Approve an excused absence
   */
  async approveAbsence(
    id: string,
    data: ApproveAbsenceDTO
  ): Promise<AttendanceRecordResponse> {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Attendance record');
    }

    if (record.status !== AttendanceStatus.absent) {
      throw new BadRequestException('Only absent records can be approved as excused');
    }

    const updated = await this.prisma.attendanceRecord.update({
      where: { id },
      data: {
        status: AttendanceStatus.excused,
        approvedBy: data.approvedBy,
        approvedAt: new Date(),
        reason: data.reason || record.reason,
      },
      include: {
        student: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        session: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
      },
    });

    logger.info('Absence approved', { attendanceId: id, approvedBy: data.approvedBy });

    return this.formatAttendanceRecord(updated);
  }

  /**
   * Get attendance records with filters
   */
  async getAttendance(filters: AttendanceFilters): Promise<PaginatedAttendanceResult> {
    const {
      centerId,
      classId,
      sessionId,
      studentId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    // Build where clause
    const where: any = {};

    if (centerId) {
      where.session = { class: { centerId } };
    }

    if (classId) {
      where.session = { ...where.session, classId };
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate) {
      where.session = {
        ...where.session,
        sessionDate: { ...where.session?.sessionDate, gte: new Date(startDate) },
      };
    }

    if (endDate) {
      where.session = {
        ...where.session,
        sessionDate: { ...where.session?.sessionDate, lte: new Date(endDate) },
      };
    }

    // Get total count
    const total = await this.prisma.attendanceRecord.count({ where });

    // Get records
    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        student: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        session: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
        recordedByUser: {
          select: { id: true, email: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { recordedAt: 'desc' },
    });

    const data = records.map((r) => this.formatAttendanceRecord(r));

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
   * Get attendance for a specific student
   */
  async getStudentAttendance(
    studentId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedAttendanceResult> {
    const { startDate, endDate, page = 1, limit = 20 } = filters;

    // Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student');
    }

    const where: any = { studentId };

    if (startDate) {
      where.session = { sessionDate: { gte: new Date(startDate) } };
    }

    if (endDate) {
      where.session = {
        ...where.session,
        sessionDate: { ...where.session?.sessionDate, lte: new Date(endDate) },
      };
    }

    const total = await this.prisma.attendanceRecord.count({ where });

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        student: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        session: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { recordedAt: 'desc' },
    });

    const data = records.map((r) => this.formatAttendanceRecord(r));

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
   * Get attendance for a specific class
   */
  async getClassAttendance(
    classId: string,
    filters: {
      sessionId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedAttendanceResult> {
    const { sessionId, startDate, endDate, page = 1, limit = 20 } = filters;

    // Verify class exists
    const classRecord = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const where: any = { session: { classId } };

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (startDate) {
      where.session = {
        ...where.session,
        sessionDate: { ...where.session?.sessionDate, gte: new Date(startDate) },
      };
    }

    if (endDate) {
      where.session = {
        ...where.session,
        sessionDate: { ...where.session?.sessionDate, lte: new Date(endDate) },
      };
    }

    const total = await this.prisma.attendanceRecord.count({ where });

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        student: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        session: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { recordedAt: 'desc' },
    });

    const data = records.map((r) => this.formatAttendanceRecord(r));

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
   * Get attendance statistics for a student
   */
  async getStudentStats(
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<StudentAttendanceStats> {
    // Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student');
    }

    const where: any = { studentId };

    if (startDate || endDate) {
      where.session = {};
      if (startDate) {
        where.session.sessionDate = { gte: new Date(startDate) };
      }
      if (endDate) {
        where.session.sessionDate = {
          ...where.session.sessionDate,
          lte: new Date(endDate),
        };
      }
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      select: { status: true },
    });

    const totalSessions = records.length;

    if (totalSessions === 0) {
      return {
        studentId,
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        presentRate: 0,
        absenceRate: 0,
        lateRate: 0,
        excusedRate: 0,
      };
    }

    const presentCount = records.filter((r) => r.status === AttendanceStatus.present).length;
    const absentCount = records.filter((r) => r.status === AttendanceStatus.absent).length;
    const lateCount = records.filter((r) => r.status === AttendanceStatus.late).length;
    const excusedCount = records.filter((r) => r.status === AttendanceStatus.excused).length;

    return {
      studentId,
      totalSessions,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      presentRate: Math.round((presentCount / totalSessions) * 100 * 100) / 100,
      absenceRate: Math.round((absentCount / totalSessions) * 100 * 100) / 100,
      lateRate: Math.round((lateCount / totalSessions) * 100 * 100) / 100,
      excusedRate: Math.round((excusedCount / totalSessions) * 100 * 100) / 100,
    };
  }

  /**
   * Get attendance statistics for a class
   */
  async getClassStats(
    classId: string,
    sessionId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ClassAttendanceStats> {
    // Verify class exists
    const classRecord = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    // Get active enrollments count
    const activeEnrollments = await this.prisma.enrollment.count({
      where: { classId, status: EnrollmentStatus.active },
    });

    const where: any = { session: { classId } };

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (startDate || endDate) {
      if (startDate) {
        where.session.sessionDate = { gte: new Date(startDate) };
      }
      if (endDate) {
        where.session.sessionDate = {
          ...where.session.sessionDate,
          lte: new Date(endDate),
        };
      }
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      select: { status: true },
    });

    const totalStudents = activeEnrollments;

    if (records.length === 0) {
      return {
        classId,
        sessionId,
        totalStudents,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        presentRate: 0,
        absenceRate: 0,
        lateRate: 0,
        excusedRate: 0,
      };
    }

    const presentCount = records.filter((r) => r.status === AttendanceStatus.present).length;
    const absentCount = records.filter((r) => r.status === AttendanceStatus.absent).length;
    const lateCount = records.filter((r) => r.status === AttendanceStatus.late).length;
    const excusedCount = records.filter((r) => r.status === AttendanceStatus.excused).length;

    return {
      classId,
      sessionId,
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      presentRate: Math.round((presentCount / records.length) * 100 * 100) / 100,
      absenceRate: Math.round((absentCount / records.length) * 100 * 100) / 100,
      lateRate: Math.round((lateCount / records.length) * 100 * 100) / 100,
      excusedRate: Math.round((excusedCount / records.length) * 100 * 100) / 100,
    };
  }

  /**
   * Get session with enrolled students for attendance marking
   */
  async getSessionWithEnrollments(sessionId: string): Promise<StudentAttendanceStatus[]> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          include: {
            enrollments: {
              where: { status: EnrollmentStatus.active },
              include: {
                student: {
                  select: { id: true, fullName: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session');
    }

    // Get existing attendance records for this session
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: { sessionId },
    });

    const attendanceMap = new Map(
      attendanceRecords.map((record) => [record.studentId, record])
    );

    // Combine enrollments with attendance status
    const result: StudentAttendanceStatus[] = session.class.enrollments.map((enrollment) => {
      const attendance = attendanceMap.get(enrollment.studentId);

      return {
        studentId: enrollment.studentId,
        enrollmentId: enrollment.id,
        studentName: enrollment.student.fullName,
        avatarUrl: enrollment.student.avatarUrl,
        attendanceId: attendance?.id || null,
        status: attendance?.status || null,
        reason: attendance?.reason || null,
        isRecorded: !!attendance,
      };
    });

    return result;
  }

  /**
   * Get all absence reasons for a center
   */
  async getAbsenceReasons(centerId?: string): Promise<AbsenceReasonResponse[]> {
    const reasons = await this.prisma.absenceReason.findMany({
      where: {
        OR: [
          { isSystem: true },
          { centerId: centerId || null },
        ],
        isActive: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return reasons.map((reason) => ({
      id: reason.id,
      name: reason.name,
      description: reason.description,
      displayOrder: reason.displayOrder,
      isSystem: reason.isSystem,
      isActive: reason.isActive,
      createdAt: reason.createdAt,
    }));
  }

  /**
   * Create a custom absence reason
   */
  async createAbsenceReason(
    centerId: string,
    data: AbsenceReasonDTO
  ): Promise<AbsenceReasonResponse> {
    const reason = await this.prisma.absenceReason.create({
      data: {
        name: data.name,
        description: data.description,
        displayOrder: data.displayOrder || 0,
        centerId,
        isSystem: false,
        isActive: true,
      },
    });

    logger.info('Absence reason created', { reasonId: reason.id, centerId });

    return {
      id: reason.id,
      name: reason.name,
      description: reason.description,
      displayOrder: reason.displayOrder,
      isSystem: reason.isSystem,
      isActive: reason.isActive,
      createdAt: reason.createdAt,
    };
  }

  /**
   * Update an absence reason
   */
  async updateAbsenceReason(
    id: string,
    data: Partial<AbsenceReasonDTO>
  ): Promise<AbsenceReasonResponse> {
    const reason = await this.prisma.absenceReason.findUnique({
      where: { id },
    });

    if (!reason) {
      throw new NotFoundException('Absence reason');
    }

    if (reason.isSystem) {
      throw new BadRequestException('Cannot modify system-defined reasons');
    }

    const updated = await this.prisma.absenceReason.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        displayOrder: data.displayOrder,
        isActive: data.isActive,
      },
    });

    logger.info('Absence reason updated', { reasonId: id });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      displayOrder: updated.displayOrder,
      isSystem: updated.isSystem,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Delete (deactivate) an absence reason
   */
  async deleteAbsenceReason(id: string): Promise<void> {
    const reason = await this.prisma.absenceReason.findUnique({
      where: { id },
    });

    if (!reason) {
      throw new NotFoundException('Absence reason');
    }

    if (reason.isSystem) {
      throw new BadRequestException('Cannot delete system-defined reasons');
    }

    await this.prisma.absenceReason.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Absence reason deactivated', { reasonId: id });
  }

  private shouldStoreReason(status: AttendanceStatus): boolean {
    return (
      status === AttendanceStatus.absent ||
      status === AttendanceStatus.late ||
      status === AttendanceStatus.excused
    );
  }

  /**
   * Prepare month: generate sessions from class schedule
   */
  async prepareMonthlySessions(
    classId: string,
    year: number,
    month: number
  ): Promise<{ generated: number }> {
    const start = startOfMonth(new Date(year, month - 1, 1));
    const end = endOfMonth(start);
    const result = await scheduleService.generateSessions(classId, start, end);
    return { generated: result.generated };
  }

  /**
   * Monthly attendance grid (students × session dates)
   */
  async getMonthlyGrid(
    classId: string,
    year: number,
    month: number
  ): Promise<MonthlyAttendanceGrid> {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          where: { status: EnrollmentStatus.active },
          include: {
            student: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const start = startOfMonth(new Date(year, month - 1, 1));
    const end = endOfMonth(start);

    const sessions = await this.prisma.session.findMany({
      where: { classId, sessionDate: { gte: start, lte: end } },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
    });

    const records = await this.prisma.attendanceRecord.findMany({
      where: { sessionId: { in: sessions.map((s) => s.id) } },
    });

    const cells: MonthlyAttendanceGrid['cells'] = {};
    for (const record of records) {
      const key = `${record.studentId}:${record.sessionId}`;
      cells[key] = {
        studentId: record.studentId,
        sessionId: record.sessionId,
        status: record.status,
        reason: record.reason,
        attendanceId: record.id,
      };
    }

    return {
      classId,
      className: classRecord.name,
      year,
      month,
      sessions: sessions.map((s) => ({
        id: s.id,
        sessionDate: s.sessionDate.toISOString().split('T')[0],
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      students: classRecord.enrollments.map((e) => ({
        id: e.student.id,
        fullName: e.student.fullName,
        avatarUrl: e.student.avatarUrl,
      })),
      cells,
    };
  }

  /**
   * Bulk save monthly grid changes
   */
  async bulkMonthlyMark(
    data: MonthlyBulkAttendanceDTO,
    recordedBy: string
  ): Promise<MarkAttendanceResult> {
    const results = { marked: 0, updated: 0, absentStudents: [] as string[] };

    for (const record of data.records) {
      const existing = await this.prisma.attendanceRecord.findUnique({
        where: {
          studentId_sessionId: {
            studentId: record.studentId,
            sessionId: record.sessionId,
          },
        },
      });

      if (existing) {
        await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            status: record.status,
            reason: this.shouldStoreReason(record.status) ? record.reason : null,
            recordedBy,
            recordedAt: new Date(),
          },
        });
        results.updated++;
      } else {
        await this.prisma.attendanceRecord.create({
          data: {
            studentId: record.studentId,
            sessionId: record.sessionId,
            status: record.status,
            reason: this.shouldStoreReason(record.status) ? record.reason : null,
            recordedBy,
            recordedAt: new Date(),
          },
        });
        results.marked++;
      }

      if (
        record.status === AttendanceStatus.absent ||
        record.status === AttendanceStatus.late
      ) {
        results.absentStudents.push(record.studentId);
      }
    }

    if (results.absentStudents.length > 0) {
      await this.notifyParentsOfAbsence(
        [...new Set(results.absentStudents)],
        data.records[0]?.sessionId
      );
    }

    return results;
  }

  /**
   * Sync offline-queued attendance records
   */
  async syncOfflineRecords(
    records: MarkAttendanceDTO[],
    recordedBy: string
  ): Promise<{ synced: number; failed: number; errors: string[] }> {
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        await this.markAttendance(record, recordedBy);
        synced++;
      } catch (error: any) {
        failed++;
        errors.push(error?.message || 'Unknown error');
      }
    }

    return { synced, failed, errors };
  }

  /**
   * Notify parents when student is absent (in-app notification)
   */
  private async notifyParentsOfAbsence(
    studentIds: string[],
    sessionId?: string
  ): Promise<void> {
    const session = sessionId
      ? await this.prisma.session.findUnique({
          where: { id: sessionId },
          include: { class: { select: { name: true } } },
        })
      : null;

    for (const studentId of studentIds) {
      const parents = await this.prisma.parent.findMany({
        where: { studentId, userId: { not: null } },
        select: { userId: true, fullName: true },
      });

      for (const parent of parents) {
        if (!parent.userId) continue;

        await this.prisma.notification.create({
          data: {
            userId: parent.userId,
            type: 'attendance_absent',
            title: 'Thông báo vắng học',
            message: session
              ? `Học sinh vắng buổi học lớp ${session.class.name} ngày ${session.sessionDate.toLocaleDateString('vi-VN')}`
              : 'Học sinh được ghi nhận vắng mặt',
            data: { studentId, sessionId: session?.id },
          },
        });
      }

      logger.info('Parent absence notification queued', { studentId, sessionId });
    }
  }

  /**
   * Format attendance record for response
   */
  private formatAttendanceRecord(record: any): AttendanceRecordResponse {
    return {
      id: record.id,
      studentId: record.studentId,
      sessionId: record.sessionId,
      status: record.status,
      reason: record.reason,
      recordedBy: record.recordedBy,
      recordedAt: record.recordedAt,
      approvedBy: record.approvedBy,
      approvedAt: record.approvedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      student: record.student
        ? {
            id: record.student.id,
            fullName: record.student.fullName,
            avatarUrl: record.student.avatarUrl,
          }
        : undefined,
      session: record.session
        ? {
            id: record.session.id,
            sessionDate: record.session.sessionDate,
            startTime: record.session.startTime,
            endTime: record.session.endTime,
            classId: record.session.classId,
            class: record.session.class
              ? {
                  id: record.session.class.id,
                  name: record.session.class.name,
                }
              : undefined,
          }
        : undefined,
    };
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;