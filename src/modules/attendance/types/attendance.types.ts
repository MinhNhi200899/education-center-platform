import { AttendanceStatus, SessionStatus } from '@prisma/client';

// ============================================================
// ATTENDANCE MODULE TYPES
// Education Center Management Platform
// ============================================================

/**
 * DTO for marking a single attendance record
 */
export interface MarkAttendanceDTO {
  studentId: string;
  sessionId: string;
  status: AttendanceStatus;
  reason?: string;
}

/**
 * DTO for bulk attendance marking
 */
export interface BulkAttendanceDTO {
  sessionId: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    reason?: string;
  }>;
}

/**
 * DTO for creating an attendance session (mark all students in a class)
 */
export interface CreateAttendanceSessionDTO {
  sessionId: string;
  sessionNote?: string;
  /** Offline teaching — screenshot not required */
  isOffline?: boolean;
  attendanceScreenshotUrl?: string;
  defaultStatus?: AttendanceStatus; // Default status for all students (e.g., 'present')
  records?: Array<{
    studentId: string;
    status: AttendanceStatus;
    reason?: string;
  }>;
}

/**
 * DTO for updating an attendance record
 */
export interface UpdateAttendanceDTO {
  status?: AttendanceStatus;
  reason?: string;
}

/**
 * DTO for approving an excused absence
 */
export interface ApproveAbsenceDTO {
  approvedBy: string;
  reason?: string;
}

/** Monthly attendance grid for bulk UI */
export interface MonthlyAttendanceGrid {
  classId: string;
  className: string;
  year: number;
  month: number;
  sessions: Array<{
    id: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
  }>;
  students: Array<{ id: string; fullName: string; avatarUrl: string | null }>;
  cells: Record<
    string,
    {
      studentId: string;
      sessionId: string;
      status: AttendanceStatus | null;
      reason: string | null;
      attendanceId: string | null;
    }
  >;
}

export interface MonthlyBulkAttendanceDTO {
  classId: string;
  records: Array<{
    studentId: string;
    sessionId: string;
    status: AttendanceStatus;
    reason?: string;
  }>;
}

export interface OfflineSyncDTO {
  records: MarkAttendanceDTO[];
}

/**
 * Attendance record response
 */
export interface AttendanceRecordResponse {
  id: string;
  studentId: string;
  sessionId: string;
  status: AttendanceStatus;
  reason: string | null;
  recordedBy: string;
  recordedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  student?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  session?: {
    id: string;
    sessionDate: Date;
    startTime: string;
    endTime: string;
    classId: string;
    class?: {
      id: string;
      name: string;
    };
  };
}

/**
 * Attendance statistics for a student
 */
export interface StudentAttendanceStats {
  studentId: string;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  presentRate: number;
  absenceRate: number;
  lateRate: number;
  excusedRate: number;
}

/**
 * Attendance statistics for a class
 */
export interface ClassAttendanceStats {
  classId: string;
  sessionId?: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  presentRate: number;
  absenceRate: number;
  lateRate: number;
  excusedRate: number;
}

/**
 * Date range filter for attendance queries
 */
export interface AttendanceDateFilter {
  startDate: Date;
  endDate: Date;
}

/**
 * Filters for listing attendance records
 */
export interface AttendanceFilters {
  centerId?: string;
  classId?: string;
  sessionId?: string;
  studentId?: string;
  status?: AttendanceStatus;
  startDate?: string;
  endDate?: string;
  recordedBy?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated result for attendance
 */
export interface PaginatedAttendanceResult {
  data: AttendanceRecordResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Result of marking attendance
 */
export interface MarkAttendanceResult {
  marked: number;
  updated: number;
  absentStudents?: string[];
}

/**
 * Absence reason DTO
 */
export interface AbsenceReasonDTO {
  name: string;
  description?: string;
  displayOrder?: number;
  centerId?: string;
  isSystem?: boolean;
  isActive?: boolean;
}

/**
 * Absence reason response
 */
export interface AbsenceReasonResponse {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Session with enrollment info for attendance
 */
export interface SessionWithEnrollments {
  id: string;
  classId: string;
  teacherId: string;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  classroom: string | null;
  sessionType: SessionStatus;
  status: SessionStatus;
  class: {
    id: string;
    name: string;
    capacity: number;
  };
  enrollments: Array<{
    studentId: string;
    student: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
    };
  }>;
}

/**
 * Student with attendance status for a session
 */
export interface StudentAttendanceStatus {
  studentId: string;
  enrollmentId: string;
  studentName: string;
  avatarUrl: string | null;
  attendanceId: string | null;
  status: AttendanceStatus | null;
  reason: string | null;
  isRecorded: boolean;
}