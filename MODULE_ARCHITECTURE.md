# Module Architecture Document
# Education Center Management Platform

**Document Version**: 1.0  
**Created**: 2026-06-03  
**Status**: Draft

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Module Structure](#2-module-structure)
3. [Module Specifications](#3-module-specifications)
4. [API Architecture](#4-api-architecture)
5. [Service Layer Design](#5-service-layer-design)
6. [Middleware Architecture](#6-middleware-architecture)
7. [Directory Structure](#7-directory-structure)
8. [Data Flow Diagrams](#8-data-flow-diagrams)

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  React SPA (Mantine UI)                                              │    │
│  │  ├── Authentication Pages                                           │    │
│  │  ├── Dashboard Views                                                 │    │
│  │  ├── Management Views (Students, Teachers, Classes)                   │    │
│  │  └── Parent Portal Views                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTPS + JWT
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY LAYER                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Nginx Reverse Proxy                                                │    │
│  │  ├── SSL Termination                                                │    │
│  │  ├── Rate Limiting                                                  │    │
│  │  └── Request Routing                                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API SERVER LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Express.js + TypeScript                                            │    │
│  │                                                                     │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │    │
│  │  │   Routes    │  │ Middleware  │  │  Services   │  │   Models  │  │    │
│  │  │  (Router)   │  │  (Auth/CORS)│  │  (Business) │  │  (Prisma) │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
          ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
          │    PostgreSQL     │ │      Redis       │ │   Cloudinary     │
          │   (Primary DB)    │ │  (Cache/Sessions)│ │   (File Storage) │
          └──────────────────┘ └──────────────────┘ └──────────────────┘
```

### 1.2 Module Organization

The platform is organized into **11 core modules**, each containing:

```
src/modules/{module-name}/
├── controllers/       # HTTP request handlers
├── routes/           # Route definitions
├── services/         # Business logic
├── validators/      # Request validation schemas
├── types/           # TypeScript types/interfaces
├── enums/           # Module-specific enums
└── index.ts         # Module exports
```

### 1.3 Module Dependencies

```
Authentication Module (AUTH)
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      Core Modules                                     │
│                                                                       │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│   │ Students │    │ Teachers │    │ Classes  │    │ Schedule │        │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘        │
│        │               │               │               │               │
│        └───────────────┴───────────────┼───────────────┘               │
│                                         │                               │
│                                         ▼                               │
│                              ┌──────────────┐                          │
│                              │   Sessions   │                          │
│                              └──────┬───────┘                          │
│                                     │                                  │
│                    ┌─────────────────┼─────────────────┐              │
│                    ▼                 ▼                 ▼              │
│             ┌────────────┐   ┌────────────┐   ┌────────────┐        │
│             │ Attendance │   │ Evaluation │   │   Tuition  │        │
│             └────────────┘   └────────────┘   └──────┬─────┘        │
│                                                     │                │
│                                                     ▼                │
│                                          ┌──────────────────┐        │
│                                          │    Payments      │        │
│                                          └──────────────────┘        │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────┐
                              │   Dashboard     │
                              └──────────────────┘
                                         │
                                         ▼
                              ┌──────────────────┐
                              │      RBAC        │
                              └──────────────────┘
```

---

## 2. Module Structure

### 2.1 Module Summary

| Module | Code | Description | Priority |
|--------|------|-------------|----------|
| Authentication | AUTH | User login, JWT, session management | P1 |
| Students | STUDENT | Student CRUD, enrollment, import/export | P1 |
| Teachers | TEACHER | Teacher profiles, assignments | P1 |
| Classes | CLASS | Class management, scheduling | P1 |
| Attendance | ATTENDANCE | Attendance marking, history, stats | P1 |
| Schedule | SCHEDULE | Session management, calendar views | P1 |
| Evaluations | EVAL | Student evaluations, reports | P1 |
| Tuition | TUITION | Tuition plans, invoices | P1 |
| Payments | PAYMENT | VietQR, payment tracking | P1 |
| Dashboard | DASHBOARD | Analytics, reporting | P1 |
| RBAC | RBAC | Roles, permissions, audit logs | P1 |

---

## 3. Module Specifications

### 3.1 Authentication Module (AUTH)

**Path:** `src/modules/auth/`

#### Controllers
```
AuthController
├── login(req, res)           # POST /api/auth/login
├── logout(req, res)           # POST /api/auth/logout
├── forgotPassword(req, res)   # POST /api/auth/forgot-password
├── resetPassword(req, res)   # POST /api/auth/reset-password
├── refreshToken(req, res)     # POST /api/auth/refresh
├── getMe(req, res)            # GET /api/auth/me
├── changePassword(req, res)   # PUT /api/auth/password
└── verifyEmail(req, res)      # POST /api/auth/verify-email
```

#### Services
```
AuthService
├── login(email, password)           # Authenticate user, return tokens
├── logout(userId, refreshToken)     # Invalidate session
├── forgotPassword(email)            # Generate reset token, send email
├── resetPassword(token, newPassword)# Reset password with token
├── refreshAccessToken(refreshToken) # Generate new access token
├── changePassword(userId, oldPwd, newPwd) # Change user password
├── verifyToken(token)              # Verify email/token
└── getUserById(userId)            # Get user details

JwtService
├── generateAccessToken(user)        # Generate 15-min JWT
├── generateRefreshToken(user)       # Generate 7-day refresh token
├── verifyAccessToken(token)        # Verify JWT
├── verifyRefreshToken(token)       # Verify refresh token
└── hashToken(token)               # SHA256 hash for storage

SessionService
├── createSession(userId, token, metadata) # Create session record
├── validateSession(token)          # Check session validity
├── invalidateSession(sessionId)    # Logout session
├── getUserSessions(userId)         # List active sessions
└── cleanupExpiredSessions()       # Remove expired sessions
```

#### Middleware
```
authMiddleware
├── authenticate           # Verify JWT, attach user to request
├── authorize(...roles)    # Check user has required role
├── optionalAuth           # Attach user if token present, else continue
└── rateLimitAuth         # Apply rate limiting to auth endpoints
```

#### Database Schema (Prisma)
```prisma
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  passwordHash    String
  centerId        String?
  status          UserStatus @default(active)
  // ... other fields
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  isRevoked Boolean  @default(false)
  // ... other fields
}
```

#### Routes
```typescript
// src/modules/auth/routes/auth.routes.ts
router.post('/login', authValidator.login, authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authValidator.forgotPassword, authController.forgotPassword);
router.post('/reset-password', authValidator.resetPassword, authController.resetPassword);
router.post('/refresh', authValidator.refresh, authController.refreshToken);
router.get('/me', authenticate, authController.getMe);
router.put('/password', authenticate, authValidator.changePassword, authController.changePassword);
```

---

### 3.2 Students Module (STUDENT)

**Path:** `src/modules/students/`

#### Controllers
```
StudentController
├── getStudents(req, res)              # GET /api/students
├── createStudent(req, res)            # POST /api/students
├── getStudent(req, res)               # GET /api/students/:id
├── updateStudent(req, res)            # PUT /api/students/:id
├── archiveStudent(req, res)           # DELETE /api/students/:id
├── getStudentEnrollments(req, res)   # GET /api/students/:id/enrollments
├── getStudentAttendance(req, res)    # GET /api/students/:id/attendance
├── getStudentInvoices(req, res)       # GET /api/students/:id/invoices
├── getStudentEvaluations(req, res)   # GET /api/students/:id/evaluations
├── importStudents(req, res)           # POST /api/students/import
└── exportStudents(req, res)           # GET /api/students/export
```

#### Services
```
StudentService
├── getStudents(centerId, filters, pagination) # List students
├── createStudent(centerId, data)              # Create student
├── getStudentById(id)                         # Get student details
├── updateStudent(id, data)                    # Update student
├── archiveStudent(id)                         # Soft delete student
├── searchStudents(centerId, query)           # Search students
├── importFromExcel(centerId, file)          # Bulk import
└── exportToExcel(centerId, filters)         # Export data

EnrollmentService
├── enrollStudent(studentId, classId, data)   # Enroll in class
├── unenrollStudent(studentId, classId)      # Remove enrollment
├── getStudentEnrollments(studentId)          # List enrollments
├── transferStudent(studentId, fromClass, toClass) # Transfer
└── getEnrollmentStats(studentId)            # Enrollment statistics

ParentService
├── addParent(studentId, parentData)          # Add parent/guardian
├── updateParent(parentId, data)              # Update parent
├── removeParent(parentId)                    # Remove parent
├── getStudentParents(studentId)              # List parents
└── setPrimaryParent(studentId, parentId)     # Set primary contact
```

#### Validators
```typescript
// src/modules/students/validators/student.validators.ts
const createStudentSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100),
    dateOfBirth: z.date(),
    gender: z.enum(['male', 'female', 'other']),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().max(500).optional(),
    enrollmentDate: z.date(),
    notes: z.string().max(2000).optional(),
  }),
});

const updateStudentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createStudentSchema.shape.body.partial(),
});
```

#### Routes
```typescript
// src/modules/students/routes/student.routes.ts
router.get('/', authenticate, authorize('students', 'read'), studentController.getStudents);
router.post('/', authenticate, authorize('students', 'create'), studentValidator.create, studentController.createStudent);
router.get('/:id', authenticate, authorize('students', 'read'), studentController.getStudent);
router.put('/:id', authenticate, authorize('students', 'update'), studentValidator.update, studentController.updateStudent);
router.delete('/:id', authenticate, authorize('students', 'delete'), studentController.archiveStudent);
router.get('/:id/enrollments', authenticate, studentController.getStudentEnrollments);
router.get('/:id/attendance', authenticate, studentController.getStudentAttendance);
router.get('/:id/invoices', authenticate, studentController.getStudentInvoices);
router.get('/:id/evaluations', authenticate, studentController.getStudentEvaluations);
router.post('/import', authenticate, authorize('students', 'create'), upload.single('file'), studentController.importStudents);
router.get('/export', authenticate, authorize('students', 'export'), studentController.exportStudents);
```

---

### 3.3 Teachers Module (TEACHER)

**Path:** `src/modules/teachers/`

#### Controllers
```
TeacherController
├── getTeachers(req, res)               # GET /api/teachers
├── createTeacher(req, res)             # POST /api/teachers
├── getTeacher(req, res)                # GET /api/teachers/:id
├── updateTeacher(req, res)             # PUT /api/teachers/:id
├── archiveTeacher(req, res)            # DELETE /api/teachers/:id
├── getTeacherAssignments(req, res)    # GET /api/teachers/:id/assignments
├── getTeacherSchedule(req, res)       # GET /api/teachers/:id/schedule
├── importTeachers(req, res)           # POST /api/teachers/import
└── exportTeachers(req, res)           # GET /api/teachers/export
```

#### Services
```
TeacherService
├── getTeachers(centerId, filters)     # List teachers
├── createTeacher(centerId, data)     # Create teacher
├── getTeacherById(id)                # Get teacher details
├── updateTeacher(id, data)           # Update teacher
├── archiveTeacher(id)                 # Archive teacher
├── setAvailability(teacherId, schedule) # Set weekly availability
├── getTeachingHistory(teacherId)      # Past classes taught
└── importFromExcel(centerId, file)  # Bulk import
└── exportToExcel(centerId, filters) # Export data

