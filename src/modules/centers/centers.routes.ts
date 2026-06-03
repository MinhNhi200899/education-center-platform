import { Router } from 'express';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from '../rbac/middleware/require-permission';
import { validateRequest } from '../../shared/middleware/validate-request';
import { centersController } from './centers.controller';
import { centerIdParamsSchema, paymentSettingsBodySchema } from './validators/center.validators';

const router = Router();

router.get(
  '/:id/payment-settings',
  authenticate,
  requirePermission('settings.read'),
  validateRequest({ params: centerIdParamsSchema }),
  centersController.getPaymentSettings
);

router.put(
  '/:id/payment-settings',
  authenticate,
  requirePermission('settings.update'),
  validateRequest({ params: centerIdParamsSchema, body: paymentSettingsBodySchema }),
  centersController.updatePaymentSettings
);

export default router;
