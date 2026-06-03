export type RevenueViewMode = 'summary' | 'by_class' | 'by_student' | 'trend';

export interface RevenueReportData {
  view: RevenueViewMode;
  period: { startDate: string; endDate: string; year?: number; month?: number };
  totalRevenue: number;
  previousPeriod: number;
  growthRate: number;
  collectionRate: number;
  outstandingAmount: number;
  byClass: Array<{ classId: string; className: string; revenue: number }>;
  byStudent: Array<{
    studentId: string;
    studentName: string;
    revenue: number;
    paymentCount: number;
  }>;
  trend: Array<{ date: string; amount: number; label?: string }>;
}

export interface RevenueDrilldownData {
  classId: string;
  className: string;
  period: { startDate: string; endDate: string; year?: number; month?: number };
  totalRevenue: number;
  students: Array<{
    studentId: string;
    studentName: string;
    revenue: number;
    invoicesPaid: number;
    lastPaymentDate: string | null;
  }>;
}

export interface MonthlyReportData {
  type: 'monthly';
  year: number;
  month: number;
  summary: {
    totalRevenue: number;
    growthRate: number;
    collectionRate: number;
    totalStudents: number;
    newEnrollments: number;
    averageAttendance: number;
  };
  revenueByClass: Array<{ classId: string; className: string; revenue: number }>;
  trend: Array<{ date: string; amount: number }>;
}

export interface YearlyReportData {
  type: 'yearly';
  year: number;
  summary: {
    totalRevenue: number;
    growthRate: number;
    collectionRate: number;
    totalStudents: number;
    newEnrollments: number;
  };
  monthlyTrend: Array<{ month: number; label: string; amount: number }>;
  revenueByClass: Array<{ classId: string; className: string; revenue: number }>;
}
