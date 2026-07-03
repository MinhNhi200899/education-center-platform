import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/middleware/authenticate';
import { validateRequest } from '../../shared/middleware/validate-request';
import { requireTeacherRole } from './middleware/require-teacher-role';
import {
  getDashboard,
  getSchedule,
  getClasses,
  getClassStudents,
  setStudentMonthlyFee,
  setStudentsMonthlyFeeBulk,
  getStudentMonthlySessions,
  exportStudentReceipt,
  sendStudentReceipt,
  sendClassReceiptsBulk,
  confirmStudentPayment,
  setStudentCollectAmount,
  getPaymentSettings,
  updatePaymentSettings,
} from './teacher-portal.controller';

const router = Router();

router.use(authenticate, requireTeacherRole);

router.get('/dashboard', getDashboard);
router.get('/schedule', getSchedule);
router.get('/classes', getClasses);
router.get('/classes/:classId/students', getClassStudents);

const paymentSettingsBodySchema = z.object({
  vietqrBankId: z.string().min(2).max(20),
  accountNo: z.string().min(1).max(30),
  accountName: z.string().min(1).max(100),
});

router.get('/payment-settings', getPaymentSettings);
router.put(
  '/payment-settings',
  validateRequest({ body: paymentSettingsBodySchema }),
  updatePaymentSettings
);

const classStudentParamsSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
});

const setMonthlyFeeSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
  amount: z.number().min(0),
  note: z.string().max(2000).optional(),
});

const bulkMonthlyFeeSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
  studentIds: z.array(z.string().uuid()).min(1),
  amount: z.number().min(0),
  note: z.string().max(2000).optional(),
});

router.put(
  '/classes/:classId/students/monthly-fee/bulk',
  validateRequest({
    params: z.object({ classId: z.string().uuid() }),
    body: bulkMonthlyFeeSchema,
  }),
  setStudentsMonthlyFeeBulk
);

router.put(
  '/classes/:classId/students/:studentId/monthly-fee',
  validateRequest({ params: classStudentParamsSchema, body: setMonthlyFeeSchema }),
  setStudentMonthlyFee
);

const setCollectAmountSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
  collectAmount: z.union([z.number().min(1), z.null()]),
});

router.put(
  '/classes/:classId/students/:studentId/collect-amount',
  validateRequest({ params: classStudentParamsSchema, body: setCollectAmountSchema }),
  setStudentCollectAmount
);

const receiptBodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
});

router.post(
  '/classes/:classId/students/:studentId/receipt',
  validateRequest({ params: classStudentParamsSchema, body: receiptBodySchema }),
  exportStudentReceipt
);

router.post(
  '/classes/:classId/students/:studentId/send-receipt',
  validateRequest({ params: classStudentParamsSchema, body: receiptBodySchema }),
  sendStudentReceipt
);

router.post(
  '/classes/:classId/send-receipts/bulk',
  validateRequest({
    params: z.object({ classId: z.string().uuid() }),
    body: receiptBodySchema,
  }),
  sendClassReceiptsBulk
);

router.post(
  '/classes/:classId/students/:studentId/confirm-paid',
  validateRequest({ params: classStudentParamsSchema, body: receiptBodySchema }),
  confirmStudentPayment
);

router.get(
  '/classes/:classId/students/:studentId/sessions',
  validateRequest({ params: classStudentParamsSchema }),
  getStudentMonthlySessions
);

export default router;
