import {
  uploadHomeworkToDrive,
  isGoogleDriveConfigured,
  getDriveAuthMode,
  DriveUploadedFile,
} from './google-drive.service';
import {
  uploadHomeworkLocally,
  LocalUploadedFile,
} from './local-homework-storage.service';
import {
  uploadHomeworkDocument,
  isCloudinaryConfigured,
  type HomeworkUploadKind,
} from './cloudinary.service';
import { BadRequestException } from '../types/error.types';
import { logger } from './logger.service';

export type HomeworkUploadedFile = DriveUploadedFile | LocalUploadedFile;

export function isDriveUploadReady(): boolean {
  if (!isGoogleDriveConfigured()) return false;
  if (getDriveAuthMode() === 'oauth') return true;
  return process.env.GOOGLE_DRIVE_USE_SHARED_DRIVE === 'true';
}

function toCloudinaryResult(
  uploaded: Awaited<ReturnType<typeof uploadHomeworkDocument>>
): DriveUploadedFile {
  return {
    url: uploaded.url,
    fileName: uploaded.fileName,
    fileType: uploaded.fileType,
    fileSize: uploaded.fileSize,
    driveFileId: uploaded.publicId || uploaded.url,
  };
}

function toUploadError(error: unknown, provider: string): BadRequestException {
  if (error instanceof BadRequestException) return error;
  const gaxios = error as {
    message?: string;
    response?: { data?: { error?: { message?: string } } };
  };
  const detail =
    gaxios.response?.data?.error?.message || gaxios.message || 'Upload failed';
  return new BadRequestException(
    `${provider} upload failed: ${detail}`,
    provider === 'Google Drive' ? 'DRIVE_UPLOAD_FAILED' : 'UPLOAD_FAILED'
  );
}

export interface UploadHomeworkOptions {
  /** material = GV giao bài; submission = HS nộp bài (ưu tiên Cloudinary, cho phép ảnh) */
  kind?: HomeworkUploadKind;
}

/**
 * Upload homework file.
 * - material: Drive first, then Cloudinary, then local (dev)
 * - submission: Cloudinary first (recommended for Word raw + images), then Drive, then local (dev)
 */
export async function uploadHomeworkFile(
  buffer: Buffer,
  originalName: string,
  baseUrl: string,
  options: UploadHomeworkOptions = {}
): Promise<HomeworkUploadedFile> {
  const kind: HomeworkUploadKind = options.kind ?? 'material';

  if (!buffer.length) {
    throw new BadRequestException('Uploaded file is empty', 'EMPTY_FILE');
  }

  const tryCloudinary = async () => {
    if (!isCloudinaryConfigured()) return null;
    return toCloudinaryResult(await uploadHomeworkDocument(buffer, originalName, kind));
  };

  const tryDrive = async () => {
    if (!isDriveUploadReady()) return null;
    return uploadHomeworkToDrive(buffer, originalName);
  };

  if (kind === 'submission') {
    try {
      const cloudinary = await tryCloudinary();
      if (cloudinary) return cloudinary;
    } catch (error) {
      logger.error('Cloudinary submission upload failed', {
        error: error instanceof Error ? error.message : error,
        originalName,
      });
      try {
        const drive = await tryDrive();
        if (drive) return drive;
      } catch (driveError) {
        throw toUploadError(driveError, 'Google Drive');
      }
      throw toUploadError(error, 'Cloudinary');
    }

    try {
      const drive = await tryDrive();
      if (drive) return drive;
    } catch (error) {
      throw toUploadError(error, 'Google Drive');
    }
  } else {
    try {
      const drive = await tryDrive();
      if (drive) return drive;
    } catch (error) {
      logger.error('Google Drive homework upload failed', {
        error: error instanceof Error ? error.message : error,
        originalName,
      });
      try {
        const cloudinary = await tryCloudinary();
        if (cloudinary) return cloudinary;
      } catch (cloudinaryError) {
        throw toUploadError(cloudinaryError, 'Cloudinary');
      }
      throw toUploadError(error, 'Google Drive');
    }

    try {
      const cloudinary = await tryCloudinary();
      if (cloudinary) return cloudinary;
    } catch (error) {
      throw toUploadError(error, 'Cloudinary');
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return uploadHomeworkLocally(buffer, originalName, baseUrl);
  }

  throw new BadRequestException(
    'File storage is not configured. Set Cloudinary env vars (recommended for student submissions) or Google Drive OAuth credentials.',
    'STORAGE_NOT_CONFIGURED'
  );
}
