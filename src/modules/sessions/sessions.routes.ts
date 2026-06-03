import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from '../rbac/middleware/require-permission';
import { validateRequest } from '../../shared/middleware/validate-request';
import { getSession, updateSession, addSessionMaterial } from './sessions.controller';

const router = Router();

router.use(authenticate);

const sessionIdSchema = z.object({ id: z.string().uuid() });

const updateSessionSchema = z.object({
  notes: z.string().max(10000).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
});

const addMaterialSchema = z.object({
  driveUrl: z.string().url().max(500),
  fileName: z.string().max(255).optional(),
});

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

router.post(
  '/:id/materials',
  requirePermission('sessions.update'),
  validateRequest({ params: sessionIdSchema, body: addMaterialSchema }),
  addSessionMaterial
);

export default router;
