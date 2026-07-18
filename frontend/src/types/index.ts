// User roles
export type UserRole = 'super_admin' | 'center_manager' | 'teacher' | 'parent' | 'student';

// User type
export interface User {
  id: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'locked';
  roles: UserRole[];
  studentId?: string | null;
  centerId?: string;
  center?: {
    id: string;
    name: string;
    code: string;
  };
}

// Auth response
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: User;
}

// Student
export interface Student {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  avatarUrl?: string;
  enrollmentDate: string;
  status: 'active' | 'inactive' | 'archived';
  notes?: string;
  loginPassword?: string | null;
  /** False when student has no portal User (offline / roster-only). */
  hasPortalAccess?: boolean;
  centerId: string;
  center?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
  currentEnrollment?: {
    id: string;
    class: {
      id: string;
      name: string;
    };
  };
  parents?: Parent[];
}

export interface CreateStudentResult extends Student {
  loginEmail?: string;
  initialPassword?: string;
}

// Parent
export interface Parent {
  id: string;
  fullName: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  phone: string;
  email?: string;
  occupation?: string;
  isPrimary: boolean;
}

// Teacher
export interface Teacher {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email: string;
  address?: string;
  qualification?: string;
  specialization?: string;
  hireDate: string;
  salary?: number;
  notes?: string;
  status: 'active' | 'inactive' | 'terminated';
  avatarUrl?: string;
  loginPassword?: string | null;
  centerId: string;
  center?: {
    id: string;
    name: string;
    code: string;
  };
  classes?: Array<{
    id: string;
    class: {
      id: string;
      name: string;
      academicLevel: string;
      status: string;
    };
    role: 'primary' | 'substitute';
    assignedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Class
export interface Class {
  id: string;
  name: string;
  description?: string;
  academicLevel: 'beginner' | 'intermediate' | 'advanced';
  capacity: number;
  currentEnrollment: number;
  status: 'active' | 'inactive' | 'completed' | 'archived';
  classroom?: string;
  schedule: WeeklySchedule;
  startDate: string;
  endDate?: string;
  notes?: string;
  centerId: string;
  center?: {
    id: string;
    name: string;
    code: string;
  };
  primaryTeacher?: {
    id: string;
    fullName: string;
  };
  teachers?: Array<{
    id: string;
    fullName: string;
    role: 'primary' | 'substitute';
  }>;
  students?: Array<{
    id: string;
    fullName: string;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Weekly Schedule
export interface ScheduleSlot {
  startTime: string;
  endTime: string;
  room?: string;
}

export interface WeeklySchedule {
  monday: ScheduleSlot[];
  tuesday: ScheduleSlot[];
  wednesday: ScheduleSlot[];
  thursday: ScheduleSlot[];
  friday: ScheduleSlot[];
  saturday: ScheduleSlot[];
  sunday: ScheduleSlot[];
}

// Session
export interface Session {
  id: string;
  classId: string;
  teacherId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  classroom?: string;
  sessionType: 'regular' | 'makeup' | 'trial';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  teacher?: {
    id: string;
    fullName: string;
  };
  class?: {
    id: string;
    name: string;
  };
  attendanceSummary?: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}

// Attendance
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  status: AttendanceStatus;
  reason?: string;
  recordedBy: string;
  recordedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  student?: {
    id: string;
    fullName: string;
  };
  session?: Session;
}

// Evaluation
export type EvaluationType = 'daily' | 'weekly' | 'monthly' | 'term';

export interface Evaluation {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string;
  evaluationType: EvaluationType;
  evaluationDate: string;
  participation?: number | null;
  homework?: number | null;
  behavior?: number | null;
  scores?: Record<string, number>;
  speakingScore?: number | null;
  writingScore?: number | null;
  comments?: string | null;
  teacher?: {
    id: string;
    fullName: string;
  };
  student?: {
    id: string;
    fullName: string;
  };
  class?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Tuition Plan
export interface TuitionPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'quarterly' | 'term' | 'yearly';
  dueDay: number;
  lateFee?: number;
  isActive: boolean;
  centerId: string;
  classId?: string;
  class?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

// Invoice
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  tuitionPlanId: string;
  amount: number;
  discount: number;
  totalAmount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  paymentMethod?: 'cash' | 'bank_transfer' | 'vietqr';
  student?: {
    id: string;
    fullName: string;
  };
  tuitionPlan?: TuitionPlan;
  payments?: Payment[];
}

// Payment
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'vietqr';
  transactionId?: string;
  transactionDate: string;
  bankCode?: string;
  qrCodeUrl?: string;
  status: PaymentStatus;
  confirmedBy?: string;
  confirmedAt?: string;
  invoice?: Invoice;
}

// Dashboard metrics
export interface RevenueMetrics {
  view?: 'summary' | 'by_class' | 'by_student' | 'trend';
  period: { startDate: string; endDate: string; year?: number; month?: number };
  totalRevenue: number;
  previousPeriod: number;
  growthRate: number;
  collectionRate: number;
  outstandingAmount: number;
  byClass: Array<{ classId?: string; className: string; revenue: number }>;
  byStudent?: Array<{
    studentId: string;
    studentName: string;
    revenue: number;
    paymentCount: number;
  }>;
  trend: Array<{ date: string; amount: number; label?: string }>;
}

export interface StudentMetrics {
  totalStudents: number;
  activeStudents: number;
  newEnrollments: number;
  withdrawnStudents: number;
  growthRate: number;
  byClass: Array<{ className: string; students: number }>;
  byStatus: { active: number; inactive: number; archived: number };
  trend: Array<{ date: string; total: number }>;
}

export interface AttendanceMetrics {
  averageAttendanceRate: number;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  byStatus: { present: number; absent: number; late: number; excused: number };
  problemStudents: Array<{ studentId: string; fullName: string; attendanceRate: number }>;
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
  byStatus: Record<InvoiceStatus, number>;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}