import { Request, Response } from 'express';
import { paymentService } from './services/payment.service';
import { fetchVietQRBanks } from '../../shared/services/vietqr-banks.service';
import { asyncHandler } from '../../shared/utils/async-handler';
import { logger } from '../../shared/services/logger.service';
import { assertCenterAccess, resolveScopedCenterId } from '../../shared/utils/center-scope';

// ================================
// TUITION PLAN CONTROLLERS
// ================================

/**
 * Create tuition plan
 * POST /api/v1/tuition/plans
 */
export const createTuitionPlan = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const plan = await paymentService.createTuitionPlan({
      ...req.body,
      centerId: resolveScopedCenterId(req, req.body.centerId),
    });
    res.status(201).json({
      success: true,
      data: plan,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get all tuition plans
 * GET /api/v1/tuition/plans
 */
export const getTuitionPlans = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters = {
      centerId: resolveScopedCenterId(req, req.query.centerId as string | undefined),
      classId: req.query.classId as string,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: (req.query.sort as string) || 'createdAt',
      order: (req.query.order as any) || 'desc',
    };

    const result = await paymentService.getAllTuitionPlans(filters);
    res.json({
      success: true,
      data: result.data,
      meta: { ...result.meta, timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get tuition plan by ID
 * GET /api/v1/tuition/plans/:id
 */
export const getTuitionPlanById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const plan = await paymentService.getTuitionPlanById(req.params.id);
    assertCenterAccess(req, plan.centerId);
    res.json({
      success: true,
      data: plan,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Update tuition plan
 * PUT /api/v1/tuition/plans/:id
 */
export const updateTuitionPlan = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await paymentService.getTuitionPlanById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    const plan = await paymentService.updateTuitionPlan(req.params.id, req.body);
    res.json({
      success: true,
      data: plan,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Delete tuition plan
 * DELETE /api/v1/tuition/plans/:id
 */
export const deleteTuitionPlan = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await paymentService.getTuitionPlanById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    const plan = await paymentService.deleteTuitionPlan(req.params.id);
    res.json({
      success: true,
      data: { message: 'Tuition plan deactivated', plan },
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

// ================================
// INVOICE CONTROLLERS
// ================================

/**
 * Create invoice
 * POST /api/v1/tuition/invoices
 */
export const createInvoice = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invoice = await paymentService.createInvoice(req.body);
    res.status(201).json({
      success: true,
      data: invoice,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Batch generate invoices
 * POST /api/v1/tuition/invoices/generate
 */
export const batchGenerateInvoices = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await paymentService.batchGenerateInvoices(req.body);
    res.status(201).json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Generate invoices from attendance
 * POST /api/v1/tuition/invoices/generate-from-attendance
 */
export const generateInvoicesFromAttendance = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await paymentService.generateInvoicesFromAttendance(req.body);
    res.status(201).json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Preview invoice with receipt theme
 * GET /api/v1/tuition/invoices/:id/preview?theme=...
 */
export const previewInvoice = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const theme = req.query.theme as string | undefined;
    const format = (req.query.format as string) || 'json';
    const result = await paymentService.previewInvoice(req.params.id, theme);

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(result.html);
      return;
    }

    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Share invoice via Zalo (stub)
 * POST /api/v1/tuition/invoices/:id/share-zalo
 */
export const shareInvoiceZalo = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    const result = await paymentService.shareInvoiceZalo(req.params.id, userId);
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Send debt reminders for overdue invoices
 * POST /api/v1/tuition/invoices/send-reminders
 */
export const sendDebtReminders = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const centerId = resolveScopedCenterId(req, req.body.centerId as string | undefined);
    const result = await paymentService.sendDebtReminders(centerId);
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get all invoices
 * GET /api/v1/tuition/invoices
 */
export const getInvoices = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters = {
      centerId: resolveScopedCenterId(req, req.query.centerId as string | undefined),
      studentId: req.query.studentId as string,
      status: req.query.status as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      overdue: req.query.overdue === 'true',
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: (req.query.sort as string) || 'createdAt',
      order: (req.query.order as any) || 'desc',
    };

    const result = await paymentService.getAllInvoices(filters);
    res.json({
      success: true,
      data: result.data,
      meta: { ...result.meta, timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get invoice by ID
 * GET /api/v1/tuition/invoices/:id
 */
export const getInvoiceById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invoice = await paymentService.getInvoiceById(req.params.id);
    assertCenterAccess(req, invoice.centerId);
    res.json({
      success: true,
      data: invoice,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Update invoice
 * PUT /api/v1/tuition/invoices/:id
 */
export const updateInvoice = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await paymentService.getInvoiceById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    const invoice = await paymentService.updateInvoice(req.params.id, req.body);
    res.json({
      success: true,
      data: invoice,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Issue invoice
 * POST /api/v1/tuition/invoices/:id/issue
 */
export const issueInvoice = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await paymentService.getInvoiceById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    const invoice = await paymentService.issueInvoice(req.params.id);
    res.json({
      success: true,
      data: invoice,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get overdue invoices
 * GET /api/v1/tuition/invoices/overdue
 */
export const getOverdueInvoices = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const centerId = resolveScopedCenterId(req, req.query.centerId as string | undefined);
    const result = await paymentService.getOverdueInvoices(centerId);
    res.json({
      success: true,
      data: result.data,
      meta: { ...result.meta, timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Record payment for invoice
 * POST /api/v1/tuition/invoices/:id/pay
 */
export const recordPayment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await paymentService.getInvoiceById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    const userId = (req as any).user?.id;
    const { amount, paymentMethod, transactionId, transactionDate, bankCode, notes } = req.body;

    const result = await paymentService.recordPayment(
      {
        invoiceId: req.params.id,
        amount,
        paymentMethod,
        transactionId,
        transactionDate,
        bankCode,
        notes,
      },
      userId
    );

    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

// ================================
// PAYMENT CONTROLLERS
// ================================

/**
 * Get payment by ID
 * GET /api/v1/payments/:id
 */
export const getPaymentById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const payment = await paymentService.getPaymentById(req.params.id);
    res.json({
      success: true,
      data: payment,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get all payments
 * GET /api/v1/payments
 */
export const getPayments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters = {
      invoiceId: req.query.invoiceId as string,
      studentId: req.query.studentId as string,
      status: req.query.status as any,
      paymentMethod: req.query.paymentMethod as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: (req.query.sort as string) || 'transactionDate',
      order: (req.query.order as any) || 'desc',
    };

    const result = await paymentService.getAllPayments(filters);
    res.json({
      success: true,
      data: result.data,
      meta: { ...result.meta, timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Confirm payment
 * POST /api/v1/payments/confirm
 */
export const confirmPayment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    const { paymentId, invoiceId, ...data } = req.body;

    const result = invoiceId && !paymentId
      ? await paymentService.quickConfirmInvoicePayment(invoiceId, { ...data, invoiceId }, userId)
      : await paymentService.confirmPayment(paymentId, data, userId);

    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get payment history
 * GET /api/v1/payments/history
 */
export const getPaymentHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters = {
      invoiceId: req.query.invoiceId as string,
      studentId: req.query.studentId as string,
      status: req.query.status as any,
      paymentMethod: req.query.paymentMethod as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: (req.query.sort as string) || 'transactionDate',
      order: (req.query.order as any) || 'desc',
    };

    const result = await paymentService.getAllPayments(filters);
    res.json({
      success: true,
      data: result.data,
      meta: { ...result.meta, timestamp: new Date().toISOString() },
    });
  }
);

// ================================
// VIETQR CONTROLLERS
// ================================

/**
 * List VietQR-supported banks (public reference data)
 * GET /api/v1/payments/vietqr-banks
 */
export const getVietQRBanks = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const banks = await fetchVietQRBanks();
    res.json({
      success: true,
      data: banks,
      meta: { count: banks.length, timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Generate VietQR code
 * POST /api/v1/payments/vietqr
 */
export const generateVietQR = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { invoiceId, amount, description } = req.body;
    const result = await paymentService.generateVietQR({ invoiceId, amount, description });
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

// ================================
// REVENUE & METRICS CONTROLLERS
// ================================

/**
 * Get revenue metrics
 * GET /api/v1/dashboard/revenue
 */
export const getRevenue = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters = {
      centerId: resolveScopedCenterId(req, req.query.centerId as string | undefined),
      classId: req.query.classId as string,
      period: req.query.period as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      view: (req.query.view as any) || 'summary',
      year: req.query.year ? Number(req.query.year) : undefined,
      month: req.query.month ? Number(req.query.month) : undefined,
    };

    const result = await paymentService.getRevenue(filters);
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get collection metrics
 * GET /api/v1/dashboard/collections
 */
export const getCollectionMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const centerId = resolveScopedCenterId(req, req.query.centerId as string | undefined);
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const result = await paymentService.getCollectionMetrics(centerId, startDate, endDate);
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Reconcile payments
 * POST /api/v1/payments/reconcile
 */
export const reconcilePayments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // In a real implementation, this would integrate with bank APIs
    // For now, return a placeholder
    res.json({
      success: true,
      data: {
        message: 'Reconciliation feature requires bank API integration',
        reconciled: 0,
        matched: 0,
        unmatched: 0,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }
);