AssignmentService
├── assignTeacher(classId, teacherId, role) # Assign to class
├── removeAssignment(classId, teacherId)    # Remove from class
├── getClassTeachers(classId)         # List class teachers
├── getTeacherClasses(teacherId)      # List teacher assignments
├── swapTeacher(classId, oldTeacherId, newTeacherId) # Substitute
└── getSubstituteTeachers(classId, date) # Available substitutes
```

---

### 3.4 Classes Module (CLASS)

**Path:** `src/modules/classes/`

#### Controllers
```
ClassController
├── getClasses(req, res)               # GET /api/classes
├── createClass(req, res)              # POST /api/classes
├── getClass(req, res)                 # GET /api/classes/:id
├── updateClass(req, res)              # PUT /api/classes/:id
├── archiveClass(req, res)             # DELETE /api/classes/:id
├── enrollStudents(req, res)          # POST /api/classes/:id/students
├── removeStudent(req, res)           # DELETE /api/classes/:id/students/:studentId
├── assignTeachers(req, res)          # POST /api/classes/:id/teachers
├── getClassSessions(req, res)        # GET /api/classes/:id/sessions
└── getClassStats(req, res)           # GET /api/classes/:id/stats
```

#### Services
```
ClassService
├── getClasses(centerId, filters)     # List classes
├── createClass(centerId, data)       # Create class
├── getClassById(id)                  # Get class details
├── updateClass(id, data)             # Update class
├── archiveClass(id)                  # Archive class
├── updateSchedule(classId, schedule) # Update weekly schedule
├── checkCapacity(classId)            # Check available slots
└── getClassStats(classId)           # Class statistics

