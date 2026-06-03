# Product Requirements Specification: Education Center Management Platform

**Document Version**: 1.0  
**Created**: 2026-06-03  
**Status**: Draft  
**Project Code**: ECMP

---

## Document Overview

This document defines the complete Product Requirements Specification for an Education Center Management Platform - a multi-tenant SaaS solution enabling education centers to efficiently manage students, teachers, classes, attendance, tuition collection, scheduling, and academic evaluations.

**Target Audience**: Education center operators, administrators, teachers, parents  
**Scope**: Full-stack SaaS platform with web frontend, REST API backend, and mobile-responsive interface

---

## 1. User Roles & Permissions

### 1.1 Role Hierarchy

| Role | Scope | Description |
|------|-------|-------------|
| Super Admin | Platform-wide | Manages all centers, subscriptions, system configuration |
| Center Manager | Single center | Manages day-to-day operations of one education center |
| Teacher | Assigned classes | Manages attendance, lessons, evaluations for assigned classes |
| Parent | Single student | Views attendance, invoices, progress for their child |

### 1.2 Super Admin Permissions

- View/manage all education centers
- Create/edit/delete center accounts
- Manage subscriptions and billing
- Access system-wide analytics and reports
- Configure platform-wide settings
- Manage user roles and permissions
- View audit logs across all centers

### 1.3 Center Manager Permissions

- Manage students within their center
- Manage teachers within their center
- Manage classes and schedules
- Process tuition and payments
- View center-specific reports and dashboards
- Assign granular permissions to teachers
- Manage classroom resources

### 1.4 Teacher Permissions

- View assigned classes and schedules
- Take and manage attendance
- Record lesson notes
- Upload learning materials
- Write student evaluations
- View teaching schedule
- Communicate with parents (via comments)

### 1.5 Parent Permissions

- View child's attendance history
- View tuition invoices and payment status
- View teacher evaluations and comments
- Receive notifications (attendance, payments, announcements)
- Update contact information

---

## 2. Core Modules Specification

### 2.1 Authentication & Authorization Module

**Module Code**: AUTH

#### Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| AUTH-001 | Login | Email/password authentication with JWT | P1 |
| AUTH-002 | Logout | Invalidate session and refresh tokens | P1 |
| AUTH-003 | Forgot Password | Email-based password reset with secure token | P1 |
| AUTH-004 | Change Password | Authenticated password update | P1 |
| AUTH-005 | Session Management | Track active sessions, support multiple devices | P1 |
| AUTH-006 | JWT Authentication | Access token with 15-minute expiry | P1 |
| AUTH-007 | Refresh Tokens | Rotating refresh tokens with 7-day expiry | P1 |
| AUTH-008 | Multi-role Support | Support for multiple roles per user | P1 |
| AUTH-009 | Role-based Redirect | Post-login redirect based on user role | P2 |
| AUTH-010 | Session Timeout | Auto-logout after 30 minutes of inactivity | P2 |

#### Security Requirements

