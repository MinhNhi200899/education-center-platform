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
  const weekStart = (req.query.weekStart as string) || new Date().toISOString().split('T')[0];
  const data = await teacherPortalService.getSchedule(req.user!.id, weekStart);
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