ScheduleService
├── validateSchedule(classId, schedule) # Check for conflicts
├── detectConflicts(classId, schedule) # Find overlapping sessions
├── generateSessions(classId, startDate, endDate) # Generate sessions
└── updateSessionTime(classId, sessionId, newTime) # Reschedule
```

---

### 3.5 Attendance Module (ATTENDANCE)

**Path:** `src/modules/attendance/`

#### Controllers
```
AttendanceController
├── getAttendance(req, res)           # GET /api/attendance
├── markSessionAttendance(req, res)  # POST /api/attendance/session
├── bulkMarkAttendance(req, res)     # POST /api/attendance/bulk
├── getStudentAttendance(req, res)   # GET /api/attendance/student/:id
├── getClassAttendance(req, res)     # GET /api/attendance/class/:id
├── updateAttendance(req, res)       # PUT /api/attendance/:id
├── approveAbsence(req, res)         # POST /api/attendance/:id/approve
└── getAttendanceStats(req, res)     # GET /api/attendance/stats
```

#### Services
```
AttendanceService
├── markAttendance(sessionId, records) # Mark attendance for session
├── bulkMarkAttendance(records)        # Bulk mark multiple
├── updateAttendance(id, data)         # Update record
├── approveAbsence(id, approverId)     # Approve excused absence
├── getStudentAttendance(studentId, dateRange) # Student history
├── getClassAttendance(classId, dateRange)   # Class history
├── getAttendanceStats(studentId)     # Student statistics
└── notifyParents(absentStudentIds)   # Send notifications

