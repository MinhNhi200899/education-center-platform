import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import rbacRoutes from '../modules/rbac/rbac.routes';
import studentsRoutes from '../modules/students/students.routes';
import teachersRoutes from '../modules/teachers/teachers.routes';
import classesRoutes from '../modules/classes/classes.routes';
import attendanceRoutes from '../modules/attendance/attendance.routes';
import paymentsRoutes from '../modules/payments/payments.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import evaluationsRoutes from '../modules/evaluations/evaluations.routes';
import reportsRoutes from '../modules/reports/reports.routes';
import sessionsRoutes from '../modules/sessions/sessions.routes';
import scheduleRoutes from '../modules/schedule/schedule.routes';
import centersRoutes from '../modules/centers/centers.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Auth routes
router.use('/auth', authRoutes);

// RBAC routes
router.use('/rbac', rbacRoutes);

// Students routes
router.use('/students', studentsRoutes);

// Teachers routes
router.use('/teachers', teachersRoutes);

// Classes routes
router.use('/classes', classesRoutes);

// Attendance routes
router.use('/attendance', attendanceRoutes);

// Schedule routes
router.use('/schedule', scheduleRoutes);

// Sessions routes
router.use('/sessions', sessionsRoutes);

// Payments routes
router.use('/payments', paymentsRoutes);

// Tuition alias (frontend uses /tuition/invoices)
router.use('/tuition', paymentsRoutes);

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

// Evaluations routes
router.use('/evaluations', evaluationsRoutes);

// Reports routes
router.use('/reports', reportsRoutes);

// Centers routes (payment settings, etc.)
router.use('/centers', centersRoutes);

export default router;
