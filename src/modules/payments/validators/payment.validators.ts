import { z } from 'zod';
import { RECEIPT_THEMES } from '../services/receipt-themes.service';

// ================================
// TUITION PLAN VALIDATORS
// ================================

export const billingCycleEnum = z.enum(['monthly', 'quarterly', 'term', 'yearly']);

export const createTuitionPlanBodySchema = z.object({
  centerId: z.string().uuid('Invalid center ID'),
  classId: z.string().uuid('Invalid class ID').optional().nullable(),
  name: z.string().min(2).max(100),
  amount: z.number().positive().multipleOf(1000, 'Amount must be a multiple of 1,000'),
  currency: z.string().max(3).default('VND'),
  billingCycle: billingCycleEnum,
  dueDay: z.number().int().min(1).max(28),
  lateFee: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

export const updateTuitionPlanBodySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  amount: z.number().positive().multipleOf(1000).optional(),
  currency: z.string().max(3).optional(),
  billingCycle: billingCycleEnum.optional(),
  dueDay: z.number().int().min(1).max(28).optional(),
  lateFee: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const queryTuitionPlanSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  centerId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  sort: z.enum(['name', 'amount', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const tuitionPlanIdParamsSchema = z.object({
  id: z.string().uuid('Invalid tuition plan ID'),
});

// ================================
// INVOICE VALIDATORS
// ================================

export const invoiceStatusEnum = z.enum(['draft', 'issued', 'paid', 'overdue', 'cancelled']);

export const createInvoiceBodySchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  tuitionPlanId: z.string().uuid('Invalid tuition plan ID'),
  amount: z.number().positive().optional(),
  discount: z.number().nonnegative().default(0),
  issueDate: z
    .string()
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), 'Invalid issue date')
    .optional(),
  dueDate: z
    .string()
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), 'Invalid due date')
    .optional(),
  notes: z.string().max(500).optional(),
});

export const batchGenerateInvoicesBodySchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, 'At least one student is required'),
  tuitionPlanId: z.string().uuid('Invalid tuition plan ID'),
  billingDate: z
    .string()
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), 'Invalid billing date'),
  dueDay: z.number().int().min(1).max(28).optional(),
});

export const generateFromAttendanceBodySchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  tuitionPlanId: z.string().uuid('Invalid tuition plan ID'),
  periodStart: z.string().min(1, 'periodStart is required'),
  periodEnd: z.string().min(1, 'periodEnd is required'),
  prorated: z.boolean().optional().default(true),
  autoIssue: z.boolean().optional().default(false),
  dueDay: z.number().int().min(1).max(28).optional(),
});

export const sendRemindersBodySchema = z.object({
  centerId: z.string().uuid('Invalid center ID').optional(),
});

export const updateInvoiceBodySchema = z.object({
  discount: z.number().nonnegative().optional(),
  dueDate: z
    .string()
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), 'Invalid due date')
    .optional(),
  notes: z.string().max(500).optional(),
  status: invoiceStatusEnum.optional(),
});

export const queryInvoiceSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  centerId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  status: invoiceStatusEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  overdue: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sort: z.enum(['invoiceNumber', 'issueDate', 'dueDate', 'totalAmount', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const invoiceIdParamsSchema = z.object({
  id: z.string().uuid('Invalid invoice ID'),
});

export const invoicePreviewQuerySchema = z.object({
  theme: z.enum(RECEIPT_THEMES).optional().default('classic'),
  format: z.enum(['json', 'html']).optional().default('json'),
});

export const recordPaymentBodySchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'vietqr']),
  transactionId: z.string().max(100).optional(),
  transactionDate: z
    .string()
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), 'Invalid transaction date')
    .optional(),
  bankCode: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
});

// ================================
// PAYMENT VALIDATORS
// ================================

export const paymentMethodEnum = z.enum(['cash', 'bank_transfer', 'vietqr']);
export const paymentStatusEnum = z.enum(['pending', 'completed', 'failed']);

export const confirmPaymentBodySchema = z
  .object({
    paymentId: z.string().uuid('Invalid payment ID').optional(),
    invoiceId: z.string().uuid('Invalid invoice ID').optional(),
    transactionId: z.string().max(100).optional(),
    amount: z.number().positive('Amount must be positive'),
    paymentMethod: paymentMethodEnum,
    transactionDate: z
      .string()
      .transform((val) => new Date(val))
      .refine((date) => !isNaN(date.getTime()), 'Invalid transaction date')
      .optional(),
    bankCode: z.string().max(20).optional(),
  })
  .refine((data) => data.paymentId || data.invoiceId, {
    message: 'Either paymentId or invoiceId is required',
    path: ['paymentId'],
  });

export const queryPaymentSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  invoiceId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  status: paymentStatusEnum.optional(),
  paymentMethod: paymentMethodEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sort: z.enum(['transactionDate', 'amount', 'createdAt']).default('transactionDate'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const paymentIdParamsSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
});

export const vietQRRequestBodySchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amount: z.number().positive().optional(),
  description: z.string().max(100).optional(),
});

export const revenueQuerySchema = z.object({
  centerId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  period: z.enum(['day', 'week', 'month', 'year']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  view: z.enum(['summary', 'by_class', 'by_student', 'trend']).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export const revenueDrilldownQuerySchema = z.object({
  centerId: z.string().uuid().optional(),
  classId: z.string().uuid(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const periodReportQuerySchema = z.object({
  centerId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export const collectionMetricsSchema = z.object({
  centerId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
