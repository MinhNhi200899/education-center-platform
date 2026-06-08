import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { teacherPortalService } from './teacher-portal.service';

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.getDashboard(req.user!.id);
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
  const data = await teacherPortalService.getSchedule(req.user!.id, monthStart);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getClasses = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.getClasses(req.user!.id);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});
