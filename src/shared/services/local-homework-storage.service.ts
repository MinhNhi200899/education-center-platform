import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '../types/error.types';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx']);
const MAX_BYTES = 50 * 1024 * 1024;
const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'homework');

export interface LocalUploadedFile {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  driveFileId: string;
}

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function isLocalHomeworkStorageId(fileId: string): boolean {
  return fileId.startsWith('local:');
}

export function getLocalHomeworkPath(fileId: string): string | null {
  if (!isLocalHomeworkStorageId(fileId)) return null;
  const name = fileId.slice('local:'.length);
  const resolved = path.resolve(STORAGE_DIR, name);
  if (!resolved.startsWith(STORAGE_DIR + path.sep)) return null;
  return resolved;
}

export async function uploadHomeworkLocally(
  buffer: Buffer,
  originalName: string,
  baseUrl: string
): Promise<LocalUploadedFile> {
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

  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const storedName = `${uuidv4()}-${originalName.replace(/[^\w.\-() ]+/g, '_')}`;
  const filePath = path.join(STORAGE_DIR, storedName);
  fs.writeFileSync(filePath, buffer);

  const fileId = `local:${storedName}`;
  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/uploads/homework/files/${encodeURIComponent(storedName)}`;

  return {
    url,
    fileName: originalName,
    fileType: 'local',
    fileSize: buffer.length,
    driveFileId: fileId,
  };
}

export async function deleteLocalHomeworkFile(fileId: string): Promise<void> {
  const filePath = getLocalHomeworkPath(fileId);
  if (!filePath || !fs.existsSync(filePath)) return;
  fs.unlinkSync(filePath);
}
