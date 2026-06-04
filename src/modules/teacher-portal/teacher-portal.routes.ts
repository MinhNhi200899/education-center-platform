import { Router } from 'express';
import { authenticate } from '../auth/middleware/authenticate';
import { requireTeacherRole } from './middleware/require-teacher-role';
import { getDashboard, getSchedule, getClasses } from './teacher-portal.controller';

const router = Router();

router.use(authenticate, requireTeacherRole);

router.get('/dashboard', getDashboard);
router.get('/schedule', getSchedule);
router.get('/classes', getClasses);

export default router;
