import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { scheduleQueryService } from './services/schedule-query.service';
import { assertCenterAccess, resolveScopedCenterId } from '../../shared/utils/center-scope';
import { classService } from '../classes/services/class.service';
import { teacherService } from '../teachers/services/teacher.service';

export const getWeeklySchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { centerId: centerIdQuery, teacherId, classId, weekStart } = req.query as {
    centerId?: string;
    teacherId?: string;
    classId?: string;
    weekStart: string;
  };

  const centerId = resolveScopedCenterId(req, centerIdQuery);

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

  const classRecord = await classService.getById(classId);
  assertCenterAccess(req, classRecord.centerId);

  const data = await scheduleQueryService.getMonthly(year, month, classId);

  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getTeacherSchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const teacher = await teacherService.getById(req.params.id);
  assertCenterAccess(req, teacher.centerId);

  const data = await scheduleQueryService.getTeacherSchedule(req.params.id);

  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});
