import { z } from 'zod';

// Gender enum
export const genderEnum = z.enum(['male', 'female', 'other']);
export type Gender = z.infer<typeof genderEnum>;

// Create student schema
export const createStudentSchema = z.object({
  body: z
    .object({
      centerId: z.string().uuid('Invalid center ID'),
      fullName: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must not exceed 100 characters'),
      dateOfBirth: z
        .string()
        .transform((val) => new Date(val))
        .refine((date) => !isNaN(date.getTime()), 'Invalid date format')
        .refine((date) => date <= new Date(), 'Date of birth cannot be in the future')
        .refine((date) => {
          const age = (new Date().getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          return age >= 3 && age <= 25;
        }, 'Age must be between 3 and 25 years'),
      gender: genderEnum,
      phone: z
        .string()
        .regex(/^(0[0-9]{9,10})$/, 'Invalid Vietnamese phone number')
        .optional()
        .or(z.literal('')),
      email: z.string().email('Invalid email format').optional().or(z.literal('')),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .optional()
        .or(z.literal('')),
      /** Roster-only: no portal User / login credentials */
      isOffline: z.boolean().optional().default(false),
      address: z.string().max(500).optional(),
      avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
      enrollmentDate: z
        .string()
        .transform((val) => new Date(val))
        .refine((date) => !isNaN(date.getTime()), 'Invalid enrollment date')
        .refine((date) => date <= new Date(), 'Enrollment date cannot be in the future'),
      notes: z.string().max(2000).optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.isOffline && !data.email?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Email is required for portal students',
          path: ['email'],
        });
      }
    }),
});

// Update student schema
export const updateStudentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid student ID'),
  }),
  body: z.object({
    fullName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters')
      .optional(),
    phone: z
      .string()
      .regex(/^(0[0-9]{9,10})$/, 'Invalid Vietnamese phone number')
      .optional()
      .or(z.literal('')),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    address: z.string().max(500).optional(),
    avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
    notes: z.string().max(2000).optional(),
  }),
});

// Query student schema
export const queryStudentSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    centerId: z.string().uuid('Invalid center ID').optional(),
    status: z.enum(['active', 'inactive', 'archived']).optional(),
    gender: genderEnum.optional(),
    search: z.string().max(100).optional(),
    enrollmentDateFrom: z.string().optional(),
    enrollmentDateTo: z.string().optional(),
    sort: z.enum(['fullName', 'dateOfBirth', 'enrollmentDate', 'createdAt']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// Student ID params schema
export const studentIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid student ID'),
  }),
});

// Bulk delete schema
export const bulkDeleteSchema = z.object({
  body: z.object({
    ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
  }),
});

// Transfer class body schema
export const transferClassBodySchema = z.object({
  body: z.object({
    fromClassId: z.string().uuid('Invalid source class ID'),
    toClassId: z.string().uuid('Invalid target class ID'),
    effectiveDate: z
      .string()
      .transform((val) => new Date(val))
      .refine((date) => !isNaN(date.getTime()), 'Invalid effective date'),
    reason: z.string().min(1, 'Reason is required').max(500),
  }),
});

// Import schema
export const importSchema = z.object({
  body: z.object({
    centerId: z.string().uuid('Center ID is required'),
    rows: z.array(z.record(z.any())).min(1, 'At least one row is required'),
  }),
});

// Parent schema
export const parentSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100),
    relationship: z.enum(['father', 'mother', 'guardian', 'other']),
    phone: z.string().regex(/^(0[0-9]{9,10})$/, 'Invalid phone'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    occupation: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    isPrimary: z.boolean().default(true),
  }),
});

// Type exports
export type CreateStudentInput = z.infer<typeof createStudentSchema>['body'];
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>['body'];
export type QueryStudentInput = z.infer<typeof queryStudentSchema>['query'];
export type ParentInput = z.infer<typeof parentSchema>['body'];
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>['body'];
export type ImportInput = z.infer<typeof importSchema>['body'];