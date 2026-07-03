import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

// ============================================================
// ATTENDANCE VALIDATORS
// Education Center Management Platform
// ============================================================

/**
 * Mark single attendance record
 * POST /api/v1/attendance
 */
export const markAttendanceSchema = z.object({
  body: z.object({
    studentId: z.string().uuid('Invalid student ID'),
    sessionId: z.string().uuid('Invalid session ID'),
    status: z.nativeEnum(AttendanceStatus, {
      errorMap: () => ({ message: 'Status must be: present, absent, late, or excused' }),
    }),
    reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
  }),
});

/**
 * Bulk mark attendance
 * POST /api/v1/attendance/bulk
 */
export const bulkMarkAttendanceSchema = z.object({
  body: z.object({
    sessionId: z.string().uuid('Invalid session ID'),
    records: z
      .array(
        z.object({
          studentId: z.string().uuid('Invalid student ID'),
          status: z.nativeEnum(AttendanceStatus, {
            errorMap: () => ({ message: 'Status must be: present, absent, late, or excused' }),
          }),
          reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
        })
      )
      .min(1, 'At least one record is required'),
  }),
});

/**
 * Create attendance session (mark all students in a class session)
 * POST /api/v1/attendance/session
 */
export const createAttendanceSessionSchema = z.object({
  body: z.object({
    sessionId: z.string().uuid('Invalid session ID'),
    sessionNote: z.string().max(10000).optional(),
    attendanceScreenshotUrl: z.string().url('Attendance screenshot is required'),
    defaultStatus: z
      .nativeEnum(AttendanceStatus, {
        errorMap: () => ({ message: 'Status must be: present, absent, late, or excused' }),
      })
      .optional(),
    records: z
      .array(
        z.object({
          studentId: z.string().uuid('Invalid student ID'),
          status: z.nativeEnum(AttendanceStatus, {
            errorMap: () => ({ message: 'Status must be: present, absent, late, or excused' }),
          }),
          reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
        })
      )
      .optional(),
  }),
});

/**
 * Update attendance record
 * PUT /api/v1/attendance/:id
 */
export const updateAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attendance record ID'),
  }),
  body: z.object({
    status: z
      .nativeEnum(AttendanceStatus, {
        errorMap: () => ({ message: 'Status must be: present, absent, late, or excused' }),
      })
      .optional(),
    reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
  }),
});

/**
 * Approve absence
 * POST /api/v1/attendance/:id/approve
 */
export const approveAbsenceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attendance record ID'),
  }),
  body: z.object({
    approvedBy: z.string().uuid('Invalid approver ID'),
    reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
  }),
});

/**
 * Get attendance filters
 * GET /api/v1/attendance
 */
export const getAttendanceSchema = z.object({
  query: z.object({
    centerId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
    studentId: z.string().uuid().optional(),
    status: z.nativeEnum(AttendanceStatus).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    recordedBy: z.string().uuid().optional(),
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, { message: 'Page must be positive' })
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 100, { message: 'Limit must be between 1 and 100' })
      .optional(),
  }),
});

/**
 * Get student attendance
 * GET /api/v1/attendance/student/:id
 */
export const getStudentAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid student ID'),
  }),
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, { message: 'Page must be positive' })
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 100, { message: 'Limit must be between 1 and 100' })
      .optional(),
  }),
});

/**
 * Get class attendance
 * GET /api/v1/attendance/class/:id
 */
export const getClassAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid class ID'),
  }),
  query: z.object({
    sessionId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, { message: 'Page must be positive' })
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 100, { message: 'Limit must be between 1 and 100' })
      .optional(),
  }),
});

/**
 * Get attendance statistics
 * GET /api/v1/attendance/stats
 */
export const getAttendanceStatsSchema = z.object({
  query: z.object({
    studentId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

/**
 * Create absence reason
 * POST /api/v1/attendance/reasons
 */
export const createAbsenceReasonSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
    description: z.string().max(500, 'Description must be 500 characters or less').optional(),
    displayOrder: z.number().int().min(0).optional(),
    centerId: z.string().uuid().optional(),
  }),
});

/**
 * Update absence reason
 * PUT /api/v1/attendance/reasons/:id
 */
export const updateAbsenceReasonSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid reason ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
    description: z.string().max(500, 'Description must be 500 characters or less').optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

// Type exports for use in controllers
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type BulkMarkAttendanceInput = z.infer<typeof bulkMarkAttendanceSchema>;
export type CreateAttendanceSessionInput = z.infer<typeof createAttendanceSessionSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type ApproveAbsenceInput = z.infer<typeof approveAbsenceSchema>;
export type GetAttendanceInput = z.infer<typeof getAttendanceSchema>;
export type GetStudentAttendanceInput = z.infer<typeof getStudentAttendanceSchema>;
export type GetClassAttendanceInput = z.infer<typeof getClassAttendanceSchema>;
export type GetAttendanceStatsInput = z.infer<typeof getAttendanceStatsSchema>;
export type CreateAbsenceReasonInput = z.infer<typeof createAbsenceReasonSchema>;
export type UpdateAbsenceReasonInput = z.infer<typeof updateAbsenceReasonSchema>;