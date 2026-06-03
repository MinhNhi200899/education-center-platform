import { Router } from 'express';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from '../rbac/middleware/require-permission';
import { validateRequest } from '../../shared/middleware/validate-request';
import {
  bulkCreateEvaluationBodySchema,
  createEvaluationBodySchema,
  evaluationIdParamsSchema,
  previewQuerySchema,
  queryEvaluationSchema,
  updateEvaluationBodySchema,
} from './validators/evaluation.validators';
import {
  bulkCreateEvaluations,
  createEvaluation,
  deleteEvaluation,
  getEvaluation,
  listEvaluations,
  previewEvaluationReport,
  shareEvaluationZalo,
  updateEvaluation,
} from './evaluations.controller';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('evaluations.read'),
  validateRequest({ query: queryEvaluationSchema }),
  listEvaluations
);

router.post(
  '/bulk',
  requirePermission('evaluations.create'),
  validateRequest({ body: bulkCreateEvaluationBodySchema }),
  bulkCreateEvaluations
);

router.post(
  '/',
  requirePermission('evaluations.create'),
  validateRequest({ body: createEvaluationBodySchema }),
  createEvaluation
);

router.get(
  '/:id/preview',
  requirePermission('evaluations.read'),
  validateRequest({ params: evaluationIdParamsSchema, query: previewQuerySchema }),
  previewEvaluationReport
);

router.post(
  '/:id/share-zalo',
  requirePermission('evaluations.create'),
  validateRequest({ params: evaluationIdParamsSchema }),
  shareEvaluationZalo
);

router.get(
  '/:id',
  requirePermission('evaluations.read'),
  validateRequest({ params: evaluationIdParamsSchema }),
  getEvaluation
);

router.put(
  '/:id',
  requirePermission('evaluations.update'),
  validateRequest({ params: evaluationIdParamsSchema, body: updateEvaluationBodySchema }),
  updateEvaluation
);

router.delete(
  '/:id',
  requirePermission('evaluations.delete'),
  validateRequest({ params: evaluationIdParamsSchema }),
  deleteEvaluation
);

export default router;
