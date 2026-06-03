import { Class, ClassTeacher, Enrollment, ClassStatus, AcademicLevel, Teacher } from '@prisma/client';

// Class status enum
export type ClassStatusType = 'active' | 'inactive' | 'completed' | 'archived';
export type AcademicLevelType = 'beginner' | 'intermediate' | 'advanced';
export type ClassTeacherRole = 'primary' | 'substitute';
export type EnrollmentStatusType = 'active' | 'completed' | 'withdrawn';

// Schedule time slot
export interface ScheduleSlot {
  startTime: string; // HH:MM format
  endTime: string;
  room?: string;
}

// Weekly schedule structure
export interface WeeklySchedule {
  monday: ScheduleSlot[];
  tuesday: ScheduleSlot[];
  wednesday: ScheduleSlot[];
  thursday: ScheduleSlot[];
  friday: ScheduleSlot[];
  saturday: ScheduleSlot[];
  sunday: ScheduleSlot[];
}

// Create class DTO
export interface CreateClassDTO {
  centerId: string;
  name: string;
  description?: string;
  academicLevel: AcademicLevelType;
  capacity: number;
  classroom?: string;
  schedule: WeeklySchedule;
  startDate: string;
  endDate?: string;
  notes?: string;
}

// Update class DTO
export interface UpdateClassDTO {
  name?: string;
  description?: string;
  capacity?: number;
  classroom?: string;
  schedule?: WeeklySchedule;
  endDate?: string;
  notes?: string;
  status?: ClassStatusType;
}

// Class filters for queries
export interface ClassFilters {
  centerId?: string;
  status?: ClassStatusType;
  academicLevel?: AcademicLevelType;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Assign teacher DTO
export interface AssignTeacherDTO {
  teacherId: string;
  role: ClassTeacherRole;
}

// Bulk assign teachers DTO
export interface BulkAssignTeachersDTO {
  teachers: AssignTeacherDTO[];
}

// Enroll students DTO
export interface EnrollStudentsDTO {
  studentIds: string[];
  startDate?: string;
  notes?: string;
}

// Class response with relations
export interface ClassResponse {
  id: string;
  name: string;
  description: string | null;
  academicLevel: AcademicLevelType;
  capacity: number;
  currentEnrollment: number;
  status: ClassStatusType;
  classroom: string | null;
  schedule: WeeklySchedule;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  centerId: string;
  createdAt: Date;
  updatedAt: Date;
  center?: {
    id: string;
    name: string;
    code: string;
  };
  primaryTeacher?: {
    id: string;
    fullName: string;
  } | null;
  teachers?: Array<{
    id: string;
    fullName: string;
    role: ClassTeacherRole;
  }>;
  students?: Array<{
    id: string;
    fullName: string;
    status: string;
  }>;
}

// Class with full details
export interface ClassDetailResponse extends ClassResponse {
  primaryTeacher: Teacher | null;
  teachers: (ClassTeacher & { teacher: Teacher })[];
  students: (Enrollment & { student: { id: string; fullName: string } })[];
  enrollments: Enrollment[];
}

// Paginated result
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Enrollment result
export interface EnrollmentResult {
  enrollments: Array<{
    id: string;
    studentId: string;
    status: string;
  }>;
  message: string;
}

// Teacher assignment result
export interface TeacherAssignmentResult {
  teachers: Array<{
    id: string;
    fullName: string;
    role: ClassTeacherRole;
  }>;
}

// Class with current enrollment count
export interface ClassWithEnrollment extends Class {
  _count?: {
    enrollments: number;
  };
}