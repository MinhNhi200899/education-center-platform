import { z } from 'zod';

// Academic level enum
export const academicLevelEnum = z.enum(['beginner', 'intermediate', 'advanced']);
export type AcademicLevel = z.infer<typeof academicLevelEnum>;

// Class status enum
export const classStatusEnum = z.enum(['active', 'inactive', 'completed', 'archived']);
export type ClassStatus = z.infer<typeof classStatusEnum>;

// Class teacher role enum
export const classTeacherRoleEnum = z.enum(['primary', 'substitute']);
export type ClassTeacherRole = z.infer<typeof classTeacherRoleEnum>;

// Schedule slot schema
const scheduleSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  room: z.string().max(100).optional(),
});

// Weekly schedule schema
const weeklyScheduleSchema = z.object({
  monday: z.array(scheduleSlotSchema).default([]),
  tuesday: z.array(scheduleSlotSchema).default([]),
  wednesday: z.array(scheduleSlotSchema).default([]),
  thursday: z.array(scheduleSlotSchema).default([]),
  friday: z.array(scheduleSlotSchema).default([]),
  saturday: z.array(scheduleSlotSchema).default([]),
  sunday: z.array(scheduleSlotSchema).default([]),
});

// Create class schema
export const createClassSchema = z.object({
  body: z.object({
    centerId: z.string().uuid('Invalid center ID'),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),
    description: z.string().max(1000).optional(),
    academicLevel: academicLevelEnum,
    capacity: z
      .number()
      .int()
      .min(1, 'Capacity must be at least 1')
      .max(100, 'Capacity cannot exceed 100'),
    classroom: z.string().max(100).optional(),
    schedule: weeklyScheduleSchema,
    startDate: z
      .string()
      .transform((val) => new Date(val))
      .refine((date) => !isNaN(date.getTime()), 'Invalid date format')
      .refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), 'Start date cannot be in the past'),
    endDate: z
      .string()
      .transform((val) => new Date(val))
      .refine((date) => !isNaN(date.getTime()), 'Invalid end date format')
      .optional()
      .or(z.literal('')),
    notes: z.string().max(2000).optional(),
  }),
});

// Update class schema
export const updateClassSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid class ID'),
  }),
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters')
      .optional(),
    description: z.string().max(1000).optional(),
    capacity: z
      .number()
      .int()
      .min(1, 'Capacity must be at least 1')
      .max(100, 'Capacity cannot exceed 100')
      .optional(),
    classroom: z.string().max(100).optional(),
    schedule: weeklyScheduleSchema.optional(),
    endDate: z
      .string()
      .transform((val) => (val ? new Date(val) : null))
      .refine((date) => date === null || !isNaN(date.getTime()), 'Invalid end date format')
      .optional(),
    notes: z.string().max(2000).optional(),
    status: classStatusEnum.optional(),
  }),
});

// Query class schema
export const queryClassSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    centerId: z.string().uuid('Invalid center ID').optional(),
    status: classStatusEnum.optional(),
    academicLevel: academicLevelEnum.optional(),
    search: z.string().max(100).optional(),
    sort: z.enum(['name', 'createdAt', 'startDate']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// Class ID params schema
export const classIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid class ID'),
  }),
});

// Assign teacher schema
export const assignTeacherSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid class ID'),
  }),
  body: z.object({
    teacherId: z.string().uuid('Invalid teacher ID'),
    role: classTeacherRoleEnum,
  }),
});

// Bulk assign teachers schema
export const bulkAssignTeachersSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid class ID'),
  }),
  body: z.object({
    teachers: z
      .array(
        z.object({
          teacherId: z.string().uuid('Invalid teacher ID'),
          role: classTeacherRoleEnum,
        })
      )
      .min(1, 'At least one teacher is required'),
  }),
});

// Remove teacher schema
export const removeTeacherSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid class ID'),
    teacherId: z.string().uuid('Invalid teacher ID'),
  }),
  query: z.object({
    role: classTeacherRoleEnum.optional(),
  }),
});

// Enroll students schema
export const enrollStudentsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid class ID'),
  }),
  body: z.object({
    studentIds: z.array(z.string().uuid()).min(1, 'At least one student is required'),
    startDate: z
      .string()
      .transform((val) => new Date(val))
      .refine((date) => !isNaN(date.getTime()), 'Invalid date format')
      .optional(),
    notes: z.string().max(500).optional(),
  }),
});

// Withdraw student schema
export const withdrawStudentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid class ID'),
    studentId: z.string().uuid('Invalid student ID'),
  }),
});

// Type exports
export type CreateClassInput = z.infer<typeof createClassSchema>['body'];
export type UpdateClassInput = z.infer<typeof updateClassSchema>['body'];
export type QueryClassInput = z.infer<typeof queryClassSchema>['query'];
export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>['body'];
export type BulkAssignTeachersInput = z.infer<typeof bulkAssignTeachersSchema>['body'];
export type EnrollStudentsInput = z.infer<typeof enrollStudentsSchema>['body'];
export type WithdrawStudentInput = z.infer<typeof withdrawStudentSchema>['params'];