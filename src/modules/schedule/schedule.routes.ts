import { Router } from 'express';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from '../rbac/middleware/require-permission';
import { validateRequest } from '../../shared/middleware/validate-request';
import {
  weeklyScheduleQuerySchema,
  monthlyScheduleQuerySchema,
  teacherScheduleParamsSchema,
} from './validators/schedule.validators';
import {
  getWeeklySchedule,
  getMonthlySchedule,
  getTeacherSchedule,
} from './schedule.controller';

const router = Router();

router.use(authenticate);

router.get(
  '/weekly',
  requirePermission('schedule.read'),
  validateRequest({ query: weeklyScheduleQuerySchema }),
  getWeeklySchedule
);

router.get(
  '/monthly',
  requirePermission('schedule.read'),
  validateRequest({ query: monthlyScheduleQuerySchema }),
  getMonthlySchedule
);

router.get(
  '/teacher/:id',
  requirePermission('schedule.read'),
  validateRequest({ params: teacherScheduleParamsSchema }),
  getTeacherSchedule
);

export default router;
