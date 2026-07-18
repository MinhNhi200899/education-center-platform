import { v2 as cloudinary } from 'cloudinary';
import { BadRequestException } from '../types/error.types';

const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MAX_BYTES = 50 * 1024 * 1024;

export type HomeworkUploadKind = 'material' | 'submission';

function isConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function isCloudinaryConfigured(): boolean {
  return isConfigured();
}

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function allowedExtensions(kind: HomeworkUploadKind): Set<string> {
  if (kind === 'submission') {
    return new Set([...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS]);
  }
  return DOCUMENT_EXTENSIONS;
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
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

function isImageExt(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext);
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
  originalName: string,
  kind: HomeworkUploadKind = 'material'
): Promise<UploadedDocument> {
  if (!isConfigured()) {
    throw new BadRequestException(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      'CLOUDINARY_NOT_CONFIGURED'
    );
  }

  if (buffer.length > MAX_BYTES) {
    throw new BadRequestException('File must be 50MB or smaller', 'FILE_TOO_LARGE');
  }

  const ext = getExtension(originalName);
  if (!allowedExtensions(kind).has(ext)) {
    throw new BadRequestException(
      kind === 'submission'
        ? 'Only PDF, Word (.doc/.docx), Excel, and images (jpg/png/webp/gif) are allowed'
        : 'Only PDF, Word (.doc/.docx), and Excel (.xls/.xlsx) files are allowed',
      'INVALID_FILE_TYPE'
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const baseName = originalName.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_').slice(0, 80);
  const asImage = isImageExt(ext);

  const result = await new Promise<{ secure_url: string; public_id?: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        // Word/PDF/Excel = raw; images = image (optimized delivery)
        resource_type: asImage ? 'image' : 'raw',
        folder: kind === 'submission' ? 'homework-submissions' : 'homework',
        public_id: `${baseName}_${Date.now()}`,
        ...(asImage ? {} : { format: ext }),
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
    publicId: result.public_id ?? '',
  };
}

export function getViewerUrl(fileUrl: string, fileType: string): string {
  if (fileType === 'application/pdf' || fileType.startsWith('image/')) {
    return fileUrl;
  }
  return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
}
