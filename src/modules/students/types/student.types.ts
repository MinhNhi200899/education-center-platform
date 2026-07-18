// Student Module Types

import { StudentStatus, Gender } from '@prisma/client';

export interface CreateStudentDTO {
  centerId: string;
  fullName: string;
  dateOfBirth: Date | string;
  gender: Gender;
  phone?: string;
  email?: string;
  password?: string;
  /** When true, create roster-only student (no portal login / User account). */
  isOffline?: boolean;
  address?: string;
  avatarUrl?: string;
  enrollmentDate: Date | string;
  notes?: string;
}

export interface CreateStudentResult extends StudentResponse {
  loginEmail?: string;
  initialPassword?: string;
}

export interface UpdateStudentDTO {
  fullName?: string;
  phone?: string;
  email?: string;
  address?: string;
  avatarUrl?: string;
  notes?: string;
}

export interface StudentFilters {
  centerId?: string;
  status?: StudentStatus;
  gender?: Gender;
  search?: string;
  enrollmentDateFrom?: Date | string;
  enrollmentDateTo?: Date | string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface StudentResponse {
  id: string;
  fullName: string;
  dateOfBirth: Date;
  gender: Gender;
  phone: string | null;
  email: string | null;
  address: string | null;
  avatarUrl: string | null;
  enrollmentDate: Date;
  status: StudentStatus;
  notes: string | null;
  loginPassword?: string | null;
  /** False when student has no portal User (offline / roster-only). */
  hasPortalAccess?: boolean;
  centerId: string;
  createdAt: Date;
  updatedAt: Date;
  center?: {
    id: string;
    name: string;
    code: string;
  };
  parents?: ParentDTO[];
  currentEnrollment?: {
    id: string;
    class: {
      id: string;
      name: string;
    };
  };
}

export interface ParentDTO {
  fullName: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  phone: string;
  email?: string;
  occupation?: string;
  address?: string;
  isPrimary?: boolean;
}

export interface StudentExcelRow {
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  enrollmentDate: string;
  notes?: string;
}

export interface ImportResult {
  totalRows: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
  students: Array<{ id: string; fullName: string }>;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}