ReasonService
├── getAbsenceReasons(centerId)       # List available reasons
├── createReason(centerId, data)      # Custom reason
└── archiveReason(id)                 # Deactivate reason
```

---

### 3.6 Schedule Module (SCHEDULE)

**Path:** `src/modules/schedule/`

#### Controllers
```
ScheduleController
├── getWeeklySchedule(req, res)       # GET /api/schedule/weekly
├── getMonthlySchedule(req, res)      # GET /api/schedule/monthly
├── getTeacherSchedule(req, res)     # GET /api/schedule/teacher/:id
├── createSession(req, res)           # POST /api/sessions
├── updateSession(req, res)           # PUT /api/sessions/:id
├── addSessionNotes(req, res)         # POST /api/sessions/:id/notes
├── uploadMaterials(req, res)         # POST /api/sessions/:id/materials
└── cancelSession(req, res)           # POST /api/sessions/:id/cancel
```

#### Services
```
ScheduleService
├── getWeeklySchedule(centerId, week, teacherId) # Weekly view
├── getMonthlySchedule(centerId, month, teacherId) # Monthly view
├── getTeacherSchedule(teacherId, dateRange)   # Teacher calendar
├── getClassSchedule(classId, dateRange)        # Class calendar
├── createSession(data)               # Create teaching session
├── updateSession(id, data)           # Update session
├── recordNotes(sessionId, teacherId, notes) # Lesson notes
└── detectConflicts(sessionId)         # Check conflicts

MaterialService
├── uploadMaterial(sessionId, file, uploadedBy) # Upload file
├── deleteMaterial(materialId)         # Remove material
├── getSessionMaterials(sessionId)    # List materials
└── generateDriveLink(materialId)     # Generate Google Drive link
```

---

### 3.7 Evaluations Module (EVAL)

**Path:** `src/modules/evaluations/`

#### Controllers
```
EvaluationController
├── getEvaluations(req, res)          # GET /api/evaluations
├── createEvaluation(req, res)        # POST /api/evaluations
├── getEvaluation(req, res)           # GET /api/evaluations/:id
├── updateEvaluation(req, res)        # PUT /api/evaluations/:id
├── getStudentEvaluations(req, res)   # GET /api/evaluations/student/:id
├── getClassEvaluations(req, res)     # GET /api/evaluations/class/:id
├── generateReport(req, res)         # GET /api/evaluations/:id/report
└── exportEvaluations(req, res)       # GET /api/evaluations/export
```

#### Services
```
EvaluationService
├── createEvaluation(data)           # Create evaluation
├── updateEvaluation(id, data)      # Update evaluation
├── getStudentEvaluations(studentId, type, dateRange) # Student history
├── getClassEvaluations(classId, dateRange) # Class evaluations
├── getProgressReport(studentId)     # Generate progress report
├── exportToPDF(evaluationId)        # Generate printable report
└── calculateAverageScores(studentId) # Compute averages

TemplateService
├── getTemplates(classId)            # Class evaluation templates
├── createTemplate(data)            # Create template
├── updateTemplate(id, data)        # Update template
└── applyTemplate(classId, templateId) # Apply to class
```

---

### 3.8 Tuition Module (TUITION)

**Path:** `src/modules/tuition/`

#### Controllers
```
TuitionController
├── getTuitionPlans(req, res)         # GET /api/tuition/plans
├── createTuitionPlan(req, res)       # POST /api/tuition/plans
├── updateTuitionPlan(req, res)      # PUT /api/tuition/plans/:id
├── getInvoices(req, res)             # GET /api/tuition/invoices
├── createInvoice(req, res)           # POST /api/tuition/invoices
├── getInvoice(req, res)              # GET /api/tuition/invoices/:id
├── updateInvoice(req, res)           # PUT /api/tuition/invoices/:id
├── recordPayment(req, res)           # POST /api/tuition/invoices/:id/pay
└── getOverdueInvoices(req, res)     # GET /api/tuition/invoices/overdue
```

#### Services
```
TuitionPlanService
├── getTuitionPlans(centerId, classId) # List plans
├── createTuitionPlan(centerId, data)  # Create plan
├── updateTuitionPlan(id, data)        # Update plan
├── activatePlan(id)                   # Enable plan
├── deactivatePlan(id)                  # Disable plan
└── calculateAmount(planId, billingCycle) # Compute fee

InvoiceService
├── generateInvoices(studentIds, planId, billingDate) # Batch generate
├── createInvoice(data)               # Single invoice
├── updateInvoice(id, data)           # Update invoice
├── voidInvoice(id)                   # Cancel invoice
├── calculateDueAmount(invoiceId)     # Outstanding amount
├── markAsPaid(invoiceId, paymentData) # Record payment
├── getOverdueInvoices(centerId)     # Past due invoices
└── sendReminders(invoiceIds)         # Payment reminders

DiscountService
├── applyDiscount(invoiceId, discount) # Apply discount
├── removeDiscount(invoiceId)          # Remove discount
├── getDiscountHistory(studentId)      # Student discounts
└── validateDiscount(code, studentId)  # Check validity
```

---

### 3.9 Payments Module (PAYMENT)

**Path:** `src/modules/payments/`

#### Controllers
```
PaymentController
├── generateVietQR(req, res)          # POST /api/payments/vietqr
├── confirmPayment(req, res)          # POST /api/payments/confirm
├── getPaymentHistory(req, res)       # GET /api/payments/history
├── getPaymentDetails(req, res)       # GET /api/payments/:id
├── triggerReconciliation(req, res)   # POST /api/payments/reconcile
└── refundPayment(req, res)           # POST /api/payments/:id/refund
```

#### Services
```
VietQRService
├── generateQRCode(invoiceId, amount) # Generate VietQR
├── getBankList()                       # List supported banks
├── getAccountInfo(centerId)            # Center bank details
└── validateQRData(qrData)             # Validate QR content

