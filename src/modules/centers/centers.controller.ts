import { Request, Response } from 'express';
import { centerService } from './services/center.service';
import { asyncHandler } from '../../shared/utils/async-handler';
import { assertCenterAccess } from '../../shared/utils/center-scope';

export const getPaymentSettings = asyncHandler(async (req: Request, res: Response) => {
  assertCenterAccess(req, req.params.id);
  const data = await centerService.getPaymentSettings(req.params.id);

  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const updatePaymentSettings = asyncHandler(async (req: Request, res: Response) => {
  assertCenterAccess(req, req.params.id);
  const data = await centerService.updatePaymentSettings(req.params.id, req.body);

  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const centersController = {
  getPaymentSettings,
  updatePaymentSettings,
};
