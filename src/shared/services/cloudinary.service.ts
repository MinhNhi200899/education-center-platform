import { v2 as cloudinary } from 'cloudinary';
import { BadRequestException } from '../types/error.types';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx']);
const MAX_BYTES = 10 * 1024 * 1024;

function isConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

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

export interface UploadedDocument {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  publicId: string;
}

export async function uploadHomeworkDocument(
  buffer: Buffer,
  originalName: string
): Promise<UploadedDocument> {
  if (!isConfigured()) {
    throw new BadRequestException(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      'CLOUDINARY_NOT_CONFIGURED'
    );
  }

  if (buffer.length > MAX_BYTES) {
    throw new BadRequestException('File must be 10MB or smaller', 'FILE_TOO_LARGE');
  }

  const ext = getExtension(originalName);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new BadRequestException(
      'Only PDF, Word (.doc/.docx), and Excel (.xls/.xlsx) files are allowed',
      'INVALID_FILE_TYPE'
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const baseName = originalName.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_').slice(0, 80);

  const result = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'homework',
        public_id: `${baseName}_${Date.now()}`,
        format: ext,
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
    publicId: result.public_id,
  };
}

export function getViewerUrl(fileUrl: string, fileType: string): string {
  if (fileType === 'application/pdf') {
    return fileUrl;
  }
  return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
}
