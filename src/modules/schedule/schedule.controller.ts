import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { scheduleQueryService } from './services/schedule-query.service';

export const getWeeklySchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { centerId, teacherId, classId, weekStart } = req.query as {
    centerId?: string;
    teacherId?: string;
    classId?: string;
    weekStart: string;
  };

  const data = await scheduleQueryService.getWeekly({
    centerId,
    teacherId,
    classId,
    weekStart,
  });

  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getMonthlySchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { year, month, classId } = req.query as unknown as {
    year: number;
    month: number;
    classId: string;
  };

  const data = await scheduleQueryService.getMonthly(year, month, classId);

  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getTeacherSchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const data = await scheduleQueryService.getTeacherSchedule(req.params.id);

  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});
