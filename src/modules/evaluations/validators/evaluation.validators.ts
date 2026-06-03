import { z } from 'zod';
import { EvaluationType } from '@prisma/client';

const ratingSchema = z.number().int().min(1).max(5).optional();
const scoreSchema = z.number().min(0).max(10).optional();

const scoresObjectSchema = z
  .object({
    speaking: z.number().min(0).max(10).optional(),
    writing: z.number().min(0).max(10).optional(),
  })
  .passthrough()
  .optional();

export const queryEvaluationSchema = z.object({
  classId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  evaluationType: z.nativeEnum(EvaluationType).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const evaluationIdParamsSchema = z.object({
  id: z.string().uuid('Invalid evaluation ID'),
});

export const createEvaluationBodySchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  teacherId: z.string().uuid().optional(),
  evaluationType: z.nativeEnum(EvaluationType),
  evaluationDate: z.string().min(1),
  participation: ratingSchema,
  homework: ratingSchema,
  behavior: ratingSchema,
  speakingScore: scoreSchema,
  writingScore: scoreSchema,
  scores: scoresObjectSchema,
  comments: z.string().max(5000).optional(),
});

export const updateEvaluationBodySchema = z.object({
  teacherId: z.string().uuid().optional(),
  evaluationType: z.nativeEnum(EvaluationType).optional(),
  evaluationDate: z.string().min(1).optional(),
  participation: ratingSchema.nullable(),
  homework: ratingSchema.nullable(),
  behavior: ratingSchema.nullable(),
  speakingScore: scoreSchema.nullable(),
  writingScore: scoreSchema.nullable(),
  scores: scoresObjectSchema,
  comments: z.string().max(5000).nullable().optional(),
});

export const bulkCreateEvaluationBodySchema = z.object({
  classId: z.string().uuid(),
  teacherId: z.string().uuid().optional(),
  evaluationType: z.nativeEnum(EvaluationType),
  evaluationDate: z.string().min(1),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        participation: ratingSchema,
        homework: ratingSchema,
        behavior: ratingSchema,
        speakingScore: scoreSchema,
        writingScore: scoreSchema,
        comments: z.string().max(5000).optional(),
      })
    )
    .min(1),
});

export const previewQuerySchema = z.object({
  format: z.enum(['json', 'html']).optional(),
});
