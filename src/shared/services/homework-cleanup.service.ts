import { prisma } from '../../config/database';
import { logger } from './logger.service';
import { deleteDriveFile, extractDriveFileId, isGoogleDriveConfigured } from './google-drive.service';
import {
  deleteLocalHomeworkFile,
  isLocalHomeworkStorageId,
} from './local-homework-storage.service';

const DEFAULT_RETENTION_DAYS = 30;

export function getHomeworkRetentionDays(): number {
  const parsed = parseInt(process.env.HOMEWORK_RETENTION_DAYS || String(DEFAULT_RETENTION_DAYS), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
}

export async function cleanupOldHomeworkMaterials(options?: {
  retentionDays?: number;
  batchSize?: number;
}): Promise<{ scanned: number; deleted: number; driveDeleted: number; errors: number }> {
  const retentionDays = options?.retentionDays ?? getHomeworkRetentionDays();
  const batchSize = options?.batchSize ?? 200;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const materials = await prisma.sessionMaterial.findMany({
    where: { createdAt: { lt: cutoff } },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  let deleted = 0;
  let driveDeleted = 0;
  let errors = 0;

  for (const material of materials) {
    const fileId = material.driveFileId ?? extractDriveFileId(material.fileUrl);

    if (fileId && isLocalHomeworkStorageId(fileId)) {
      try {
        await deleteLocalHomeworkFile(fileId);
        driveDeleted++;
      } catch (error) {
        errors++;
        logger.warn('Failed to delete local homework file during cleanup', {
          materialId: material.id,
          fileId,
          error,
        });
      }
    } else if (fileId && isGoogleDriveConfigured()) {
      try {
        await deleteDriveFile(fileId);
        driveDeleted++;
      } catch (error) {
        errors++;
        logger.warn('Failed to delete Google Drive file during cleanup', {
          materialId: material.id,
          fileId,
          error,
        });
      }
    }

    await prisma.sessionMaterial.delete({ where: { id: material.id } });
    deleted++;
  }

  logger.info('Homework cleanup completed', {
    retentionDays,
    cutoff: cutoff.toISOString(),
    scanned: materials.length,
    deleted,
    driveDeleted,
    errors,
  });

  return { scanned: materials.length, deleted, driveDeleted, errors };
}
