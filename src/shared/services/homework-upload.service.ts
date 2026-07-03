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
import { BadRequestException } from '../types/error.types';

export type HomeworkUploadedFile = DriveUploadedFile | LocalUploadedFile;

export function isDriveUploadReady(): boolean {
  if (!isGoogleDriveConfigured()) return false;
  if (getDriveAuthMode() === 'oauth') return true;
  return process.env.GOOGLE_DRIVE_USE_SHARED_DRIVE === 'true';
}

export async function uploadHomeworkFile(
  buffer: Buffer,
  originalName: string,
  baseUrl: string
): Promise<HomeworkUploadedFile> {
  if (isDriveUploadReady()) {
    try {
      return await uploadHomeworkToDrive(buffer, originalName);
    } catch (error) {
      if (process.env.NODE_ENV !== 'development') {
        throw error;
      }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return uploadHomeworkLocally(buffer, originalName, baseUrl);
  }

  throw new BadRequestException(
    'Google Drive upload is not ready. Run npm run setup:google-drive-oauth (personal Gmail) or set GOOGLE_DRIVE_USE_SHARED_DRIVE=true (Workspace).',
    'DRIVE_NOT_CONFIGURED'
  );
}
