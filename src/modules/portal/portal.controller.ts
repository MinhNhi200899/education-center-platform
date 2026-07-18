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
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthStart = (req.query.monthStart as string) || defaultMonth;
  const data = await portalService.getSchedule(req.user!.id, monthStart);
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

export const getHomework = asyncHandler(async (req: Request, res: Response) => {
  const data = await portalService.getHomework(req.user!.id);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});
