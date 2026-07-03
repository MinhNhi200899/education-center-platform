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
