// Teacher Types

import { TeacherStatus, Gender, TeacherRole } from '@prisma/client';

export interface CreateTeacherDTO {
  centerId: string;
  fullName: string;
  dateOfBirth: Date | string;
  gender: Gender;
  phone: string;
  email: string;
  address?: string;
  qualification?: string;
  specialization?: string;
  hireDate: Date | string;
  salary?: number;
  notes?: string;
}

export interface UpdateTeacherDTO {
  fullName?: string;
  phone?: string;
  email?: string;
  address?: string;
  qualification?: string;
  specialization?: string;
  salary?: number;
  notes?: string;
  avatarUrl?: string;
}

export interface TeacherFilters {
  centerId?: string;
  status?: TeacherStatus;
  gender?: Gender;
  search?: string;
  hireDateFrom?: Date | string;
  hireDateTo?: Date | string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface TeacherResponse {
  id: string;
  fullName: string;
  dateOfBirth: Date;
  gender: Gender;
  phone: string;
  email: string;
  address: string | null;
  qualification: string | null;
  specialization: string | null;
  hireDate: Date;
  salary: number | null;
  status: TeacherStatus;
  avatarUrl: string | null;
  notes: string | null;
  centerId: string;
  center?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherWithClasses extends TeacherResponse {
  classes: TeacherClassAssignment[];
}

export interface TeacherClassAssignment {
  id: string;
  class: {
    id: string;
    name: string;
    academicLevel: string;
    status: string;
  };
  role: TeacherRole;
  assignedAt: Date;
}

export interface AssignClassDTO {
  classId: string;
  role?: TeacherRole;
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