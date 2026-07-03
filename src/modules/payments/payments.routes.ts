import { Router } from 'express';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from '../rbac/middleware/require-permission';
import { validateRequest } from '../../shared/middleware/validate-request';
import {
  createTuitionPlanBodySchema,
  updateTuitionPlanBodySchema,
  queryTuitionPlanSchema,
  tuitionPlanIdParamsSchema,
  createInvoiceBodySchema,
  batchGenerateInvoicesBodySchema,
  generateFromAttendanceBodySchema,
  sendRemindersBodySchema,
  updateInvoiceBodySchema,
  queryInvoiceSchema,
  invoiceIdParamsSchema,
  invoicePreviewQuerySchema,
  recordPaymentBodySchema,
  queryPaymentSchema,
  paymentIdParamsSchema,
  confirmPaymentBodySchema,
  vietQRRequestBodySchema,
} from './validators/payment.validators';
import {
  createTuitionPlan,
  getTuitionPlans,
  getTuitionPlanById,
  updateTuitionPlan,
  deleteTuitionPlan,
  createInvoice,
  batchGenerateInvoices,
  generateInvoicesFromAttendance,
  getInvoices,
  getInvoiceById,
  previewInvoice,
  shareInvoiceZalo,
  sendDebtReminders,
  updateInvoice,
  issueInvoice,
  getOverdueInvoices,
  recordPayment,
  getPaymentById,
  getPayments,
  confirmPayment,
  getPaymentHistory,
  generateVietQR,
  getVietQRBanks,
  reconcilePayments,
} from './payments.controller';

const router = Router();

router.get('/vietqr-banks', getVietQRBanks);

router.use(authenticate);

// ================================
// TUITION PLAN ROUTES
// ================================

router.post(
  '/plans',
  requirePermission('tuition.create'),
  validateRequest({ body: createTuitionPlanBodySchema }),
  createTuitionPlan
);

router.get(
  '/plans',
  requirePermission('tuition.read'),
  validateRequest({ query: queryTuitionPlanSchema }),
  getTuitionPlans
);

router.get(
  '/plans/:id',
  requirePermission('tuition.read'),
  validateRequest({ params: tuitionPlanIdParamsSchema }),
  getTuitionPlanById
);

router.put(
  '/plans/:id',
  requirePermission('tuition.update'),
  validateRequest({ params: tuitionPlanIdParamsSchema, body: updateTuitionPlanBodySchema }),
  updateTuitionPlan
);

router.delete(
  '/plans/:id',
  requirePermission('tuition.delete'),
  validateRequest({ params: tuitionPlanIdParamsSchema }),
  deleteTuitionPlan
);

// ================================
// INVOICE ROUTES
// ================================

router.post(
  '/invoices',
  requirePermission('tuition.create'),
  validateRequest({ body: createInvoiceBodySchema }),
  createInvoice
);

router.post(
  '/invoices/generate',
  requirePermission('tuition.create'),
  validateRequest({ body: batchGenerateInvoicesBodySchema }),
  batchGenerateInvoices
);

router.post(
  '/invoices/generate-from-attendance',
  requirePermission('tuition.create'),
  validateRequest({ body: generateFromAttendanceBodySchema }),
  generateInvoicesFromAttendance
);

router.post(
  '/invoices/send-reminders',
  requirePermission('tuition.create'),
  validateRequest({ body: sendRemindersBodySchema }),
  sendDebtReminders
);

router.get(
  '/invoices',
  requirePermission('tuition.read'),
  validateRequest({ query: queryInvoiceSchema }),
  getInvoices
);

router.get(
  '/invoices/overdue',
  requirePermission('tuition.read'),
  getOverdueInvoices
);

router.get(
  '/invoices/:id/preview',
  requirePermission('tuition.read'),
  validateRequest({ params: invoiceIdParamsSchema, query: invoicePreviewQuerySchema }),
  previewInvoice
);

router.post(
  '/invoices/:id/share-zalo',
  requirePermission('tuition.create'),
  validateRequest({ params: invoiceIdParamsSchema }),
  shareInvoiceZalo
);

router.get(
  '/invoices/:id',
  requirePermission('tuition.read'),
  validateRequest({ params: invoiceIdParamsSchema }),
  getInvoiceById
);

router.put(
  '/invoices/:id',
  requirePermission('tuition.update'),
  validateRequest({ params: invoiceIdParamsSchema, body: updateInvoiceBodySchema }),
  updateInvoice
);

router.post(
  '/invoices/:id/issue',
  requirePermission('tuition.update'),
  validateRequest({ params: invoiceIdParamsSchema }),
  issueInvoice
);

router.post(
  '/invoices/:id/pay',
  requirePermission('payments.create'),
  validateRequest({ params: invoiceIdParamsSchema, body: recordPaymentBodySchema }),
  recordPayment
);

// ================================
// PAYMENT ROUTES
// ================================

router.get(
  '/',
  requirePermission('payments.read'),
  validateRequest({ query: queryPaymentSchema }),
  getPayments
);

router.get(
  '/history',
  requirePermission('payments.read'),
  validateRequest({ query: queryPaymentSchema }),
  getPaymentHistory
);

router.post(
  '/confirm',
  requirePermission('payments.create'),
  validateRequest({ body: confirmPaymentBodySchema }),
  confirmPayment
);

router.post(
  '/vietqr',
  requirePermission('payments.read'),
  validateRequest({ body: vietQRRequestBodySchema }),
  generateVietQR
);

router.post(
  '/reconcile',
  requirePermission('payments.create'),
  reconcilePayments
);

router.get(
  '/:id',
  requirePermission('payments.read'),
  validateRequest({ params: paymentIdParamsSchema }),
  getPaymentById
);

export default router;
