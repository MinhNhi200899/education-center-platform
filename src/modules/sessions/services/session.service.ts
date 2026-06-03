import { SessionStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import { NotFoundException, ValidationException } from '../../../shared/types/error.types';

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? '';

export interface UpdateSessionDTO {
  notes?: string;
  status?: SessionStatus;
}

export interface AddSessionMaterialDTO {
  driveUrl: string;
  fileName: string;
}

export class SessionService {
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
      class: session.class,
      teacher: session.teacher
        ? {
            id: session.teacher.id,
            fullName: session.teacher.teacher?.fullName ?? session.teacher.email,
            email: session.teacher.email,
            teacherProfileId: session.teacher.teacher?.id,
          }
        : undefined,
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

  async update(sessionId: string, data: UpdateSessionDTO) {
    const existing = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!existing) {
      throw new NotFoundException('Session');
    }

    if (data.status && !Object.values(SessionStatus).includes(data.status)) {
      throw new ValidationException('Invalid session status');
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
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

    return {
      id: updated.id,
      classId: updated.classId,
      teacherId: updated.teacherId,
      sessionDate: updated.sessionDate.toISOString().split('T')[0],
      startTime: updated.startTime,
      endTime: updated.endTime,
      classroom: updated.classroom,
      sessionType: updated.sessionType,
      status: updated.status,
      notes: updated.notes,
      class: updated.class,
      teacher: updated.teacher
        ? {
            id: updated.teacher.id,
            fullName: updated.teacher.teacher?.fullName ?? updated.teacher.email,
          }
        : undefined,
    };
  }

  /**
   * Stub Google Drive integration: stores drive URL on SessionMaterial.
   */
  async addMaterial(sessionId: string, uploadedBy: string, data: AddSessionMaterialDTO) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session');
    }

    if (!data.driveUrl?.trim()) {
      throw new ValidationException('driveUrl is required');
    }

    const material = await prisma.sessionMaterial.create({
      data: {
        sessionId,
        fileUrl: data.driveUrl.trim(),
        fileName: data.fileName?.trim() || 'Google Drive file',
        fileType: 'google_drive',
        fileSize: 0,
        uploadedBy,
      },
    });

    logger.info('Session material linked (Google Drive stub)', {
      sessionId,
      materialId: material.id,
      folderId: GOOGLE_DRIVE_FOLDER_ID || 'not_configured',
    });

    return {
      id: material.id,
      fileUrl: material.fileUrl,
      fileName: material.fileName,
      fileType: material.fileType,
      driveFileId: this.extractDriveFileId(data.driveUrl),
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