- Passwords hashed using bcrypt (cost factor 12)
- JWT signed with HS256 using secret from environment
- Refresh tokens stored in database, revocable
- Rate limiting: 5 failed attempts = 15 minute lockout
- All endpoints require valid JWT except /auth/*
- Audit log for all authentication events

---

### 2.2 Student Management Module

**Module Code**: STUDENT

#### Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| STUDENT-001 | Create Student Profile | Add new student with complete information | P1 |
| STUDENT-002 | Edit Student Profile | Update student information | P1 |
| STUDENT-003 | Student Status | Activate/deactivate/archive student records | P1 |
| STUDENT-004 | Parent Information | Manage parent/guardian details and contacts | P1 |
| STUDENT-005 | Academic Information | Track grade level, enrollment date, special needs | P1 |
| STUDENT-006 | Enrollment History | Track all enrollments across classes | P1 |
| STUDENT-007 | Import Excel | Bulk import students from Excel template | P2 |
| STUDENT-008 | Export Excel | Export student list to Excel | P2 |
| STUDENT-009 | Search & Filter | Advanced search with multiple criteria | P1 |
| STUDENT-010 | Student Card | Generate student ID card with QR code | P3 |

#### Student Data Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| fullName | string | Yes | 2-100 characters |
| dateOfBirth | date | Yes | Must be valid date, age 3-25 |
| gender | enum | Yes | male, female, other |
| address | string | No | Max 500 characters |
| phone | string | No | Valid Vietnamese phone format |
| email | string | No | Valid email format |
| avatar | file | No | Max 2MB, image/* |
| status | enum | Yes | active, inactive, archived |
| enrollmentDate | date | Yes | Cannot be future |
| notes | text | No | Max 2000 characters |

#### Parent Data Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| fullName | string | Yes | 2-100 characters |
| relationship | enum | Yes | father, mother, guardian, other |
| phone | string | Yes | Valid Vietnamese phone |
| email | string | No | Valid email format |
| occupation | string | No | Max 100 characters |
| address | string | No | Max 500 characters |

---

### 2.3 Teacher Management Module

**Module Code**: TEACHER

#### Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| TEACHER-001 | Teacher Profiles | Create and manage teacher accounts | P1 |
| TEACHER-002 | Teaching Assignments | Assign teachers to classes | P1 |
| TEACHER-003 | Contract Information | Track employment contracts | P2 |
| TEACHER-004 | Salary Configuration | Define salary structure per teacher | P2 |
| TEACHER-005 | Teaching History | Track classes taught over time | P2 |
| TEACHER-006 | Import Excel | Bulk import teachers from template | P2 |
| TEACHER-007 | Export Excel | Export teacher list to Excel | P2 |
| TEACHER-008 | Teacher Availability | Set weekly availability schedule | P2 |

#### Teacher Data Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| fullName | string | Yes | 2-100 characters |
| dateOfBirth | date | Yes | Must be valid date |
| gender | enum | Yes | male, female, other |
| phone | string | Yes | Valid Vietnamese phone |
| email | string | Yes | Valid email, unique |
| address | string | No | Max 500 characters |
| qualification | string | No | Max 200 characters |
| specialization | string | No | Max 200 characters |
| hireDate | date | Yes | Cannot be future |
| status | enum | Yes | active, inactive, terminated |
| salary | decimal | No | Positive number |
| notes | text | No | Max 2000 characters |

---

### 2.4 Class Management Module

**Module Code**: CLASS

#### Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| CLASS-001 | Create Class | Create new class with details | P1 |
| CLASS-002 | Assign Teachers | Assign primary and substitute teachers | P1 |
| CLASS-003 | Assign Students | Enroll students in classes | P1 |
| CLASS-004 | Capacity Management | Set and enforce enrollment limits | P1 |
| CLASS-005 | Class Schedules | Define weekly schedule pattern | P1 |
| CLASS-006 | Classroom Info | Manage classroom locations | P2 |
| CLASS-007 | Academic Level | Tag classes by level (beginner, intermediate, advanced) | P2 |
| CLASS-008 | Class Archive | Archive past classes for records | P2 |

#### Class Data Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | 2-100 characters, unique per center |
| description | text | No | Max 1000 characters |
| centerId | UUID | Yes | Valid center reference |
| academicLevel | enum | Yes | beginner, intermediate, advanced |
| capacity | integer | Yes | 1-100 |
| status | enum | Yes | active, inactive, completed |
| startDate | date | Yes | Cannot be past for new classes |
| endDate | date | No | Must be after startDate |
| classroom | string | No | Max 100 characters |
| schedule | JSON | Yes | Weekly schedule structure |
| notes | text | No | Max 2000 characters |

#### Schedule Structure (JSON)

```json
{
  "monday": [{"startTime": "08:00", "endTime": "09:30", "room": "A101"}],
  "tuesday": [],
  "wednesday": [{"startTime": "10:00", "endTime": "11:30", "room": "A101"}],
  "thursday": [],
  "friday": [{"startTime": "08:00", "endTime": "09:30", "room": "A102"}],
  "saturday": [],
  "sunday": []
}
```

---

### 2.5 Attendance Management Module

**Module Code**: ATTENDANCE

#### Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| ATTEND-001 | Quick Attendance | One-click attendance marking for a class session | P1 |
| ATTEND-002 | Bulk Attendance | Mark attendance for multiple students | P1 |
| ATTEND-003 | Attendance Reasons | Predefined and custom absence reasons | P1 |
| ATTEND-004 | Attendance History | View past attendance records | P1 |
| ATTEND-005 | Attendance Statistics | Summary stats per student/class | P1 |
| ATTEND-006 | Offline Support | Cache attendance for offline marking | P2 |
| ATTEND-007 | Parent Notifications | Notify parents of absences | P1 |
| ATTEND-008 | Attendance Approval | Manager approval for excused absences | P2 |

#### Attendance Status Values

| Status | Code | Description |
|--------|------|-------------|
| Present | P | Student attended |
| Absent | A | Student did not attend |
| Late | L | Student arrived after start time |
| Excused | E | Absence approved with reason |

#### Attendance Record Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| studentId | UUID | Yes | Valid student reference |
| classId | UUID | Yes | Valid class reference |
| sessionDate | date | Yes | Date of the session |
| status | enum | Yes | P, A, L, E |
| reason | string | Conditional | Required if status=E, max 500 chars |
| recordedBy | UUID | Yes | Teacher who marked attendance |
| recordedAt | timestamp | Yes | Auto-generated |
| approvedBy | UUID | Conditional | Manager if approval required |
| approvedAt | timestamp | Conditional | Auto-generated |

#### Predefined Absence Reasons

- Sick (illness)
- Family emergency
- Religious observance
- School/event conflict
- Transportation issue
- Weather condition
- Other (requires description)

---

### 2.6 Teaching Schedule Module

**Module Code**: SCHEDULE

#### Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| SCHEDULE-001 | Weekly Calendar | Display weekly teaching schedule | P1 |
| SCHEDULE-002 | Monthly Calendar | Display monthly overview with sessions | P1 |
| SCHEDULE-003 | Conflict Detection | Alert on teacher/class schedule conflicts | P1 |
| SCHEDULE-004 | Lesson Notes | Record notes for each session | P1 |
| SCHEDULE-005 | Material Uploads | Upload learning materials per session | P2 |
| SCHEDULE-006 | Google Drive | Integration for material storage | P3 |
| SCHEDULE-007 | Session Types | Support regular, make-up, and trial sessions | P2 |
| SCHEDULE-008 | Substitute Management | Assign substitute teachers | P2 |

#### Session Record Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| id | UUID | Yes | Auto-generated |
| classId | UUID | Yes | Valid class reference |
| teacherId | UUID | Yes | Valid teacher reference |
| sessionDate | date | Yes | Date of session |
| startTime | time | Yes | HH:MM format |
| endTime | time | Yes | Must be after startTime |
| classroom | string | No | Max 100 characters |
| sessionType | enum | Yes | regular, makeup, trial |
| status | enum | Yes | scheduled, completed, cancelled |
| notes | text | No | Max 2000 characters |
| materials | JSON | No | Array of file references |

---

### 2.7 Student Evaluation Module

**Module Code**: EVAL

#### Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| EVAL-001 | Daily Evaluation | Record daily progress and behavior | P1 |
| EVAL-002 | Monthly Evaluation | Comprehensive monthly assessment | P1 |
| EVAL-003 | Score Tracking | Record test scores and grades | P1 |
| EVAL-004 | Behavioral Comments | Narrative feedback on behavior | P1 |
| EVAL-005 | Parent Reports | Generate shareable parent reports | P1 |
| EVAL-006 | Printable Forms | Export evaluation as PDF | P2 |
| EVAL-007 | Evaluation Templates | Configurable evaluation forms per class | P2 |
| EVAL-008 | Progress Tracking | Track improvement over time | P2 |

#### Evaluation Types

| Type | Frequency | Components |
|------|-----------|------------|
| Daily | Per session | Participation, homework, behavior |
| Weekly | Per week | Summary of daily evaluations |
| Monthly | Per month | Comprehensive academic assessment |
| Term | Per term | Full-term summary with grades |

#### Evaluation Record Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| id | UUID | Yes | Auto-generated |
| studentId | UUID | Yes | Valid student reference |
| classId | UUID | Yes | Valid class reference |
| evaluationType | enum | Yes | daily, weekly, monthly, term |
| evaluationDate | date | Yes | Date of evaluation |
| scores | JSON | Conditional | Subject scores (for monthly/term) |
| participation | integer | Conditional | 1-5 rating |
| homeworkCompletion | integer | Conditional | 1-5 rating |
| behavior | integer | Conditional | 1-5 rating |
| comments | text | No | Max 2000 characters |
| teacherId | UUID | Yes | Valid teacher reference |
| createdAt | timestamp | Yes | Auto-generated |
| updatedAt | timestamp | Yes | Auto-generated |

---

### 2.8 Tuition Collection Module

**Module Code**: TUITION

#### Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| TUITION-001 | Tuition Plans | Define tuition fees per class | P1 |
| TUITION-002 | Tuition Invoices | Generate invoices for students | P1 |
| TUITION-003 | Payment Tracking | Record payments against invoices | P1 |
| TUITION-004 | Outstanding Balances | Track unpaid invoices | P1 |
| TUITION-005 | Automatic Reminders | Scheduled payment reminder notifications | P2 |
| TUITION-006 | Tuition History | Full payment history per student | P1 |
| TUITION-007 | Discount Management | Apply discounts and scholarships | P2 |
| TUITION-008 | Refund Processing | Handle refund requests | P3 |

#### Tuition Plan Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| id | UUID | Yes | Auto-generated |
| centerId | UUID | Yes | Valid center reference |
| name | string | Yes | 2-100 characters |
| classId | UUID | Conditional | Required for class-specific plans |
| amount | decimal | Yes | Positive, 2 decimal places |
| currency | string | Yes | VND |
| billingCycle | enum | Yes | monthly, quarterly, term, yearly |
| dueDay | integer | Yes | 1-28 |
| lateFee | decimal | No | Per day late fee |
| notes | text | No | Max 500 characters |

#### Invoice Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| id | UUID | Yes | Auto-generated |
| invoiceNumber | string | Yes | Auto-generated, unique |
| studentId | UUID | Yes | Valid student reference |
| tuitionPlanId | UUID | Yes | Valid plan reference |
| amount | decimal | Yes | Positive, 2 decimal places |
| discount | decimal | No | Applied discount amount |
| totalAmount | decimal | Yes | Calculated total |
| status | enum | Yes | draft, issued, paid, overdue, cancelled |
| issueDate | date | Yes | Invoice creation date |
| dueDate | date | Yes | Payment deadline |
| paidDate | date | Conditional | Date payment received |
| paidAmount | decimal | No | Amount paid |
| paymentMethod | enum | Conditional | cash, bank_transfer, QR, other |
| notes | text | No | Max 500 characters |

---

### 2.9 QR Payment Module

**Module Code**: QRPAY

#### Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| QRPAY-001 | VietQR Generation | Generate VietQR codes for invoices | P1 |
| QRPAY-002 | Payment Confirmation | Mark invoice as paid via confirmation | P1 |
| QRPAY-003 | Auto Reconciliation | Match bank transfers to invoices | P2 |
| QRPAY-004 | Payment History | Full payment transaction history | P1 |
| QRPAY-005 | Zalo Notification | Send payment confirmation via Zalo | P2 |
| QRPAY-006 | QR Code Export | Download/print QR codes | P2 |

#### Payment Data Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| id | UUID | Yes | Auto-generated |
| invoiceId | UUID | Yes | Valid invoice reference |
| amount | decimal | Yes | Must match invoice total |
| paymentMethod | enum | Yes | vietqr, bank_transfer, cash |
| transactionId | string | Conditional | Bank transaction reference |
| transactionDate | timestamp | Yes | When payment occurred |
| bankCode | string | Conditional | Receiving bank code |
| status | enum | Yes | pending, completed, failed |
| confirmedBy | UUID | Conditional | Admin who confirmed |
| confirmedAt | timestamp | Conditional | Confirmation timestamp |

#### Supported Payment Providers

| Provider | Status | Integration |
|----------|--------|------------|
| VietQR | Primary | Generate QR codes for any Vietnamese bank |
| Bank Transfer | Supported | Manual confirmation with reference |
| Cash | Supported | In-person payment recording |

---

### 2.10 Revenue Dashboard Module

**Module Code**: DASHBOARD

#### Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| DASH-001 | Revenue Analytics | Visualize revenue over time | P1 |
| DASH-002 | Collection Reports | Tuition collection rates and details | P1 |
| DASH-003 | Student Growth | Track student enrollment trends | P1 |
| DASH-004 | Teacher Performance | Teaching hours and class loads | P1 |
| DASH-005 | Monthly Reports | Generate monthly financial reports | P1 |
| DASH-006 | Yearly Reports | Generate annual summary reports | P2 |
| DASH-007 | Export PDF | Download reports as PDF | P2 |
| DASH-008 | Export Excel | Download data as Excel | P2 |

#### Chart Types

| Chart | Description | Data Source |
|-------|-------------|-------------|
| Revenue Trend | Line chart showing revenue over time (daily/weekly/monthly/yearly) | Payments |
| Revenue by Class | Bar chart comparing revenue across classes | Invoices |
| Revenue by Center | Pie/bar chart for multi-center overview | Invoices |
| Student Growth | Line chart showing enrollment over time | Students |
| Collection Rate | Gauge showing % of issued invoices paid | Invoices |
| Outstanding Analysis | Table/chart showing overdue invoices | Invoices |

#### Dashboard Metrics

| Metric | Calculation | Display |
|--------|-------------|---------|
| Total Revenue | Sum of completed payments (period) | Currency |
| Collection Rate | (Paid Invoices / Issued Invoices) × 100 | Percentage |
| Active Students | Count of students with active status | Number |
| New Enrollments | Count of new students (period) | Number |
| Average Tuition | Total Revenue / Active Students | Currency |
| Overdue Amount | Sum of overdue invoice totals | Currency |

---

### 2.11 Role-Based Access Control Module

**Module Code**: RBAC

#### Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| RBAC-001 | Dynamic Permissions | Configure permissions per role | P1 |
| RBAC-002 | Permission Groups | Group related permissions | P1 |
| RBAC-003 | Custom Roles | Create center-specific roles | P2 |
| RBAC-004 | Audit Logs | Track all permission and data changes | P1 |
| RBAC-005 | Permission Inheritance | Support hierarchical permissions | P2 |

#### Permission Levels

| Level | Code | Description |
|-------|------|-------------|
| None | 0 | No access |
| Read | 1 | View only |
| Create | 2 | Create new records |
| Update | 3 | Modify existing records |
| Delete | 4 | Remove records |
| Export | 5 | Export data |

#### Module Permissions Matrix

| Module | Super Admin | Center Manager | Teacher | Parent |
|--------|-------------|----------------|---------|--------|
| Centers | CRUD | R | - | - |
| Students | CRUD | CRUD | R | R (own) |
| Teachers | CRUD | CRUD | R (assigned) | - |
| Classes | CRUD | CRUD | R (assigned) | R (enrolled) |
| Attendance | CRUD | CRUD | CRU | R (own) |
| Schedule | CRUD | CRUD | RU | R (own) |
| Evaluations | CRUD | CRUD | CRU | R (own) |
| Tuition | CRUD | CRUD | - | R (own) |
| Payments | CRUD | CRUD | - | C (confirm) |
| Reports | CRUD | CRU | R (assigned) | R (own) |
| Settings | CRUD | CRU | R | - |

#### Audit Log Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| userId | UUID | User who performed action |
| action | string | Create, Read, Update, Delete, Export |
| resource | string | Module/resource affected |
| resourceId | UUID | ID of affected resource |
| changes | JSON | Before/after values for updates |
| ipAddress | string | Client IP address |
| userAgent | string | Browser/client info |
| timestamp | timestamp | When action occurred |

---

## 3. Data Architecture

### 3.1 Multi-Center Architecture

Each education center operates as a tenant with:

- Isolated student, teacher, and class data
- Center-specific administrators
- Independent financial records
- Shared platform-levelSuper Admin

### 3.2 Entity Relationship Summary

```
Platform (Super Admin)
└── Center (1:N)
    ├── Student (1:N)
    │   ├── Enrollment (N:1 Class)
    │   ├── Attendance (N:1 Session)
    │   ├── Evaluation (N:1 Class)
    │   └── Invoice (1:N Payment)
    ├── Teacher (1:N)
    │   └── ClassAssignment (N:1 Class)
    ├── Class (1:N)
    │   ├── Enrollment (N:1 Student)
    │   ├── Session (1:N)
    │   └── ClassAssignment (N:1 Teacher)
    └── TuitionPlan (1:N)

User (multi-role)
├── CenterAdmin (1:1 Center)
├── TeacherAssignment (N:1 Class)
└── ParentStudent (N:1 Student)
```

---

## 4. API Module Specification

### 4.1 Authentication APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| POST | /api/auth/logout | User logout |
| POST | /api/auth/forgot-password | Request password reset |
| POST | /api/auth/reset-password | Reset password with token |
| POST | /api/auth/refresh | Refresh access token |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/password | Change password |

### 4.2 Student APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/students | List students (paginated, filterable) |
| POST | /api/students | Create student |
| GET | /api/students/:id | Get student details |
| PUT | /api/students/:id | Update student |
| DELETE | /api/students/:id | Archive student |
| GET | /api/students/:id/enrollments | Get enrollment history |
| GET | /api/students/:id/attendance | Get attendance records |
| GET | /api/students/:id/invoices | Get tuition invoices |
| GET | /api/students/:id/evaluations | Get evaluations |
| POST | /api/students/import | Import from Excel |
| GET | /api/students/export | Export to Excel |

### 4.3 Teacher APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/teachers | List teachers |
| POST | /api/teachers | Create teacher |
| GET | /api/teachers/:id | Get teacher details |
| PUT | /api/teachers/:id | Update teacher |
| DELETE | /api/teachers/:id | Archive teacher |
| GET | /api/teachers/:id/assignments | Get teaching assignments |
| GET | /api/teachers/:id/schedule | Get teaching schedule |
| POST | /api/teachers/import | Import from Excel |
| GET | /api/teachers/export | Export to Excel |

### 4.4 Class APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/classes | List classes |
| POST | /api/classes | Create class |
| GET | /api/classes/:id | Get class details |
| PUT | /api/classes/:id | Update class |
| DELETE | /api/classes/:id | Archive class |
| POST | /api/classes/:id/students | Enroll students |
| DELETE | /api/classes/:id/students/:studentId | Remove student |
| POST | /api/classes/:id/teachers | Assign teachers |
| GET | /api/classes/:id/sessions | Get class sessions |

### 4.5 Attendance APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/attendance | List attendance records |
| POST | /api/attendance/session | Mark session attendance |
| POST | /api/attendance/bulk | Bulk mark attendance |
| GET | /api/attendance/student/:id | Get student attendance |
| GET | /api/attendance/class/:id | Get class attendance |
| PUT | /api/attendance/:id | Update attendance record |
| POST | /api/attendance/:id/approve | Approve excused absence |

### 4.6 Schedule APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/schedule/weekly | Get weekly schedule |
| GET | /api/schedule/monthly | Get monthly schedule |
| GET | /api/schedule/teacher/:id | Get teacher schedule |
| POST | /api/sessions | Create session |
| PUT | /api/sessions/:id | Update session |
| POST | /api/sessions/:id/notes | Add lesson notes |
| POST | /api/sessions/:id/materials | Upload materials |

### 4.7 Evaluation APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/evaluations | List evaluations |
| POST | /api/evaluations | Create evaluation |
| GET | /api/evaluations/:id | Get evaluation |
| PUT | /api/evaluations/:id | Update evaluation |
| GET | /api/evaluations/student/:id | Get student evaluations |
| GET | /api/evaluations/class/:id | Get class evaluations |
| GET | /api/evaluations/:id/report | Generate parent report |

### 4.8 Tuition APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tuition/plans | List tuition plans |
| POST | /api/tuition/plans | Create tuition plan |
| PUT | /api/tuition/plans/:id | Update plan |
| GET | /api/tuition/invoices | List invoices |
| POST | /api/tuition/invoices | Create invoice |
| GET | /api/tuition/invoices/:id | Get invoice details |
| PUT | /api/tuition/invoices/:id | Update invoice |
| POST | /api/tuition/invoices/:id/pay | Record payment |
| GET | /api/tuition/invoices/overdue | Get overdue invoices |

### 4.9 Payment APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/vietqr | Generate VietQR |
| POST | /api/payments/confirm | Confirm payment |
| GET | /api/payments/history | Payment history |
| GET | /api/payments/:id | Payment details |
| POST | /api/payments/reconcile | Trigger reconciliation |

### 4.10 Dashboard & Report APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/revenue | Revenue overview |
| GET | /api/dashboard/students | Student metrics |
| GET | /api/dashboard/attendance | Attendance metrics |
| GET | /api/dashboard/collections | Collection metrics |
| GET | /api/reports/monthly | Monthly report |
| GET | /api/reports/yearly | Yearly report |
| GET | /api/reports/export/pdf | Export report as PDF |
| GET | /api/reports/export/excel | Export report as Excel |

### 4.11 Admin APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/centers | List centers |
| POST | /api/centers | Create center |
| GET | /api/centers/:id | Get center details |
| PUT | /api/centers/:id | Update center |
| GET | /api/users | List users |
| POST | /api/users | Create user |
| PUT | /api/users/:id/roles | Update user roles |
| GET | /api/audit-logs | Get audit logs |
| GET | /api/settings | Get platform settings |
| PUT | /api/settings | Update settings |

---

## 5. Database Entity List

### 5.1 Core Entities

| Entity | Description | Key Attributes |
|--------|-------------|-----------------|
| User | Platform users | email, passwordHash, roles, status |
| Center | Education center | name, address, phone, status |
| Student | Student records | fullName, dob, gender, status, centerId |
| Parent | Parent records | fullName, phone, email, studentId |
| Teacher | Teacher records | fullName, dob, email, status, centerId |
| Class | Class definitions | name, capacity, level, status, centerId |
| Enrollment | Student-class enrollment | studentId, classId, enrolledAt, status |
| Session | Teaching sessions | classId, teacherId, date, startTime, endTime |
| Attendance | Attendance records | studentId, sessionId, status, reason |
| Evaluation | Student evaluations | studentId, classId, type, scores, comments |
| TuitionPlan | Tuition fee plans | name, amount, billingCycle, centerId |
| Invoice | Tuition invoices | number, studentId, amount, status, dueDate |
| Payment | Payment records | invoiceId, amount, method, transactionId |
| AuditLog | Audit trail | userId, action, resource, changes |

### 5.2 Supporting Entities

| Entity | Description | Key Attributes |
|--------|-------------|-----------------|
| ClassTeacher | Class-teacher assignments | classId, teacherId, role |
| SessionMaterial | Session learning materials | sessionId, fileUrl, fileType |
| InvoiceItem | Invoice line items | invoiceId, description, amount |
| Permission | Permission definitions | name, module, level |
| RolePermission | Role-permission mapping | roleId, permissionId |
| Notification | User notifications | userId, type, message, read |

---

## 6. User Stories

### 6.1 Authentication

#### US-AUTH-001: User Login (P1)
As a user, I want to log in with email and password so I can access the platform.

**Acceptance Criteria:**
- Given I am on the login page, when I enter valid credentials, then I am redirected to the dashboard
- Given I enter invalid credentials, when I submit, then I see an error message
- Given I have an active session, when I open the app, then I remain logged in

#### US-AUTH-002: Password Reset (P1)
As a user, I want to reset my password when I forget it so I can regain access.

**Acceptance Criteria:**
- Given I am on the login page, when I click "Forgot Password", then I see a reset form
- Given I enter a valid email, when I submit, then I receive an email with reset instructions
- Given I follow the reset link, when I set a new password, then I can login with new password

---

### 6.2 Student Management

#### US-STUDENT-001: Add New Student (P1)
As a Center Manager, I want to add new students so they can enroll in classes.

**Acceptance Criteria:**
- Given I am on the student list page, when I click "Add Student", then I see a student form
- Given I fill all required fields, when I submit, then the student is created and shown in the list
- Given I miss required fields, when I submit, then I see validation errors

#### US-STUDENT-002: Import Students (P2)
As a Center Manager, I want to import students from Excel so I can save time on bulk entry.

**Acceptance Criteria:**
- Given I am on the student list page, when I click "Import", then I can upload an Excel file
- Given the file matches the template, when I upload, then students are created
- Given the file has errors, when I upload, then I see an error report

---

### 6.3 Attendance

#### US-ATTEND-001: Mark Attendance (P1)
As a Teacher, I want to mark attendance for my class so I can track student presence.

**Acceptance Criteria:**
- Given I am on my class session page, when I open attendance, then I see all enrolled students
- Given I mark each student as present/absent/late, when I save, then attendance is recorded
- Given I need to mark all present quickly, when I click "Mark All Present", then all students are marked present

#### US-ATTEND-002: View Attendance History (P1)
As a Parent, I want to view my child's attendance history so I can monitor their school attendance.

**Acceptance Criteria:**
- Given I am logged in as a parent, when I open attendance, then I see my child's attendance records
- Given I want to filter by date, when I select a date range, then only records in that range are shown
- Given my child was absent, when I view the record, then I see the reason if provided

---

### 6.4 Tuition & Payments

#### US-TUITION-001: Generate Invoice (P1)
As a Center Manager, I want to generate tuition invoices so parents can pay for education services.

**Acceptance Criteria:**
- Given I have active tuition plans, when I go to invoices, then I can generate invoices for students
- Given I select students and billing period, when I generate, then invoices are created with correct amounts
- Given invoices are generated, when I view the list, then I see all invoices with status

#### US-TUITION-002: Pay Invoice via QR (P1)
As a Parent, I want to pay tuition using QR code so I can complete payments easily.

**Acceptance Criteria:**
- Given I am viewing an unpaid invoice, when I click "Pay", then I see a VietQR code
- Given I scan the QR with my banking app, when I complete the transfer, then I can confirm payment
- Given the payment is confirmed, when I view the invoice, then status shows as paid

---

### 6.5 Evaluations

#### US-EVAL-001: Record Daily Evaluation (P1)
As a Teacher, I want to record daily evaluations so I can track student progress.

**Acceptance Criteria:**
- Given I am on my class session page, when I open evaluation, then I see all students
- Given I rate each student on participation, homework, behavior, when I save, then evaluation is recorded
- Given I add comments, when I save, then comments are attached to evaluation

#### US-EVAL-002: View Parent Report (P1)
As a Parent, I want to view my child's evaluation reports so I can see their progress.

**Acceptance Criteria:**
- Given I am logged in as a parent, when I open evaluations, then I see my child's reports
- Given I want a summary, when I open a monthly report, then I see scores and teacher comments

---

### 6.6 Dashboard

#### US-DASH-001: View Revenue Dashboard (P1)
As a Center Manager, I want to view revenue dashboard so I can understand the financial health.

**Acceptance Criteria:**
- Given I am on the dashboard, when I view revenue section, then I see revenue trend chart
- Given I want details, when I click on a data point, then I see the underlying data
- Given I need a report, when I export, then I can download PDF or Excel

---

## 7. Functional Requirements Summary

### 7.1 Authentication & Authorization

- FR-AUTH-001: System SHALL support email/password authentication
- FR-AUTH-002: System SHALL issue JWT access tokens with 15-minute expiry
- FR-AUTH-003: System SHALL support refresh tokens with 7-day expiry
- FR-AUTH-004: System SHALL support role-based access control with 4 roles
- FR-AUTH-005: System SHALL log all authentication events
- FR-AUTH-006: System SHALL enforce rate limiting on auth endpoints

### 7.2 Student Management

- FR-STUD-001: System SHALL allow creating student profiles with required fields
- FR-STUD-002: System SHALL support student search by name, ID, phone, email
- FR-STUD-003: System SHALL support Excel import of students (max 500 per file)
- FR-STUD-004: System SHALL support Excel export of student list
- FR-STUD-005: System SHALL track enrollment history per student
- FR-STUD-006: System SHALL support student status: active, inactive, archived

### 7.3 Teacher Management

- FR-TEACH-001: System SHALL allow creating teacher profiles
- FR-TEACH-002: System SHALL support assigning teachers to multiple classes
- FR-TEACH-003: System SHALL track teaching history per teacher
- FR-TEACH-004: System SHALL support Excel import/export of teachers

### 7.4 Class Management

- FR-CLASS-001: System SHALL allow creating classes with schedule
- FR-CLASS-002: System SHALL enforce class capacity limits
- FR-CLASS-003: System SHALL support multiple teachers per class
- FR-CLASS-004: System SHALL detect scheduling conflicts

### 7.5 Attendance

- FR-ATTEND-001: System SHALL allow marking attendance per session
- FR-ATTEND-002: System SHALL support bulk attendance marking
- FR-ATTEND-003: System SHALL support 4 attendance statuses
- FR-ATTEND-004: System SHALL allow marking excused absences with reason
- FR-ATTEND-005: System SHALL generate attendance statistics per student

### 7.6 Schedule

- FR-SCHED-001: System SHALL display weekly and monthly calendar views
- FR-SCHED-002: System SHALL allow recording lesson notes per session
- FR-SCHED-003: System SHALL support material uploads per session

### 7.7 Evaluation

- FR-EVAL-001: System SHALL support daily, weekly, monthly, term evaluations
- FR-EVAL-002: System SHALL record numeric scores (1-5 scale)
- FR-EVAL-003: System SHALL support text comments
- FR-EVAL-004: System SHALL generate printable parent reports

### 7.8 Tuition

- FR-TUITION-001: System SHALL create tuition plans per class
- FR-TUITION-002: System SHALL generate invoices with due dates
- FR-TUITION-003: System SHALL track payment status
- FR-TUITION-004: System SHALL identify overdue invoices

### 7.9 QR Payment

- FR-QR-001: System SHALL generate VietQR codes for invoices
- FR-QR-002: System SHALL support payment confirmation
- FR-QR-003: System SHALL record payment transaction details

### 7.10 Dashboard

- FR-DASH-001: System SHALL display revenue trend charts
- FR-DASH-002: System SHALL display student growth charts
- FR-DASH-003: System SHALL support PDF export of reports
- FR-DASH-004: System SHALL support Excel export of data

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| API Response Time | < 500ms | p95 latency |
| Page Load Time | < 3s | First contentful paint |
| Concurrent Users | 500 per center | simultaneous active sessions |
| Student Capacity | 10,000+ per center | total enrolled students |
| Search Response | < 200ms | for student/teacher lookups |

### 8.2 Security

| Requirement | Implementation |
|-------------|-----------------|
| Authentication | JWT with HS256 signing |
| Password Storage | bcrypt with cost factor 12 |
| Session Management | Rotating refresh tokens |
| Rate Limiting | 100 requests/minute per user |
| Input Validation | Server-side validation on all inputs |
| SQL Injection | Prevented via Prisma ORM |
| XSS Prevention | Input sanitization, CSP headers |
| Audit Logging | All data changes logged |

### 8.3 Scalability

| Aspect | Requirement |
|--------|-------------|
| Multi-center | Support unlimited education centers |
| Horizontal Scaling | Stateless API servers |
| Database | Connection pooling, read replicas |
| CDN | Static assets on CDN |

### 8.4 Availability

| Requirement | Target |
|-------------|--------|
| Uptime | 99.5% SLA |
| Backup | Daily automated backups |
| Recovery | Point-in-time recovery capability |

### 8.5 Compatibility

| Aspect | Requirement |
|--------|-------------|
| Browser Support | Chrome, Firefox, Safari, Edge (last 2 versions) |
| Mobile Support | Responsive design for tablets |
| Accessibility | WCAG 2.1 Level A compliance |

---

## 9. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Web App   │  │  Mobile Web │  │    Parent Portal    │ │
│  │   (React)   │  │  (Responsive)│  │     (React)        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Express.js API Server                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │
│  │  │  Auth   │ │ Student │ │ Teacher │ │  Class  │    │   │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │    │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │
│  │  │Attendance│ │Schedule │ │  Eval   │ │ Tuition │    │   │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │    │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │    Redis        │  │   Cloudinary   │
│   (Primary DB)  │  │   (Cache/Sessions│  │   (Files/Media) │
│                 │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     External Services                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   VietQR API │  │  Email SMTP │  │  Zalo API   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Development Roadmap

### Phase 1: Foundation (Weeks 1-4)

| Task | Duration | Deliverables |
|------|----------|--------------|
| Project Setup | 1 week | Repository, CI/CD, environments |
| Auth Module | 2 weeks | Login, JWT, RBAC core |
| Database Design | 1 week | Prisma schema, migrations |

**MVP Features:** Authentication, basic user management

### Phase 2: Core Module Development (Weeks 5-10)

| Task | Duration | Deliverables |
|------|----------|--------------|
| Student Module | 2 weeks | CRUD, search, import/export |
| Teacher Module | 2 weeks | CRUD, assignments |
| Class Module | 2 weeks | CRUD, scheduling |

**MVP Features:** Student, teacher, class management

### Phase 3: Operations Module (Weeks 11-14)

| Task | Duration | Deliverables |
|------|----------|--------------|
| Attendance | 2 weeks | Marking, history, stats |
| Schedule | 1 week | Calendar views, session management |
| Evaluations | 1 week | Daily/monthly evaluations |

**MVP Features:** Attendance tracking, schedule, evaluations

### Phase 4: Financial Module (Weeks 15-18)

| Task | Duration | Deliverables |
|------|----------|--------------|
| Tuition Module | 2 weeks | Plans, invoices, tracking |
| QR Payment | 1 week | VietQR generation, confirmation |
| Dashboard | 1 week | Revenue charts, reports |

**MVP Features:** Tuition management, payments, reporting

### Phase 5: Polish & Launch (Weeks 19-20)

| Task | Duration | Deliverables |
|------|----------|--------------|
| Testing | 1 week | QA, bug fixes |
| Deployment | 1 week | Production setup, monitoring |

---

## 11. MVP Scope Definition

### MVP v1.0 - Core Platform

#### Included in MVP

1. **Authentication**
   - Email/password login
   - JWT authentication
   - Session management
   - Password reset

2. **Student Management**
   - Create/edit/search students
   - Parent information
   - Enrollment tracking
   - Excel import (basic)

3. **Teacher Management**
   - Create/edit/search teachers
   - Teaching assignments

4. **Class Management**
   - Create/edit classes
   - Assign students and teachers
   - Basic scheduling

5. **Attendance**
   - Quick attendance marking
   - Attendance history
   - Basic statistics

6. **Dashboard**
   - Revenue overview
   - Student metrics
   - Basic reports

#### Excluded from MVP (v1.1+)

- Advanced Excel import/export
- Offline attendance support
- Google Drive integration
- Zalo notifications
- Refund processing
- Advanced permission customization
- Mobile native apps

---

## 12. Technical Specifications

### 12.1 Technology Stack

**Frontend:**
- React 18.x
- TypeScript 5.x
- Mantine UI 7.x
- React Query 5.x
- React Router 6.x

**Backend:**
- Node.js 20.x LTS
- Express.js 4.x
- TypeScript 5.x
- Prisma ORM 5.x

**Database:**
- PostgreSQL 15.x
- Redis 7.x (cache/sessions)

**Infrastructure:**
- Docker containers
- Nginx reverse proxy
- Cloudinary (media storage)

### 12.2 Environment Configuration

```
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
REFRESH_TOKEN_SECRET=...
CLOUDINARY_URL=cloudinary://...
```

### 12.3 API Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [ ... ]
  }
}
```

---

## 13. Acceptance Criteria Summary

| Module | Acceptance Criteria |
|--------|---------------------|
| Auth | Users can login, logout, reset password with JWT validation |
| Students | Can create, view, edit, search students; import from Excel |
| Teachers | Can create, view, edit teachers; assign to classes |
| Classes | Can create classes, assign teachers/students, set schedules |
| Attendance | Can mark attendance per session with all 4 statuses |
| Schedule | Can view weekly/monthly calendars; record lesson notes |
| Evaluations | Can create daily/monthly evaluations; generate parent reports |
| Tuition | Can create plans, generate invoices, track payments |
| QR Payment | Can generate VietQR codes; confirm payments |
| Dashboard | Can view revenue charts, student metrics, export reports |
| RBAC | Permissions enforced on all endpoints; audit logs maintained |

---

**Document End**

*This specification defines the complete requirements for the Education Center Management Platform. All features marked P1 are mandatory for MVP. Features marked P2/P3 can be prioritized based on feedback and timeline.*