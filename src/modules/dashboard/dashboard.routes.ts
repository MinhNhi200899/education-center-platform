import { Router, Request, Response } from 'express';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from '../rbac/middleware/require-permission';
import { asyncHandler } from '../../shared/utils/async-handler';
import { getRevenue, getCollectionMetrics } from '../payments/payments.controller';
import { prisma } from '../../config/database';

const router = Router();

router.use(authenticate);

const emptyStudentMetrics = {
  totalStudents: 0,
  activeStudents: 0,
  newEnrollments: 0,
  withdrawnStudents: 0,
  growthRate: 0,
  byClass: [] as Array<{ className: string; students: number }>,
  byStatus: { active: 0, inactive: 0, archived: 0 },
  trend: [] as Array<{ date: string; total: number }>,
};

const emptyAttendanceMetrics = {
  averageAttendanceRate: 0,
  totalSessions: 0,
  completedSessions: 0,
  cancelledSessions: 0,
  byStatus: { present: 0, absent: 0, late: 0, excused: 0 },
  problemStudents: [] as Array<{
    studentId: string;
    fullName: string;
    attendanceRate: number;
  }>,
};

router.get('/revenue', requirePermission('dashboard.read'), getRevenue);

router.get(
  '/collections',
  requirePermission('dashboard.read'),
  getCollectionMetrics
);

router.get(
  '/students',
  requirePermission('dashboard.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const centerId =
      (req.query.centerId as string) || req.user?.centerId || undefined;

    const where = centerId ? { centerId } : {};

    const [totalStudents, activeStudents, inactiveStudents, archivedStudents] =
      await Promise.all([
        prisma.student.count({ where }),
        prisma.student.count({ where: { ...where, status: 'active' } }),
        prisma.student.count({ where: { ...where, status: 'inactive' } }),
        prisma.student.count({ where: { ...where, status: 'archived' } }),
      ]);

    res.json({
      success: true,
      data: {
        ...emptyStudentMetrics,
        totalStudents,
        activeStudents,
        byStatus: {
          active: activeStudents,
          inactive: inactiveStudents,
          archived: archivedStudents,
        },
      },
      meta: { timestamp: new Date().toISOString() },
    });
  })
);

router.get(
  '/attendance',
  requirePermission('dashboard.read'),
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: emptyAttendanceMetrics,
      meta: { timestamp: new Date().toISOString() },
    });
  })
);

export default router;
