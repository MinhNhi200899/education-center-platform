import { Router } from 'express';
import { authenticate } from '../auth/middleware/authenticate';
import { requireStudentRole } from './middleware/require-student-role';
import {
  getDashboard,
  getSchedule,
  getInvoices,
  getInvoiceById,
  getHomework,
} from './portal.controller';

const router = Router();

router.use(authenticate, requireStudentRole);

router.get('/dashboard', getDashboard);
router.get('/schedule', getSchedule);
router.get('/homework', getHomework);
router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);

export default router;
