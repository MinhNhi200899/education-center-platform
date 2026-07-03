import { z } from 'zod';

// Enums
export const genderEnum = z.enum(['male', 'female', 'other']);
export const teacherStatusEnum = z.enum(['active', 'inactive', 'terminated']);
export const teacherRoleEnum = z.enum(['primary', 'substitute']);

// Create Teacher Schema
export const createTeacherSchema = z.object({
  body: z.object({
    centerId: z.string().uuid('Invalid center ID'),
    fullName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),
    dateOfBirth: z
      .string()
      .transform((val) => new Date(val))
      .refine((date) => !isNaN(date.getTime()), 'Invalid date format'),
    gender: genderEnum,
    phone: z
      .string()
      .regex(/^(0[0-9]{9,10})$/, 'Invalid Vietnamese phone number'),
    email: z.string().email('Invalid email format'),
    address: z.string().max(500).optional(),
    qualification: z.string().max(200).optional(),
    specialization: z.string().max(200).optional(),
    hireDate: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
      .refine((date) => date === undefined || !isNaN(date.getTime()), 'Invalid date format'),
    salary: z.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
  }),
});

// Update Teacher Schema
export const updateTeacherSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher ID'),
  }),
  body: z.object({
    fullName: z
      .string()
      .min(2)
      .max(100)
      .optional(),
    phone: z
      .string()
      .regex(/^(0[0-9]{9,10})$/, 'Invalid phone')
      .optional(),
    email: z.string().email().optional(),
    address: z.string().max(500).optional(),
    qualification: z.string().max(200).optional(),
    specialization: z.string().max(200).optional(),
    salary: z.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

// Query Teachers Schema
export const queryTeacherSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    centerId: z.string().uuid().optional(),
    status: teacherStatusEnum.optional(),
    gender: genderEnum.optional(),
    search: z.string().max(100).optional(),
    hireDateFrom: z.string().optional(),
    hireDateTo: z.string().optional(),
    sort: z.enum(['fullName', 'hireDate', 'createdAt', 'email']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// Teacher ID Params Schema
export const teacherIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher ID'),
  }),
});

// Assign Class Schema
export const assignClassSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher ID'),
  }),
  body: z.object({
    classId: z.string().uuid('Invalid class ID'),
    role: teacherRoleEnum.default('primary'),
  }),
});

// Bulk Assign Schema
export const bulkAssignSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher ID'),
  }),
  body: z.object({
    classes: z.array(
      z.object({
        classId: z.string().uuid('Invalid class ID'),
        role: teacherRoleEnum.default('primary'),
      })
    ).min(1, 'At least one class is required'),
  }),
});

// Type exports
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>['body'];
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>['body'];
export type QueryTeacherInput = z.infer<typeof queryTeacherSchema>['query'];
export type AssignClassInput = z.infer<typeof assignClassSchema>['body'];
export type BulkAssignInput = z.infer<typeof bulkAssignSchema>['body'];