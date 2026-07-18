import { Router } from 'express';
import { z } from 'zod';
import { SessionType } from '@prisma/client';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from '../rbac/middleware/require-permission';
import { validateRequest } from '../../shared/middleware/validate-request';
import {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  addSessionMaterial,
  listHomeworkSubmissions,
  setHomeworkFeedback,
} from './sessions.controller';

const router = Router();

router.use(authenticate);

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)');

const sessionIdSchema = z.object({ id: z.string().uuid() });

const feedbackParamsSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
});

const feedbackBodySchema = z.object({
  feedback: z.string().min(1, 'Feedback is required').max(2000),
});

const createSessionSchema = z.object({
  classId: z.string().uuid(),
  sessionDate: z.string().min(1),
  startTime: timeSchema,
  endTime: timeSchema,
  classroom: z.string().max(100).optional(),
  sessionType: z.nativeEnum(SessionType).optional(),
  notes: z.string().max(10000).optional(),
});

const updateSessionSchema = z.object({
  sessionDate: z.string().min(1).optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  classroom: z.string().max(100).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
});

const addMaterialSchema = z.object({
  driveUrl: z.string().url().max(500).optional(),
  fileUrl: z.string().url().max(500).optional(),
  fileName: z.string().max(255).optional(),
  fileType: z.string().max(100).optional(),
  fileSize: z.number().int().min(0).optional(),
  driveFileId: z.string().max(100).optional(),
}).refine((data) => Boolean(data.driveUrl || data.fileUrl), {
  message: 'fileUrl or driveUrl is required',
});

router.post(
  '/',
  requirePermission('sessions.create'),
  validateRequest({ body: createSessionSchema }),
  createSession
);

router.get(
  '/:id/homework-submissions',
  requirePermission('sessions.read'),
  validateRequest({ params: sessionIdSchema }),
  listHomeworkSubmissions
);

router.put(
  '/:sessionId/homework-submissions/:studentId/feedback',
  requirePermission('sessions.update'),
  validateRequest({ params: feedbackParamsSchema, body: feedbackBodySchema }),
  setHomeworkFeedback
);

router.get(
  '/:id',
  requirePermission('sessions.read'),
  validateRequest({ params: sessionIdSchema }),
  getSession
);

router.put(
  '/:id',
  requirePermission('sessions.update'),
  validateRequest({ params: sessionIdSchema, body: updateSessionSchema }),
  updateSession
);

router.delete(
  '/:id',
  requirePermission('sessions.delete'),
  validateRequest({ params: sessionIdSchema }),
  deleteSession
);

router.post(
  '/:id/materials',
  requirePermission('sessions.update'),
  validateRequest({ params: sessionIdSchema, body: addMaterialSchema }),
  addSessionMaterial
);

export default router;
