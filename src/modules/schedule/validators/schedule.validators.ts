import { z } from 'zod';

export const weeklyScheduleQuerySchema = z.object({
  centerId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const monthlyScheduleQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  classId: z.string().uuid(),
});

export const teacherScheduleParamsSchema = z.object({
  id: z.string().uuid(),
});