PaymentService
├── recordPayment(invoiceId, data)    # Record payment
├── confirmPayment(paymentId, adminId) # Admin confirmation
├── rejectPayment(paymentId, reason)  # Reject payment
├── getPaymentHistory(invoiceId)      # Payment records
├── reconcilePayments(centerId, date) # Auto-reconcile
└── processRefund(paymentId, amount)  # Process refund

ReconciliationService
├── matchTransactions(bankCode, dateRange) # Match with bank
├── generateReconciliationReport(centerId, period) # Report
├── autoReconcile()                    # Scheduled reconciliation
└── notifyReconciliationResults(results) # Send notifications
```

---

### 3.10 Dashboard Module (DASHBOARD)

**Path:** `src/modules/dashboard/`

#### Controllers
```
DashboardController
├── getRevenueOverview(req, res)      # GET /api/dashboard/revenue
├── getStudentMetrics(req, res)      # GET /api/dashboard/students
├── getAttendanceMetrics(req, res)  # GET /api/dashboard/attendance
├── getCollectionMetrics(req, res)   # GET /api/dashboard/collections
├── getMonthlyReport(req, res)       # GET /api/reports/monthly
├── getYearlyReport(req, res)        # GET /api/reports/yearly
├── exportReportPDF(req, res)        # GET /api/reports/export/pdf
└── exportReportExcel(req, res)      # GET /api/reports/export/excel
```

#### Services
```
RevenueService
├── getRevenueOverview(centerId, period) # Revenue metrics
├── getRevenueTrend(centerId, period)   # Time series data
├── getRevenueByClass(centerId, period) # Breakdown by class
├── getRevenueByDay(centerId, startDate, endDate) # Daily revenue
└── forecastRevenue(centerId, months)   # Revenue forecast

StudentMetricsService
├── getActiveStudentCount(centerId, date) # Current enrollment
├── getNewStudents(centerId, period)     # New enrollments
├── getStudentGrowth(centerId, period)   # Growth trend
├── getStudentByClass(centerId)         # Class distribution
└── getStudentDropoutRate(centerId, period) # Attrition

AttendanceMetricsService
├── getAttendanceRate(classId, period)  # Attendance %
├── getAttendanceTrend(studentId, period) # Student trend
├── getAbsentDays(classId, period)      # Absence days
└── getLateArrivals(classId, period)    # Late count

CollectionService
├── getCollectionRate(centerId, period) # Collection %
├── getOutstandingAmount(centerId)      # Total overdue
├── getInvoicesByStatus(centerId)      # Status breakdown
└── getCollectionTrend(centerId, period) # Trend over time

ReportService
├── generateMonthlyReport(centerId, month, year) # Monthly
├── generateYearlyReport(centerId, year)         # Yearly
├── exportToPDF(reportData, format)             # PDF export
├── exportToExcel(reportData, format)            # Excel export
└── sendReportEmail(reportId, recipients)        # Email report
```

---

### 3.11 RBAC Module (RBAC)

**Path:** `src/modules/rbac/`

#### Controllers
```
RbacController
├── getRoles(req, res)                # GET /api/roles
├── createRole(req, res)              # POST /api/roles
├── getRole(req, res)                  # GET /api/roles/:id
├── updateRole(req, res)               # PUT /api/roles/:id
├── deleteRole(req, res)               # DELETE /api/roles/:id
├── getPermissions(req, res)          # GET /api/permissions
├── assignPermissions(req, res)       # PUT /api/roles/:id/permissions
├── getUserRoles(req, res)             # GET /api/users/:id/roles
├── assignUserRole(req, res)          # POST /api/users/:id/roles
└── getAuditLogs(req, res)            # GET /api/audit-logs
```

#### Services
```
RoleService
├── getRoles(centerId)                # List roles
├── createRole(data)                  # Create role
├── updateRole(id, data)              # Update role
├── deleteRole(id)                     # Delete role (non-system only)
├── getRolePermissions(roleId)        # Role permissions
└── cloneRole(sourceId, newName)      # Clone role

PermissionService
├── getPermissions(module)            # List by module
├── getPermissionMatrix()             # Full matrix
├── assignPermissions(roleId, permissionIds) # Assign
├── revokePermission(roleId, permissionId)  # Revoke
└── checkPermission(userId, module, action) # Check user permission

AuditService
├── logAction(userId, action, resource, resourceId, changes) # Log
├── getAuditLogs(filters)             # Query logs
├── getResourceHistory(resourceType, resourceId) # Resource changes
└── exportAuditLogs(filters, format)  # Export logs
```

---

## 4. API Architecture

### 4.1 API Response Format

**Success Response:**
```typescript
// Single item
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-06-03T10:30:00Z"
  }
}

