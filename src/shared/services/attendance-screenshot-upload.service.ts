import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import { BadRequestException } from '../types/error.types';

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const MAX_BYTES = 10 * 1024 * 1024;
const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'attendance-screenshots');

export interface AttendanceScreenshotFile {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function inferMimeType(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function validateImage(buffer: Buffer, originalName: string): string {
  if (buffer.length > MAX_BYTES) {
    throw new BadRequestException('Screenshot must be 10MB or smaller', 'FILE_TOO_LARGE');
  }
  const ext = getExtension(originalName);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new BadRequestException(
      'Only PNG, JPG, WEBP, or GIF images are allowed',
      'INVALID_FILE_TYPE'
    );
  }
  return ext;
}

async function uploadToCloudinary(
  buffer: Buffer,
  originalName: string
): Promise<AttendanceScreenshotFile> {
  const ext = validateImage(buffer, originalName);

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const baseName = originalName.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_').slice(0, 80);

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'attendance-screenshots',
        public_id: `${baseName}_${Date.now()}`,
        format: ext === 'jpg' ? 'jpg' : ext,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) reject(error ?? new Error('Upload failed'));
        else resolve(uploadResult);
      }
    );
    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    fileName: originalName,
    fileType: inferMimeType(ext),
    fileSize: buffer.length,
  };
}

function uploadLocally(
  buffer: Buffer,
  originalName: string,
  baseUrl: string
): AttendanceScreenshotFile {
  const ext = validateImage(buffer, originalName);
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const storedName = `${uuidv4()}-${originalName.replace(/[^\w.\-() ]+/g, '_')}`;
  fs.writeFileSync(path.join(STORAGE_DIR, storedName), buffer);

  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/uploads/attendance-screenshot/files/${encodeURIComponent(storedName)}`;

  return {
    url,
    fileName: originalName,
    fileType: inferMimeType(ext),
    fileSize: buffer.length,
  };
}

export function getLocalAttendanceScreenshotPath(storedName: string): string | null {
  const resolved = path.resolve(STORAGE_DIR, storedName);
  if (!resolved.startsWith(STORAGE_DIR + path.sep)) return null;
  return resolved;
}

export async function uploadAttendanceScreenshot(
  buffer: Buffer,
  originalName: string,
  _baseUrl: string
): Promise<AttendanceScreenshotFile> {
  if (!isCloudinaryConfigured()) {
    throw new BadRequestException(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      'CLOUDINARY_NOT_CONFIGURED'
    );
  }

  return uploadToCloudinary(buffer, originalName);
}
