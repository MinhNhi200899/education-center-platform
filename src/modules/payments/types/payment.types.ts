import { BillingCycle, InvoiceStatus, PaymentMethod, PaymentMethodStatus } from '@prisma/client';

// ================================
// TUITION PLAN TYPES
// ================================

export type BillingCycleType = 'monthly' | 'quarterly' | 'term' | 'yearly';

// Create tuition plan DTO
export interface CreateTuitionPlanDTO {
  centerId: string;
  classId?: string;
  name: string;
  amount: number;
  currency?: string;
  billingCycle: BillingCycleType;
  dueDay: number;
  lateFee?: number;
  notes?: string;
}

// Update tuition plan DTO
export interface UpdateTuitionPlanDTO {
  name?: string;
  amount?: number;
  currency?: string;
  billingCycle?: BillingCycleType;
  dueDay?: number;
  lateFee?: number;
  notes?: string;
  isActive?: boolean;
}

// Tuition plan response
export interface TuitionPlanResponse {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycleType;
  dueDay: number;
  lateFee: number | null;
  notes: string | null;
  isActive: boolean;
  centerId: string;
  classId: string | null;
  createdAt: Date;
  updatedAt: Date;
  center?: {
    id: string;
    name: string;
    code: string;
  };
  class?: {
    id: string;
    name: string;
  } | null;
}

// ================================
// INVOICE TYPES
// ================================

export type InvoiceStatusType = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';

// Create invoice DTO
export interface CreateInvoiceDTO {
  studentId: string;
  tuitionPlanId: string;
  amount?: number;
  discount?: number;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
}

// Batch generate invoices DTO
export interface BatchGenerateInvoicesDTO {
  studentIds: string[];
  tuitionPlanId: string;
  billingDate: string;
  dueDay?: number;
}

// Generate invoices from attendance DTO
export interface GenerateFromAttendanceDTO {
  classId: string;
  tuitionPlanId: string;
  periodStart: string;
  periodEnd: string;
  prorated?: boolean;
  autoIssue?: boolean;
  dueDay?: number;
}

export interface GenerateFromAttendanceResult {
  generated: number;
  skipped: number;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    studentId: string;
    studentName: string;
    sessionsAttended: number;
    totalSessions: number;
    amount: number;
  }>;
}

export interface SendRemindersResult {
  sent: number;
  skipped: number;
  notifications: Array<{ userId: string; invoiceNumber: string; studentName: string }>;
}

// Update invoice DTO
export interface UpdateInvoiceDTO {
  discount?: number;
  dueDate?: string;
  notes?: string;
  status?: InvoiceStatusType;
}

// Invoice response
export interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  amount: number;
  discount: number;
  totalAmount: number;
  status: InvoiceStatusType;
  issueDate: Date;
  dueDate: Date;
  paidDate: Date | null;
  paidAmount: number | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  centerId: string;
  studentId: string;
  tuitionPlanId: string;
  createdAt: Date;
  updatedAt: Date;
  student?: {
    id: string;
    fullName: string;
    center?: { id: string; name: string };
  };
  tuitionPlan?: TuitionPlanResponse;
  items?: InvoiceItemResponse[];
  payments?: PaymentResponse[];
}

// Invoice item response
export interface InvoiceItemResponse {
  id: string;
  description: string;
  quantity: number;
  amount: number;
  createdAt: Date;
}

