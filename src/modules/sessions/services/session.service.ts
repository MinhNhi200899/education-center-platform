import { SessionStatus, SessionType } from '@prisma/client';
import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import {
  NotFoundException,
  ValidationException,
  ConflictException,
  ForbiddenException,
} from '../../../shared/types/error.types';
import {
  assertSessionAllowsHomework,
  assertSessionAllowsReschedule,
} from '../../../shared/utils/session-timing';

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? '';
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface CreateSessionDTO {
  classId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  classroom?: string;
  sessionType?: SessionType;
  notes?: string;
}

export interface UpdateSessionDTO {
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  classroom?: string | null;
  notes?: string;
  status?: SessionStatus;
}

export interface AddSessionMaterialDTO {
  driveUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  driveFileId?: string;
}

export class SessionService {
  private parseDateOnly(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new ValidationException('Invalid session date');
    }
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    return new Date(Date.UTC(y, m - 1, d));
  }

  private assertValidTimeRange(startTime: string, endTime: string): void {
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      throw new ValidationException('Invalid time format (expected HH:MM)');
    }
    if (startTime >= endTime) {
      throw new ValidationException('Start time must be before end time');
    }
  }

  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && start2 < end1;
  }

  async checkSessionConflicts(params: {
    teacherUserId: string;
    sessionDate: Date;
    startTime: string;
    endTime: string;
    classroom?: string | null;
    excludeSessionId?: string;
  }): Promise<string[]> {
    const conflicts: string[] = [];
    const iso =
      params.sessionDate instanceof Date
        ? params.sessionDate.toISOString().split('T')[0]
        : String(params.sessionDate).slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) return ['Invalid session date'];
    const y = Number(match[1]);
    const mo = Number(match[2]);
    const d = Number(match[3]);
    const dateStart = new Date(Date.UTC(y, mo - 1, d));
    const dateEnd = new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));

    const sameDaySessions = await prisma.session.findMany({
      where: {
        sessionDate: { gte: dateStart, lte: dateEnd },
        ...(params.excludeSessionId ? { id: { not: params.excludeSessionId } } : {}),
        OR: [
          { teacherId: params.teacherUserId },
          ...(params.classroom
            ? [{ classroom: params.classroom }]
            : []),
        ],
      },
      include: { class: { select: { name: true } } },
    });

    for (const s of sameDaySessions) {
      if (!this.timesOverlap(params.startTime, params.endTime, s.startTime, s.endTime)) {
        continue;
      }
      const label = `${s.startTime}–${s.endTime} (${s.class.name})`;
      if (s.teacherId === params.teacherUserId) {
        conflicts.push(`Trùng lịch dạy: ${label}`);
      } else if (params.classroom && s.classroom === params.classroom) {
        conflicts.push(`Phòng ${params.classroom} đã có lịch: ${label}`);
      }
    }

    return [...new Set(conflicts)];
  }

  private async assertTeacherCanAccessClass(userId: string, classId: string): Promise<void> {
    const teacher = await prisma.teacher.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!teacher) return;

    const assigned = await prisma.classTeacher.findFirst({
      where: { teacherId: teacher.id, classId },
    });
    if (!assigned) {
      throw new ForbiddenException('You are not assigned to this class');
    }
  }

  private mapSession(session: {
    id: string;
    classId: string;
    teacherId: string;
    sessionDate: Date;
    startTime: string;
    endTime: string;
    classroom: string | null;
    sessionType: SessionType;
    status: SessionStatus;
    notes: string | null;
    class?: { id: string; name: string; centerId?: string } | null;
    teacher?: {
      id: string;
      email: string;
      teacher?: { id?: string; fullName: string } | null;
    } | null;
  }) {
    return {
      id: session.id,
      classId: session.classId,
      teacherId: session.teacherId,
      sessionDate: session.sessionDate.toISOString().split('T')[0],
      startTime: session.startTime,
      endTime: session.endTime,
      classroom: session.classroom,
      sessionType: session.sessionType,
      status: session.status,
      notes: session.notes,
      class: session.class ?? undefined,
      teacher: session.teacher
        ? {
            id: session.teacher.id,
            fullName: session.teacher.teacher?.fullName ?? session.teacher.email,
            email: session.teacher.email,
            teacherProfileId: session.teacher.teacher?.id,
          }
        : undefined,
    };
  }

  async getById(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: { select: { id: true, name: true, centerId: true } },
        teacher: {
          select: {
            id: true,
            email: true,
            teacher: { select: { id: true, fullName: true } },
          },
        },
        materials: { orderBy: { createdAt: 'desc' } },
        _count: { select: { attendanceRecords: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session');
    }

    return {
      ...this.mapSession(session),
      materials: session.materials.map((m) => ({
        id: m.id,
        fileUrl: m.fileUrl,
        fileName: m.fileName,
        fileType: m.fileType,
        fileSize: m.fileSize,
        createdAt: m.createdAt,
        isGoogleDrive: m.fileType === 'google_drive',
      })),
      attendanceCount: session._count.attendanceRecords,
      googleDriveFolderId: GOOGLE_DRIVE_FOLDER_ID || null,
    };
  }

  async create(userId: string, data: CreateSessionDTO) {
    this.assertValidTimeRange(data.startTime, data.endTime);
    const sessionDate = this.parseDateOnly(data.sessionDate);

    const classRecord = await prisma.class.findUnique({
      where: { id: data.classId },
      select: { id: true, name: true, centerId: true, classroom: true },
    });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    await this.assertTeacherCanAccessClass(userId, data.classId);

    const classroom = data.classroom?.trim() || classRecord.classroom;
    const conflicts = await this.checkSessionConflicts({
      teacherUserId: userId,
      sessionDate,
      startTime: data.startTime,
      endTime: data.endTime,
      classroom,
    });
    if (conflicts.length > 0) {
      throw new ConflictException(conflicts.join('; '), 'SCHEDULE_CONFLICT');
    }

    const created = await prisma.session.create({
      data: {
        classId: data.classId,
        teacherId: userId,
        sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
        classroom: classroom ?? null,
        sessionType: data.sessionType ?? SessionType.regular,
        status: SessionStatus.scheduled,
        notes: data.notes?.trim() || null,
      },
      include: {
        class: { select: { id: true, name: true } },
        teacher: {
          select: {
            id: true,
            email: true,
            teacher: { select: { fullName: true } },
          },
        },
      },
    });

    logger.info('Session created', { sessionId: created.id, classId: data.classId });
    return this.mapSession(created);
  }

  async update(sessionId: string, userId: string, data: UpdateSessionDTO) {
    const existing = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: { select: { id: true, name: true } },
        _count: { select: { attendanceRecords: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException('Session');
    }

    await this.assertTeacherCanAccessClass(userId, existing.classId);

    const isHomeworkUpdate =
      data.notes !== undefined &&
      data.notes !== (existing.notes ?? null) &&
      !data.sessionDate &&
      !data.startTime &&
      !data.endTime &&
      data.classroom === undefined &&
      !data.status;

    if (isHomeworkUpdate) {
      assertSessionAllowsHomework(existing);
    }

    if (data.status && !Object.values(SessionStatus).includes(data.status)) {
      throw new ValidationException('Invalid session status');
    }

    const sessionDate = data.sessionDate
      ? this.parseDateOnly(data.sessionDate)
      : existing.sessionDate;
    const startTime = data.startTime ?? existing.startTime;
    const endTime = data.endTime ?? existing.endTime;
    const classroom =
      data.classroom !== undefined ? data.classroom : existing.classroom;

    this.assertValidTimeRange(startTime, endTime);

    const isReschedule =
      (data.sessionDate !== undefined &&
        data.sessionDate !== existing.sessionDate.toISOString().split('T')[0]) ||
      (data.startTime !== undefined && data.startTime !== existing.startTime) ||
      (data.endTime !== undefined && data.endTime !== existing.endTime);

    if (isReschedule) {
      assertSessionAllowsReschedule(existing, existing._count.attendanceRecords);
    }

    const conflicts = await this.checkSessionConflicts({
      teacherUserId: existing.teacherId,
      sessionDate,
      startTime,
      endTime,
      classroom,
      excludeSessionId: sessionId,
    });
    if (conflicts.length > 0) {
      throw new ConflictException(conflicts.join('; '), 'SCHEDULE_CONFLICT');
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
        ...(data.sessionDate !== undefined ? { sessionDate } : {}),
        ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
        ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
        ...(data.classroom !== undefined ? { classroom: data.classroom } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: {
        class: { select: { id: true, name: true } },
        teacher: {
          select: {
            id: true,
            email: true,
            teacher: { select: { fullName: true } },
          },
        },
      },
    });

    logger.info('Session updated', { sessionId, status: data.status });
    return this.mapSession(updated);
  }

  async delete(sessionId: string, userId: string) {
    const existing = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { attendanceRecords: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Session');
    }

    await this.assertTeacherCanAccessClass(userId, existing.classId);

    if (existing._count.attendanceRecords > 0) {
      throw new ConflictException(
        'Cannot delete session with attendance records. Cancel the session instead.',
        'SESSION_HAS_ATTENDANCE'
      );
    }

    await prisma.session.delete({ where: { id: sessionId } });
    logger.info('Session deleted', { sessionId });
    return { id: sessionId, deleted: true };
  }

  async addMaterial(sessionId: string, uploadedBy: string, data: AddSessionMaterialDTO) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session');
    }

    assertSessionAllowsHomework(session);

    const fileUrl = (data.fileUrl ?? data.driveUrl)?.trim();
    if (!fileUrl) {
      throw new ValidationException('fileUrl is required');
    }

    const material = await prisma.sessionMaterial.create({
      data: {
        sessionId,
        fileUrl,
        fileName: data.fileName?.trim() || 'Attachment',
        fileType: data.fileType?.trim() || (data.driveUrl ? 'google_drive' : 'document'),
        fileSize: data.fileSize ?? 0,
        driveFileId:
          data.driveFileId?.trim() ||
          (data.driveUrl ? this.extractDriveFileId(data.driveUrl) : null) ||
          this.extractDriveFileId(fileUrl),
        uploadedBy,
      },
    });

    logger.info('Session material linked', {
      sessionId,
      materialId: material.id,
      fileType: material.fileType,
    });

    return {
      id: material.id,
      fileUrl: material.fileUrl,
      fileName: material.fileName,
      fileType: material.fileType,
      fileSize: material.fileSize,
      driveFileId: material.driveFileId,
      googleDriveFolderId: GOOGLE_DRIVE_FOLDER_ID || null,
      createdAt: material.createdAt,
    };
  }

  /**
   * List homework submissions for a session (enrolled students + submission/feedback state).
   */
  async listHomeworkSubmissions(sessionId: string, userId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: { select: { id: true, name: true } },
      },
    });
    if (!session) {
      throw new NotFoundException('Session');
    }

    await this.assertTeacherCanAccessClass(userId, session.classId);

    const enrollments = await prisma.enrollment.findMany({
      where: { classId: session.classId, status: 'active' },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { student: { fullName: 'asc' } },
    });

    const submissions = await prisma.homeworkSubmission.findMany({
      where: { sessionId },
    });
    const byStudent = new Map(submissions.map((s) => [s.studentId, s]));

    const items = enrollments.map((e) => {
      const sub = byStudent.get(e.studentId);
      return {
        studentId: e.student.id,
        studentName: e.student.fullName,
        submitted: Boolean(sub),
        submission: sub
          ? {
              id: sub.id,
              note: sub.note,
              fileUrl: sub.fileUrl,
              fileName: sub.fileName,
              fileType: sub.fileType,
              fileSize: sub.fileSize,
              submittedAt: sub.submittedAt,
              feedback: sub.feedback,
              feedbackAt: sub.feedbackAt,
            }
          : null,
      };
    });

    return {
      sessionId: session.id,
      classId: session.classId,
      className: session.class.name,
      sessionDate: session.sessionDate.toISOString().split('T')[0],
      startTime: session.startTime,
      endTime: session.endTime,
      submittedCount: items.filter((i) => i.submitted).length,
      totalStudents: items.length,
      items,
    };
  }

  /**
   * Teacher writes text feedback on a student's homework submission.
   */
  async setHomeworkFeedback(
    sessionId: string,
    studentId: string,
    userId: string,
    feedback: string
  ) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: { select: { id: true, name: true } },
      },
    });
    if (!session) {
      throw new NotFoundException('Session');
    }

    await this.assertTeacherCanAccessClass(userId, session.classId);

    const text = feedback.trim();
    if (!text) {
      throw new ValidationException('Feedback is required');
    }
    if (text.length > 2000) {
      throw new ValidationException('Feedback must not exceed 2000 characters');
    }

    const submission = await prisma.homeworkSubmission.findUnique({
      where: { sessionId_studentId: { sessionId, studentId } },
    });
    if (!submission) {
      throw new NotFoundException('Homework submission');
    }

    const updated = await prisma.homeworkSubmission.update({
      where: { id: submission.id },
      data: {
        feedback: text,
        feedbackAt: new Date(),
        feedbackBy: userId,
      },
      include: {
        student: { select: { id: true, fullName: true, userId: true } },
      },
    });

    if (updated.student.userId) {
      const dateStr = session.sessionDate.toISOString().split('T')[0];
      await prisma.notification.create({
        data: {
          userId: updated.student.userId,
          type: 'homework_feedback',
          title: 'Giáo viên nhận xét bài tập',
          message: `Có nhận xét mới cho buổi ${session.class.name} (${dateStr} ${session.startTime}).`,
          data: {
            sessionId,
            studentId,
            submissionId: updated.id,
          },
        },
      });
    }

    logger.info('Homework feedback saved', {
      sessionId,
      studentId,
      submissionId: updated.id,
      feedbackBy: userId,
    });

    return {
      id: updated.id,
      sessionId: updated.sessionId,
      studentId: updated.studentId,
      studentName: updated.student.fullName,
      note: updated.note,
      fileUrl: updated.fileUrl,
      fileName: updated.fileName,
      submittedAt: updated.submittedAt,
      feedback: updated.feedback,
      feedbackAt: updated.feedbackAt,
    };
  }

  private extractDriveFileId(url: string): string | null {
    const match =
      url.match(/\/file\/d\/([^/]+)/) ||
      url.match(/[?&]id=([^&]+)/) ||
      url.match(/\/folders\/([^/?]+)/);
    return match?.[1] ?? null;
  }
}

export const sessionService = new SessionService();
export default sessionService;
