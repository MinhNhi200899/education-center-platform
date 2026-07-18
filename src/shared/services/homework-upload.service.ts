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

export async function uploadHomeworkFile(
  buffer: Buffer,
  originalName: string,
  baseUrl: string
): Promise<HomeworkUploadedFile> {
  if (!buffer.length) {
    throw new BadRequestException('Uploaded file is empty', 'EMPTY_FILE');
  }

  if (isDriveUploadReady()) {
    try {
      return await uploadHomeworkToDrive(buffer, originalName);
    } catch (error) {
      logger.error('Google Drive homework upload failed', {
        error: error instanceof Error ? error.message : error,
        originalName,
      });

      if (isCloudinaryConfigured()) {
        logger.info('Falling back to Cloudinary for homework upload');
        try {
          return toCloudinaryResult(await uploadHomeworkDocument(buffer, originalName));
        } catch (cloudinaryError) {
          throw toUploadError(cloudinaryError, 'Cloudinary');
        }
      }

      throw toUploadError(error, 'Google Drive');
    }
  }

  if (isCloudinaryConfigured()) {
    try {
      return toCloudinaryResult(await uploadHomeworkDocument(buffer, originalName));
    } catch (error) {
      throw toUploadError(error, 'Cloudinary');
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return uploadHomeworkLocally(buffer, originalName, baseUrl);
  }

  throw new BadRequestException(
    'File storage is not configured. Set Google Drive OAuth credentials or Cloudinary env vars on the server.',
    'STORAGE_NOT_CONFIGURED'
  );
}