// Invoice filters
export interface InvoiceFilters {
  centerId?: string;
  studentId?: string;
  status?: InvoiceStatusType;
  startDate?: string;
  endDate?: string;
  overdue?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ================================
// PAYMENT TYPES
// ================================

export type PaymentMethodType = 'cash' | 'bank_transfer' | 'vietqr';
export type PaymentStatusType = 'pending' | 'completed' | 'failed';

// Record payment DTO
export interface RecordPaymentDTO {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  transactionId?: string;
  transactionDate?: string;
  bankCode?: string;
  notes?: string;
}

// Confirm payment DTO
export interface ConfirmPaymentDTO {
  paymentId?: string;
  invoiceId?: string;
  transactionId?: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  transactionDate?: string;
  bankCode?: string;
}

// Payment response
export interface PaymentResponse {
  id: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  transactionId: string | null;
  transactionDate: Date;
  bankCode: string | null;
  qrCodeUrl: string | null;
  status: PaymentStatusType;
  confirmedBy: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  invoice?: {
    id: string;
    invoiceNumber: string;
    student?: { id: string; fullName: string };
  };
  confirmedByUser?: {
    id: string;
    fullName: string;
  };
}

// Payment filters
export interface PaymentFilters {
  invoiceId?: string;
  studentId?: string;
  status?: PaymentStatusType;
  paymentMethod?: PaymentMethodType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ================================
// VIETQR TYPES
// ================================

export interface VietQRRequest {
  invoiceId: string;
  amount?: number;
  description?: string;
}

export interface VietQRResponse {
  qrCode: string;
  qrCodeUrl: string;
  amount: number;
  receiverName: string;
  receiverBank: string;
  receiverAccount: string;
  description: string;
  expiresAt: Date;
}

// ================================
// REVENUE TYPES
// ================================

export type RevenueViewMode = 'summary' | 'by_class' | 'by_student' | 'trend';

export interface RevenueFilters {
  centerId?: string;
  classId?: string;
  period?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
  view?: RevenueViewMode;
  year?: number;
  month?: number;
}

export interface RevenueResponse {
  view: RevenueViewMode;
  period: { startDate: string; endDate: string; year?: number; month?: number };
  totalRevenue: number;
  previousPeriod: number;
  growthRate: number;
  collectionRate: number;
  outstandingAmount: number;
  byClass: Array<{ classId: string; className: string; revenue: number }>;
  byStudent: Array<{ studentId: string; studentName: string; revenue: number; paymentCount: number }>;
  trend: Array<{ date: string; amount: number; label?: string }>;
}

export interface RevenueDrilldownItem {
  studentId: string;
  studentName: string;
  revenue: number;
  invoicesPaid: number;
  lastPaymentDate: string | null;
}

export interface RevenueDrilldownResponse {
  classId: string;
  className: string;
  period: { startDate: string; endDate: string; year?: number; month?: number };
  totalRevenue: number;
  students: RevenueDrilldownItem[];
}

export interface PeriodReportSummary {
  totalRevenue: number;
  previousPeriodRevenue: number;
  growthRate: number;
  collectionRate: number;
  outstandingAmount: number;
  totalStudents: number;
  newEnrollments: number;
  averageAttendance: number;
  paidInvoices: number;
  issuedInvoices: number;
  overdueInvoices: number;
}

export interface MonthlyReportResponse {
  type: 'monthly';
  generatedAt: string;
  year: number;
  month: number;
  summary: PeriodReportSummary;
  sections: Array<{
    title: string;
    data: Array<{ label: string; value: number }>;
  }>;
  revenueByClass: Array<{ classId: string; className: string; revenue: number }>;
  trend: Array<{ date: string; amount: number }>;
}

export interface YearlyReportResponse {
  type: 'yearly';
  generatedAt: string;
  year: number;
  summary: PeriodReportSummary;
  sections: Array<{
    title: string;
    data: Array<{ label: string; value: number }>;
  }>;
  monthlyTrend: Array<{ month: number; label: string; amount: number }>;
  revenueByClass: Array<{ classId: string; className: string; revenue: number }>;
}

export interface CollectionMetrics {
  issuedInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  cancelledInvoices: number;
  totalIssued: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  averagePaymentTime: number;
  byStatus: {
    draft: number;
    issued: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
}

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  student: { id: string; fullName: string };
  totalAmount: number;
  dueDate: Date;
  daysOverdue: number;
  lateFee: number;
  totalWithLateFee: number;
}

// ================================
// PAGINATION & COMMON
// ================================

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tuition plan filters
export interface TuitionPlanFilters {
  centerId?: string;
  classId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Invoice item DTO for creating invoice with items
export interface CreateInvoiceItemDTO {
  description: string;
  quantity?: number;
  amount: number;
}

// Generate invoice items from tuition plan
export interface GenerateInvoiceItemsDTO {
  tuitionPlan: TuitionPlanResponse;
  billingMonth: string;
}