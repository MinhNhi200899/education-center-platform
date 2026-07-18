import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../auth/middleware/authenticate';
import { requireStudentRole } from './middleware/require-student-role';
import {
  getDashboard,
  getSchedule,
  getInvoices,
  getInvoiceById,
  getHomework,
  getSessionHomework,
  submitSessionHomework,
} from './portal.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.use(authenticate, requireStudentRole);

router.get('/dashboard', getDashboard);
router.get('/schedule', getSchedule);
router.get('/homework', getHomework);
router.get('/sessions/:sessionId/homework', getSessionHomework);
router.post(
  '/sessions/:sessionId/homework/submit',
  upload.single('file'),
  submitSessionHomework
);
router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);

export default router;