// Paginated list
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "timestamp": "2026-06-03T10:30:00Z"
  }
}
```

**Error Response:**
```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "dateOfBirth", "message": "Must be a valid date" }
    ],
    "timestamp": "2026-06-03T10:30:00Z"
  }
}
```

### 4.2 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (no permission) |
| 404 | Not Found |
| 409 | Conflict (duplicate, etc.) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

### 4.3 API Versioning

```
/api/v1/auth/login
/api/v1/students
/api/v1/classes/:id/sessions
```

Current version: **v1**

---

## 5. Service Layer Design

### 5.1 Service Pattern

```typescript
// src/modules/students/services/student.service.ts
export class StudentService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter,
    private cacheService: CacheService
  ) {}

  async getStudents(centerId: string, filters: StudentFilters, pagination: Pagination) {
    // Check cache first
    const cacheKey = `students:${centerId}:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Build query
    const where = this.buildWhereClause(centerId, filters);
    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          parents: true,
          enrollments: { where: { status: 'active' } },
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.student.count({ where }),
    ]);

    const result = { data, meta: { page: pagination.page, limit: pagination.limit, total } };

    // Cache result
    await this.cacheService.set(cacheKey, result, 300); // 5 minutes

    return result;
  }

  async createStudent(centerId: string, data: CreateStudentDTO) {
    // Validate center exists
    await this.validateCenter(centerId);

    // Check duplicate
    await this.checkDuplicate(centerId, data.fullName, data.dateOfBirth);

    // Create student
    const student = await this.prisma.student.create({
      data: {
        centerId,
        ...data,
      },
    });

    // Emit event
    this.eventEmitter.emit('student.created', { studentId: student.id, centerId });

    // Invalidate cache
    await this.cacheService.invalidate(`students:${centerId}:*`);

    return student;
  }

  private async validateCenter(centerId: string) {
    const center = await this.prisma.center.findUnique({ where: { id: centerId } });
    if (!center) throw new NotFoundException('Center not found');
    return center;
  }

  private async checkDuplicate(centerId: string, fullName: string, dob: Date) {
    const existing = await this.prisma.student.findFirst({
      where: { centerId, fullName, dateOfBirth: dob },
    });
    if (existing) throw new ConflictException('Student already exists');
  }

  private buildWhereClause(centerId: string, filters: StudentFilters) {
    const where: Prisma.StudentWhereInput = { centerId };

    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }
    if (filters.gender) where.gender = filters.gender;
    if (filters.enrollmentDateFrom) {
      where.enrollmentDate = { ...where.enrollmentDate, gte: filters.enrollmentDateFrom };
    }
    if (filters.enrollmentDateTo) {
      where.enrollmentDate = { ...where.enrollmentDate, lte: filters.enrollmentDateTo };
    }

    return where;
  }
}
```

### 5.2 Transaction Pattern

```typescript
async enrollStudent(studentId: string, classId: string, data: EnrollmentDTO) {
  return this.prisma.$transaction(async (tx) => {
    // Check student exists and is active
    const student = await tx.student.findUnique({ where: { id: studentId } });
    if (!student || student.status !== 'active') {
      throw new BadRequestException('Invalid or inactive student');
    }

    // Check class exists and has capacity
    const classRecord = await tx.class.findUnique({ where: { id: classId } });
    if (!classRecord) throw new NotFoundException('Class not found');

    const currentEnrollment = await tx.enrollment.count({
      where: { classId, status: 'active' },
    });
    if (currentEnrollment >= classRecord.capacity) {
      throw new BadRequestException('Class is at full capacity');
    }

    // Check not already enrolled
    const existing = await tx.enrollment.findUnique({
      where: { studentId_classId: { studentId, classId } },
    });
    if (existing && existing.status === 'active') {
      throw new ConflictException('Student is already enrolled');
    }

    // Create enrollment
    const enrollment = await tx.enrollment.create({
      data: {
        studentId,
        classId,
        startDate: data.startDate || new Date(),
        status: 'active',
      },
    });

    // Update class enrollment count (for real-time capacity tracking)
    await tx.class.update({
      where: { id: classId },
      data: { currentEnrollment: { increment: 1 } },
    });

    return enrollment;
  });
}
```

---

## 6. Middleware Architecture

### 6.1 Middleware Stack

```
Request Flow:
─────────────────────────────────────────────────────────────────►

1. cors()              - CORS headers
2. helmet()            - Security headers
3. compress()          - Gzip compression
4. bodyParser()        - Parse JSON body
5. rateLimit()          - Rate limiting
6. authenticate        - JWT verification
7. authorize           - Permission check
8. validate            - Request validation
9. auditLog            - Log request
10. controller         - Handle request
```

### 6.2 Middleware Implementation

```typescript
// src/middleware/authenticate.ts
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    const token = authHeader.substring(7);
    const decoded = jwtService.verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: { role: { include: { permissions: true } } },
        },
        center: true,
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive or locked');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
      });
    }
    next(error);
  }
};

// src/middleware/authorize.ts
export const authorize = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;

    // Super admin has all permissions
    if (user.userRoles.some(ur => ur.role.name === 'super_admin')) {
      return next();
    }

    // Check permission
    const hasPermission = user.userRoles.some(ur => {
      const centerId = user.centerId;
      if (ur.centerId && ur.centerId !== centerId) return false;

      return ur.role.permissions.some(p => {
        const [permModule, permAction] = p.name.split('.');
        return permModule === module && p.level >= getLevel(action);
      });
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    next();
  };
};

function getLevel(action: string): number {
  const levels: Record<string, number> = {
    read: 1, create: 2, update: 3, delete: 4, export: 5,
  };
  return levels[action] || 0;
}
```

---

## 7. Directory Structure

```
src/
├── app.ts                          # Express app setup
├── server.ts                       # Server entry point
├── config/
│   ├── database.ts                 # Prisma configuration
│   ├── redis.ts                    # Redis configuration
│   └── cloudinary.ts              # Cloudinary configuration
│
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   ├── validators/
│   │   │   ├── login.schema.ts
│   │   │   └── password.schema.ts
│   │   ├── middleware/
│   │   │   ├── authenticate.ts
│   │   │   └── authorize.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts
│   │
│   ├── students/
│   │   ├── students.controller.ts
│   │   ├── students.service.ts
│   │   ├── students.routes.ts
│   │   ├── services/
│   │   │   ├── enrollment.service.ts
│   │   │   └── parent.service.ts
│   │   ├── validators/
│   │   │   ├── create-student.schema.ts
│   │   │   └── update-student.schema.ts
│   │   └── index.ts
│   │
│   ├── teachers/
│   │   ├── teachers.controller.ts
│   │   ├── teachers.service.ts
│   │   ├── teachers.routes.ts
│   │   ├── services/
│   │   │   └── assignment.service.ts
│   │   └── index.ts
│   │
│   ├── classes/
│   │   ├── classes.controller.ts
│   │   ├── classes.service.ts
│   │   ├── classes.routes.ts
│   │   ├── services/
│   │   │   └── schedule.service.ts
│   │   └── index.ts
│   │
│   ├── attendance/
│   │   ├── attendance.controller.ts
│   │   ├── attendance.service.ts
│   │   ├── attendance.routes.ts
│   │   ├── services/
│   │   │   └── reason.service.ts
│   │   └── index.ts
│   │
│   ├── schedule/
│   │   ├── schedule.controller.ts
│   │   ├── schedule.service.ts
│   │   ├── schedule.routes.ts
│   │   ├── services/
│   │   │   └── material.service.ts
│   │   └── index.ts
│   │
│   ├── evaluations/
│   │   ├── evaluations.controller.ts
│   │   ├── evaluations.service.ts
│   │   ├── evaluations.routes.ts
│   │   ├── services/
│   │   │   └── template.service.ts
│   │   └── index.ts
│   │
│   ├── tuition/
│   │   ├── tuition.controller.ts
│   │   ├── tuition.service.ts
│   │   ├── tuition.routes.ts
│   │   ├── services/
│   │   │   ├── invoice.service.ts
│   │   │   └── discount.service.ts
│   │   └── index.ts
│   │
│   ├── payments/
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   ├── payments.routes.ts
│   │   ├── services/
│   │   │   ├── vietqr.service.ts
│   │   │   └── reconciliation.service.ts
│   │   └── index.ts
│   │
│   ├── dashboard/
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.service.ts
│   │   ├── dashboard.routes.ts
│   │   ├── services/
│   │   │   ├── revenue.service.ts
│   │   │   ├── student-metrics.service.ts
│   │   │   └── report.service.ts
│   │   └── index.ts
│   │
│   └── rbac/
│       ├── rbac.controller.ts
│       ├── rbac.service.ts
│       ├── rbac.routes.ts
│       ├── services/
│       │   ├── role.service.ts
│       │   ├── permission.service.ts
│       │   └── audit.service.ts
│       └── index.ts
│
├── shared/
│   ├── services/
│   │   ├── prisma.service.ts
│   │   ├── cache.service.ts
│   │   ├── email.service.ts
│   │   ├── notification.service.ts
│   │   └── event-emitter.service.ts
│   │
│   ├── middleware/
│   │   ├── error-handler.ts
│   │   ├── validate-request.ts
│   │   ├── audit-log.ts
│   │   └── rate-limit.ts
│   │
│   ├── utils/
│   │   ├── async-handler.ts
│   │   ├── paginate.ts
│   │   └── validators.ts
│   │
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── pagination.types.ts
│   │   └── error.types.ts
│   │
│   └── constants/
│       ├── enums.ts
│       └── permissions.ts
│
├── routes/
│   └── index.ts                    # Main router
│
└── types/
    └── global.d.ts                 # Global type declarations
```

---

## 8. Data Flow Diagrams

### 8.1 Student Enrollment Flow

```
Parent/Admin                        API                          Services                    Database
    │                               │                              │                            │
    │  POST /api/students          │                              │                            │
    │─────────────────────────────►│                              │                            │
    │                               │  Validate Request            │                            │
    │                               │─────────────────────────────►│                            │
    │                               │                              │  Check duplicates         │
    │                               │                              │──────────────────────────►│
    │                               │                              │                            │
    │                               │                              │  Create Student           │
    │                               │                              │──────────────────────────►│
    │                               │                              │                            │
    │                               │  Emit student.created event │                            │
    │                               │◄─────────────────────────────│                            │
    │                               │                              │                            │
    │                               │                              │  Send welcome email       │
    │                               │                              │─────────► Email Service    │
    │                               │                              │                            │
    │  201 Created                  │                              │                            │
    │◄─────────────────────────────│                              │                            │
    │  { student: {...} }          │                              │                            │
```

### 8.2 Attendance Marking Flow

```
Teacher                            API                          Services                    Database
    │                               │                              │                            │
    │  POST /api/attendance/session │                              │                            │
    │  { sessionId, records[] }   │                              │                            │
    │─────────────────────────────►│                              │                            │
    │                               │  Validate teacher has session│                            │
    │                               │─────────────────────────────►│                            │
    │                               │                              │  Check assignment          │
    │                               │                              │──────────────────────────►│
    │                               │                              │                            │
    │                               │  Bulk insert attendance      │                            │
    │                               │─────────────────────────────►│                            │
    │                               │                              │  Insert records           │
    │                               │                              │──────────────────────────►│
    │                               │                              │                            │
    │                               │  Identify absent students    │                            │
    │                               │◄─────────────────────────────│                            │
    │                               │                              │                            │
    │                               │  Send notifications          │                            │
    │                               │                              │  Notify parents           │
    │                               │                              │─────────► Notification Svc │
    │                               │                              │                            │
    │  200 OK                       │                              │                            │
    │◄─────────────────────────────│                              │                            │
    │  { marked: 25, absent: 3 }   │                              │                            │
```

### 8.3 Tuition Payment Flow

```
Parent                            API                          Services                    Database
    │                               │                              │                            │
    │  POST /api/payments/vietqr   │                              │                            │
    │  { invoiceId }              │                              │                            │
    │─────────────────────────────►│                              │                            │
    │                               │  Get invoice details         │                            │
    │                               │─────────────────────────────►│                            │
    │                               │                              │  Find invoice             │
    │                               │                              │──────────────────────────►│
    │                               │                              │                            │
    │                               │  Generate VietQR             │                            │
    │                               │─────────────────────────────►│                            │
    │                               │                              │  Call VietQR API          │
    │                               │                              │─────────► VietQR Service   │
    │                               │                              │                            │
    │  200 OK                       │                              │                            │
    │◄─────────────────────────────│                              │                            │
    │  { qrCode: "...", amount }   │                              │                            │
    │                               │                              │                            │
    │  [Scans QR with banking app]  │                              │                            │
    │                               │                              │                            │
    │  POST /api/payments/confirm  │                              │                            │
    │  { invoiceId, transactionId }│                              │                            │
    │─────────────────────────────►│                              │                            │
    │                               │  Verify transaction          │                            │
    │                               │─────────────────────────────►│                            │
    │                               │                              │  Validate with bank        │
    │                               │                              │─────────► Bank API         │
    │                               │                              │                            │
    │                               │  Update invoice status      │                            │
    │                               │─────────────────────────────►│                            │
    │                               │                              │  Set paid, record payment │
    │                               │                              │──────────────────────────►│
    │                               │                              │                            │
    │                               │  Send confirmation           │                            │
    │                               │                              │  Notify via Zalo          │
    │                               │                              │─────────► Zalo Service     │
    │                               │                              │                            │
    │  200 OK                       │                              │                            │
    │◄─────────────────────────────│                              │                            │
    │  { status: 'paid', paidDate } │                              │                            │
```

---

## Appendix A: Module Dependencies Matrix

| Module | Depends On | Exports |
|--------|------------|--------|
| AUTH | - | AuthService, JwtService, SessionService |
| STUDENT | AUTH | StudentService, EnrollmentService, ParentService |
| TEACHER | AUTH | TeacherService, AssignmentService |
| CLASS | AUTH, TEACHER, STUDENT | ClassService, ScheduleService |
| ATTENDANCE | AUTH, CLASS, STUDENT | AttendanceService, ReasonService |
| SCHEDULE | AUTH, CLASS, TEACHER | ScheduleService, MaterialService |
| EVAL | AUTH, CLASS, STUDENT, TEACHER | EvaluationService, TemplateService |
| TUITION | AUTH, CLASS, STUDENT | TuitionPlanService, InvoiceService, DiscountService |
| PAYMENT | AUTH, TUITION | VietQRService, PaymentService, ReconciliationService |
| DASHBOARD | AUTH, STUDENT, TUITION, PAYMENT | RevenueService, StudentMetricsService, ReportService |
| RBAC | AUTH | RoleService, PermissionService, AuditService |

---

**Document End**