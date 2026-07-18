import { Readable } from 'stream';
import { google, drive_v3 } from 'googleapis';
import { BadRequestException } from '../types/error.types';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx']);
const MAX_BYTES = 50 * 1024 * 1024;

export interface DriveUploadedFile {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  driveFileId: string;
}

type DriveAuthMode = 'oauth' | 'service_account';

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function inferMimeType(ext: string): string {
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}

function usesOAuth(): boolean {
  return Boolean(process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim());
}

function usesSharedDrive(): boolean {
  return process.env.GOOGLE_DRIVE_USE_SHARED_DRIVE === 'true';
}

export function getDriveAuthMode(): DriveAuthMode {
  return usesOAuth() ? 'oauth' : 'service_account';
}

export function isGoogleDriveConfigured(): boolean {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId || folderId.includes('xxxx')) {
    return false;
  }

  if (usesOAuth()) {
    return Boolean(
      process.env.GOOGLE_DRIVE_CLIENT_ID?.trim() &&
        process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim() &&
        process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim()
    );
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim().startsWith('{')) {
    return true;
  }

  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const keyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || 'secrets/google-service-account.json';
  const resolved = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
  return fs.existsSync(resolved);
}

function loadServiceAccountCredentials(): Record<string, string> {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json && json.startsWith('{')) {
    return JSON.parse(json) as Record<string, string>;
  }

  const keyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || 'secrets/google-service-account.json';

  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const resolved = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);

  if (!fs.existsSync(resolved)) {
    throw new BadRequestException(
      `Google service account key not found at ${resolved}. Download JSON from GCP → Credentials → Service account.`,
      'DRIVE_NOT_CONFIGURED'
    );
  }

  return JSON.parse(fs.readFileSync(resolved, 'utf8')) as Record<string, string>;
}

function getDriveClient(): { drive: drive_v3.Drive; folderId: string; sharedDrive: boolean } {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId || folderId.includes('xxxx')) {
    throw new BadRequestException(
      'GOOGLE_DRIVE_FOLDER_ID is not configured. Create a Drive folder and paste its ID.',
      'DRIVE_NOT_CONFIGURED'
    );
  }

  if (usesOAuth()) {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();
    if (!clientId || !clientSecret || !refreshToken) {
      throw new BadRequestException(
        'OAuth Drive auth requires GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN.',
        'DRIVE_NOT_CONFIGURED'
      );
    }

    const oauth2 = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3333/oauth2callback'
    );
    oauth2.setCredentials({ refresh_token: refreshToken });

    return { drive: google.drive({ version: 'v3', auth: oauth2 }), folderId, sharedDrive: false };
  }

  if (!usesSharedDrive()) {
    throw new BadRequestException(
      'Service accounts cannot upload to personal Drive folders. Either: (1) set GOOGLE_DRIVE_USE_SHARED_DRIVE=true with a folder inside a Google Workspace Shared Drive, or (2) run npm run setup:google-drive-oauth and add the refresh token to .env.',
      'DRIVE_SA_NO_QUOTA'
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: loadServiceAccountCredentials(),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return {
    drive: google.drive({ version: 'v3', auth }),
    folderId,
    sharedDrive: true,
  };
}

function driveOptions(sharedDrive: boolean): {
  supportsAllDrives?: boolean;
  includeItemsFromAllDrives?: boolean;
} {
  return sharedDrive ? { supportsAllDrives: true, includeItemsFromAllDrives: true } : {};
}

export function extractDriveFileId(url: string): string | null {
  const match =
    url.match(/\/file\/d\/([^/]+)/) ||
    url.match(/[?&]id=([^&]+)/) ||
    url.match(/\/folders\/([^/?]+)/);
  return match?.[1] ?? null;
}

export async function uploadHomeworkToDrive(
  buffer: Buffer,
  originalName: string
): Promise<DriveUploadedFile> {
  if (!isGoogleDriveConfigured()) {
    throw new BadRequestException(
      'Google Drive is not configured. Set GOOGLE_DRIVE_FOLDER_ID and auth credentials.',
      'DRIVE_NOT_CONFIGURED'
    );
  }

  if (buffer.length > MAX_BYTES) {
    throw new BadRequestException('File must be 50MB or smaller', 'FILE_TOO_LARGE');
  }

  const ext = getExtension(originalName);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new BadRequestException(
      'Only PDF, Word (.doc/.docx), and Excel (.xls/.xlsx) files are allowed',
      'INVALID_FILE_TYPE'
    );
  }

  const { drive, folderId, sharedDrive } = getDriveClient();
  const mimeType = inferMimeType(ext);
  const opts = driveOptions(sharedDrive);

  let created;
  try {
    created = await drive.files.create({
      ...opts,
      requestBody: {
        name: originalName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: 'id, webViewLink',
    });
  } catch (error: unknown) {
    const gaxios = error as {
      message?: string;
      response?: { data?: { error?: { message?: string } } };
    };
    const detail =
      gaxios.response?.data?.error?.message || gaxios.message || 'Upload failed';
    throw new BadRequestException(
      `Google Drive upload failed: ${detail}`,
      'DRIVE_UPLOAD_FAILED'
    );
  }

  const fileId = created.data.id;
  if (!fileId) {
    throw new BadRequestException('Google Drive upload failed', 'DRIVE_UPLOAD_FAILED');
  }

  try {
    await drive.permissions.create({
      ...opts,
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (error: unknown) {
    const gaxios = error as {
      message?: string;
      response?: { data?: { error?: { message?: string } } };
    };
    const detail =
      gaxios.response?.data?.error?.message || gaxios.message || 'Permission failed';
    throw new BadRequestException(
      `Google Drive permission failed: ${detail}`,
      'DRIVE_UPLOAD_FAILED'
    );
  }

  const url = created.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`;

  return {
    url,
    fileName: originalName,
    fileType: 'google_drive',
    fileSize: buffer.length,
    driveFileId: fileId,
  };
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  if (!isGoogleDriveConfigured()) return;
  const { drive, sharedDrive } = getDriveClient();
  const opts = driveOptions(sharedDrive);
  try {
    await drive.files.delete({ ...opts, fileId });
  } catch (error: unknown) {
    const status = (error as { code?: number })?.code;
    if (status === 404) return;
    throw error;
  }
}
