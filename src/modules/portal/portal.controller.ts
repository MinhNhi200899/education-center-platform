import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { portalService } from './portal.service';

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await portalService.getDashboard(req.user!.id);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getSchedule = asyncHandler(async (req: Request, res: Response) => {
  const weekStart = (req.query.weekStart as string) || new Date().toISOString().split('T')[0];
  const data = await portalService.getSchedule(req.user!.id, weekStart);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const data = await portalService.getInvoices(req.user!.id);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const data = await portalService.getInvoiceById(req.user!.id, req.params.id);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});
