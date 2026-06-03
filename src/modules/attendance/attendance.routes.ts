import { Router } from 'express';
import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from '../rbac/middleware/require-permission';
import {
  getAttendance,
  markAttendance,
  bulkMarkAttendance,
  markSessionAttendance,
  updateAttendance,
  approveAbsence,
  getStudentAttendance,
  getClassAttendance,
  getAttendanceStats,
  getSessionAttendance,
  getAbsenceReasons,
  createAbsenceReason,
  updateAbsenceReason,
  deleteAbsenceReason,
  getMonthlyGrid,
  prepareMonthlySessions,
  bulkMonthlyMark,
  syncOfflineAttendance,
} from './attendance.controller';
import { validateRequest } from '../../shared/middleware/validate-request';
import {
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
  createAttendanceSessionSchema,
  updateAttendanceSchema,
  approveAbsenceSchema,
  getAttendanceSchema,
  getStudentAttendanceSchema,
  getClassAttendanceSchema,
  getAttendanceStatsSchema,
  createAbsenceReasonSchema,
  updateAbsenceReasonSchema,
} from './validators/attendance.validators';

const router = Router();

router.use(authenticate);

const monthlyGridQuerySchema = z.object({
  classId: z.string().uuid(),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const monthlyBulkBodySchema = z.object({
  classId: z.string().uuid(),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        sessionId: z.string().uuid(),
        status: z.nativeEnum(AttendanceStatus),
        reason: z.string().max(500).optional(),
      })
    )
    .min(1),
});

const offlineSyncBodySchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        sessionId: z.string().uuid(),
        status: z.nativeEnum(AttendanceStatus),
        reason: z.string().max(500).optional(),
      })
    )
    .min(1),
});

const prepareMonthBodySchema = z.object({
  classId: z.string().uuid(),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

router.get(
  '/',
  requirePermission('attendance.read'),
  validateRequest({ query: getAttendanceSchema.shape.query }),
  getAttendance
);

router.get(
  '/stats',
  requirePermission('attendance.read'),
  validateRequest({ query: getAttendanceStatsSchema.shape.query }),
  getAttendanceStats
);

router.get(
  '/reasons',
  requirePermission('attendance.read'),
  getAbsenceReasons
);

router.get(
  '/monthly-grid',
  requirePermission('attendance.read'),
  validateRequest({ query: monthlyGridQuerySchema }),
  getMonthlyGrid
);

router.get(
  '/session/:id',
  requirePermission('attendance.read'),
  getSessionAttendance
);

router.get(
  '/student/:id',
  requirePermission('attendance.read'),
  validateRequest({
    params: getStudentAttendanceSchema.shape.params,
    query: getStudentAttendanceSchema.shape.query,
  }),
  getStudentAttendance
);

router.get(
  '/class/:id',
  requirePermission('attendance.read'),
  validateRequest({
    params: getClassAttendanceSchema.shape.params,
    query: getClassAttendanceSchema.shape.query,
  }),
  getClassAttendance
);

router.post(
  '/',
  requirePermission('attendance.create'),
  validateRequest({ body: markAttendanceSchema.shape.body }),
  markAttendance
);

router.post(
  '/bulk',
  requirePermission('attendance.create'),
  validateRequest({ body: bulkMarkAttendanceSchema.shape.body }),
  bulkMarkAttendance
);

router.post(
  '/session',
  requirePermission('attendance.create'),
  validateRequest({ body: createAttendanceSessionSchema.shape.body }),
  markSessionAttendance
);

router.post(
  '/monthly/prepare',
  requirePermission('attendance.create'),
  validateRequest({ body: prepareMonthBodySchema }),
  prepareMonthlySessions
);

router.post(
  '/monthly-bulk',
  requirePermission('attendance.create'),
  validateRequest({ body: monthlyBulkBodySchema }),
  bulkMonthlyMark
);

router.post(
  '/sync',
  requirePermission('attendance.create'),
  validateRequest({ body: offlineSyncBodySchema }),
  syncOfflineAttendance
);

router.post(
  '/reasons',
  requirePermission('attendance.update'),
  validateRequest({ body: createAbsenceReasonSchema.shape.body }),
  createAbsenceReason
);

router.put(
  '/:id',
  requirePermission('attendance.update'),
  validateRequest({
    params: updateAttendanceSchema.shape.params,
    body: updateAttendanceSchema.shape.body,
  }),
  updateAttendance
);

router.post(
  '/:id/approve',
  requirePermission('attendance.update'),
  validateRequest({
    params: approveAbsenceSchema.shape.params,
    body: approveAbsenceSchema.shape.body,
  }),
  approveAbsence
);

router.put(
  '/reasons/:id',
  requirePermission('attendance.update'),
  validateRequest({
    params: updateAbsenceReasonSchema.shape.params,
    body: updateAbsenceReasonSchema.shape.body,
  }),
  updateAbsenceReason
);

router.delete('/reasons/:id', requirePermission('attendance.update'), deleteAbsenceReason);

export default router;
