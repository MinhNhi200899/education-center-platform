# Database Design Document
## Education Center Management Platform

**Document Version**: 1.0  
**Created**: 2026-06-03  
**Status**: Draft  
**Database**: PostgreSQL 15+  
**ORM**: Prisma 5.x

---

## Table of Contents

1. [Entity Overview](#1-entity-overview)
2. [Entity Definitions](#2-entity-definitions)
3. [Relationships](#3-relationships)
4. [Cardinality](#4-cardinality)
5. [Business Constraints](#5-business-constraints)
6. [Indexes](#6-indexes)
7. [Unique Constraints](#7-unique-constraints)
8. [Soft Delete Strategy](#8-soft-delete-strategy)
9. [Audit Fields](#9-audit-fields)
10. [Multi-Tenant Design](#10-multi-tenant-design)

---

## 1. Entity Overview

### 1.1 Core Entities (16)

| Entity | Description | Module |
|--------|-------------|--------|
| User | Platform users (admins, managers, teachers, parents) | AUTH |
| Center | Education center/tenant | CORE |
| Student | Student records | STUDENT |
| Parent | Parent/guardian records | STUDENT |
| Teacher | Teacher profiles | TEACHER |
| Class | Class definitions | CLASS |
| Enrollment | Student-class enrollment | CLASS |
| Session | Teaching sessions | SCHEDULE |
| AttendanceRecord | Student attendance per session | ATTENDANCE |
| Evaluation | Student evaluations | EVAL |
| TuitionPlan | Tuition fee plans | TUITION |
| Invoice | Tuition invoices | TUITION |
| InvoiceItem | Invoice line items | TUITION |
| Payment | Payment records | PAYMENT |
| AbsenceReason | Predefined absence reasons | ATTENDANCE |
| SessionMaterial | Session learning materials | SCHEDULE |

### 1.2 RBAC Entities (5)

| Entity | Description | Module |
|--------|-------------|--------|
| Role | System roles | RBAC |
| Permission | Permission definitions | RBAC |
| RolePermission | Role-permission mapping | RBAC |
| UserRole | User-role assignments | RBAC |
| AuditLog | Audit trail | RBAC |

### 1.3 Supporting Entities (3)

| Entity | Description | Module |
|--------|-------------|--------|
| RefreshToken | JWT refresh tokens | AUTH |
| PasswordReset | Password reset tokens | AUTH |
| Notification | User notifications | NOTIFICATION |

---

## 2. Entity Definitions

### 2.1 User

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| centerId | UUID | No | NULL for platform admins |
| email | VARCHAR(255) | Yes | Unique email address |
| passwordHash | VARCHAR(255) | Yes | Bcrypt hashed password |
| phone | VARCHAR(20) | No | Contact phone |
| status | ENUM | Yes | active, inactive, locked |
| lastLoginAt | TIMESTAMP | No | Last successful login |
| lastLoginIp | VARCHAR(45) | No | Last login IP |
| failedLoginCount | INT | No | Consecutive failed attempts (default: 0) |
| lockedUntil | TIMESTAMP | No | Account lock expiry |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

**Status Values:**
- `active`: User can log in
- `inactive`: User account disabled
- `locked`: Account locked due to failed attempts

### 2.2 Center

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| name | VARCHAR(200) | Yes | Center name |
| code | VARCHAR(50) | Yes | Unique short code (e.g., "HCM01") |
| address | TEXT | No | Full address |
| phone | VARCHAR(20) | No | Contact phone |
| email | VARCHAR(255) | No | Contact email |
| logoUrl | VARCHAR(500) | No | Logo image URL |
| timezone | VARCHAR(50) | Yes | Timezone (default: "Asia/Ho_Chi_Minh") |
| settings | JSONB | No | Center-specific settings |
| status | ENUM | Yes | active, inactive |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

### 2.3 Student

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| userId | UUID | No | Linked user account (for parent portal access) |
| centerId | UUID | Yes | Parent center |
| fullName | VARCHAR(100) | Yes | Student full name |
| dateOfBirth | DATE | Yes | Date of birth |
| gender | ENUM | Yes | male, female, other |
| phone | VARCHAR(20) | No | Contact phone |
| email | VARCHAR(255) | No | Contact email |
| address | TEXT | No | Home address |
| avatarUrl | VARCHAR(500) | No | Photo URL |
| enrollmentDate | DATE | Yes | Enrollment date |
| status | ENUM | Yes | active, inactive, archived |
| notes | TEXT | No | Additional notes (max 2000 chars) |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

**Status Values:**
- `active`: Currently enrolled
- `inactive`: Temporarily suspended
- `archived`: Withdrawn/permanently left

### 2.4 Parent

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| userId | UUID | No | Linked user account (for parent portal access) |
| studentId | UUID | Yes | Primary student |
| fullName | VARCHAR(100) | Yes | Parent/guardian full name |
| relationship | ENUM | Yes | father, mother, guardian, other |
| phone | VARCHAR(20) | Yes | Contact phone |
| email | VARCHAR(255) | No | Contact email |
| occupation | VARCHAR(100) | No | Job title |
| address | TEXT | No | Contact address |
| isPrimary | BOOLEAN | Yes | Primary contact flag (default: true) |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

### 2.5 Teacher

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| userId | UUID | No | Linked user account (for teacher portal access) |
| centerId | UUID | Yes | Parent center |
| fullName | VARCHAR(100) | Yes | Teacher full name |
| dateOfBirth | DATE | Yes | Date of birth |
| gender | ENUM | Yes | male, female, other |
| phone | VARCHAR(20) | Yes | Contact phone |
| email | VARCHAR(255) | Yes | Contact email (unique per center) |
| address | TEXT | No | Home address |
| qualification | VARCHAR(200) | No | Education qualification |
| specialization | VARCHAR(200) | No | Teaching specialization |
| hireDate | DATE | Yes | Employment start date |
| salary | DECIMAL(12,2) | No | Monthly salary |
| status | ENUM | Yes | active, inactive, terminated |
| avatarUrl | VARCHAR(500) | No | Photo URL |
| notes | TEXT | No | Additional notes (max 2000 chars) |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

### 2.6 Class

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| centerId | UUID | Yes | Parent center |
| name | VARCHAR(100) | Yes | Class name |
| description | TEXT | No | Class description (max 1000 chars) |
| academicLevel | ENUM | Yes | beginner, intermediate, advanced |
| capacity | INT | Yes | Maximum students (1-100) |
| status | ENUM | Yes | active, inactive, completed, archived |
| classroom | VARCHAR(100) | No | Room/location |
| schedule | JSONB | Yes | Weekly schedule structure |
| startDate | DATE | Yes | Class start date |
| endDate | DATE | No | Class end date (must be >= startDate) |
| notes | TEXT | No | Additional notes (max 2000 chars) |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

**Schedule JSON Structure:**
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

### 2.7 ClassTeacher

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| classId | UUID | Yes | Class reference |
| teacherId | UUID | Yes | Teacher reference |
| role | ENUM | Yes | primary, substitute |
| assignedAt | TIMESTAMP | Yes | Assignment date |
| createdAt | TIMESTAMP | Yes | Creation timestamp |

**Role Values:**
- `primary`: Main teacher for the class
- `substitute`: Backup/replacement teacher

### 2.8 Enrollment

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| studentId | UUID | Yes | Student reference |
| classId | UUID | Yes | Class reference |
| enrolledAt | TIMESTAMP | Yes | Enrollment timestamp |
| startDate | DATE | Yes | Enrollment start date |
| endDate | DATE | No | Enrollment end date |
| status | ENUM | Yes | active, completed, withdrawn |
| notes | TEXT | No | Enrollment notes |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

### 2.9 Session

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| classId | UUID | Yes | Class reference |
| teacherId | UUID | Yes | Primary teacher (references User) |
| sessionDate | DATE | Yes | Session date |
| startTime | TIME | Yes | Start time (HH:MM format) |
| endTime | TIME | Yes | End time (must be > startTime) |
| classroom | VARCHAR(100) | No | Room/location |
| sessionType | ENUM | Yes | regular, makeup, trial |
| status | ENUM | Yes | scheduled, completed, cancelled |
| notes | TEXT | No | Session notes (max 2000 chars) |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

**Session Type Values:**
- `regular`: Normal scheduled session
- `makeup`: Make-up session for cancelled class
- `trial`: Trial/demo session

**Status Values:**
- `scheduled`: Future session
- `completed`: Session conducted
- `cancelled`: Session cancelled

### 2.10 AttendanceRecord

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| studentId | UUID | Yes | Student reference |
| sessionId | UUID | Yes | Session reference |
| status | ENUM | Yes | present, absent, late, excused |
| reason | TEXT | No | Absence reason (max 500 chars, required if status=excused) |
| recordedBy | UUID | Yes | Teacher who recorded |
| recordedAt | TIMESTAMP | Yes | Recording timestamp |
| approvedBy | UUID | No | Manager who approved |
| approvedAt | TIMESTAMP | No | Approval timestamp |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

### 2.11 Evaluation

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| studentId | UUID | Yes | Student reference |
| classId | UUID | Yes | Class reference |
| teacherId | UUID | Yes | Teacher reference |
| evaluationType | ENUM | Yes | daily, weekly, monthly, term |
| evaluationDate | DATE | Yes | Date of evaluation |
| participation | INT | No | Rating 1-5 |
| homework | INT | No | Rating 1-5 |
| behavior | INT | No | Rating 1-5 |
| scores | JSONB | No | Subject scores |
| comments | TEXT | No | Teacher comments (max 2000 chars) |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

### 2.12 SessionMaterial

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| sessionId | UUID | Yes | Session reference |
| fileUrl | VARCHAR(500) | Yes | Cloudinary file URL |
| fileName | VARCHAR(255) | Yes | Original file name |
| fileType | VARCHAR(100) | Yes | MIME type |
| fileSize | INT | Yes | Size in bytes |
| uploadedBy | UUID | Yes | User who uploaded |
| createdAt | TIMESTAMP | Yes | Creation timestamp |

### 2.13 TuitionPlan

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| centerId | UUID | Yes | Parent center |
| classId | UUID | No | Optional class-specific plan |
| name | VARCHAR(100) | Yes | Plan name |
| amount | DECIMAL(12,2) | Yes | Fee amount |
| currency | VARCHAR(3) | Yes | Currency code (default: "VND") |
| billingCycle | ENUM | Yes | monthly, quarterly, term, yearly |
| dueDay | INT | Yes | Day of month for payment (1-28) |
| lateFee | DECIMAL(12,2) | No | Per day late fee |
| notes | TEXT | No | Plan notes (max 500 chars) |
| isActive | BOOLEAN | Yes | Active flag (default: true) |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

### 2.14 Invoice

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| centerId | UUID | Yes | Parent center |
| invoiceNumber | VARCHAR(50) | Yes | Auto-generated unique number |
| studentId | UUID | Yes | Student reference |
| tuitionPlanId | UUID | Yes | Tuition plan reference |
| amount | DECIMAL(12,2) | Yes | Original amount |
| discount | DECIMAL(12,2) | Yes | Discount amount (default: 0) |
| totalAmount | DECIMAL(12,2) | Yes | Final amount after discount |
| status | ENUM | Yes | draft, issued, paid, overdue, cancelled |
| issueDate | DATE | Yes | Invoice issue date |
| dueDate | DATE | Yes | Payment due date |
| paidDate | DATE | No | Date payment received |
| paidAmount | DECIMAL(12,2) | No | Amount paid |
| paymentMethod | ENUM | No | cash, bank_transfer, vietqr |
| notes | TEXT | No | Invoice notes (max 500 chars) |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

**Invoice Status Values:**
- `draft`: Not yet issued
- `issued`: Sent to parent
- `paid`: Payment received
- `overdue`: Past due date, unpaid
- `cancelled`: Cancelled invoice

### 2.15 InvoiceItem

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| invoiceId | UUID | Yes | Invoice reference |
| description | VARCHAR(255) | Yes | Item description |
| quantity | INT | Yes | Quantity (default: 1) |
| amount | DECIMAL(12,2) | Yes | Line item amount |
| createdAt | TIMESTAMP | Yes | Creation timestamp |

### 2.16 Payment

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| invoiceId | UUID | Yes | Invoice reference |
| amount | DECIMAL(12,2) | Yes | Payment amount |
| paymentMethod | ENUM | Yes | cash, bank_transfer, vietqr |
| transactionId | VARCHAR(100) | No | Bank transaction reference |
| transactionDate | TIMESTAMP | Yes | When payment occurred |
| bankCode | VARCHAR(20) | No | Receiving bank code |
| qrCodeUrl | VARCHAR(500) | No | Generated QR code URL |
| status | ENUM | Yes | pending, completed, failed |
| confirmedBy | UUID | No | Admin who confirmed |
| confirmedAt | TIMESTAMP | No | Confirmation timestamp |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

### 2.17 AbsenceReason

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| centerId | UUID | No | NULL for system-wide reasons |
| name | VARCHAR(100) | Yes | Reason name |
| description | TEXT | No | Description |
| displayOrder | INT | Yes | Display order (default: 0) |
| isSystem | BOOLEAN | Yes | System-defined flag (default: false) |
| isActive | BOOLEAN | Yes | Active flag (default: true) |
| createdAt | TIMESTAMP | Yes | Creation timestamp |

### 2.18 Role

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| name | VARCHAR(50) | Yes | Role name (unique) |
| description | TEXT | No | Role description |
| isSystem | BOOLEAN | Yes | System-defined flag (default: false) |
| isActive | BOOLEAN | Yes | Active flag (default: true) |
| createdAt | TIMESTAMP | Yes | Creation timestamp |
| updatedAt | TIMESTAMP | Yes | Last update timestamp |

**System Roles:**
- `super_admin`: Platform-wide access
- `center_manager`: Center-level access
- `teacher`: Class-level access
- `parent`: Student-level access

### 2.19 Permission

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| name | VARCHAR(100) | Yes | Permission name (unique) |
| module | VARCHAR(50) | Yes | Module name |
| level | INT | Yes | Permission level (0-5) |
| description | TEXT | No | Permission description |
| createdAt | TIMESTAMP | Yes | Creation timestamp |

**Permission Levels:**
- 0: None (no access)
- 1: Read
- 2: Create
- 3: Update
- 4: Delete
- 5: Export

**Permission Naming Convention:** `{module}.{action}` (e.g., `students.read`, `students.create`)

### 2.20 RolePermission

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| roleId | UUID | Yes | Role reference |
| permissionId | UUID | Yes | Permission reference |
| createdAt | TIMESTAMP | Yes | Creation timestamp |

### 2.21 UserRole

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| userId | UUID | Yes | User reference |
| roleId | UUID | Yes | Role reference |
| centerId | UUID | No | Center scope (NULL = all centers for super_admin) |
| createdAt | TIMESTAMP | Yes | Creation timestamp |

### 2.22 AuditLog

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| userId | UUID | Yes | User who performed action |
| centerId | UUID | No | Center context (for tenant isolation) |
| action | VARCHAR(50) | Yes | Action type |
| resource | VARCHAR(100) | Yes | Resource type |
| resourceId | UUID | No | Resource ID |
| changes | JSONB | No | Before/after values |
| ipAddress | VARCHAR(45) | No | Client IP |
| userAgent | TEXT | No | Client user agent |
| createdAt | TIMESTAMP | Yes | Action timestamp |

**Action Values:** CREATE, READ, UPDATE, DELETE, EXPORT

### 2.23 RefreshToken

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| userId | UUID | Yes | User reference |
| tokenHash | VARCHAR(255) | Yes | SHA256 hashed token |
| expiresAt | TIMESTAMP | Yes | Token expiry (7 days) |
| isRevoked | BOOLEAN | Yes | Revocation flag (default: false) |
| ipAddress | VARCHAR(45) | No | Client IP |
| userAgent | TEXT | No | Client user agent |
| createdAt | TIMESTAMP | Yes | Creation timestamp |

### 2.24 PasswordReset

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| userId | UUID | Yes | User reference |
| tokenHash | VARCHAR(255) | Yes | SHA256 hashed token |
| expiresAt | TIMESTAMP | Yes | Token expiry (1 hour) |
| usedAt | TIMESTAMP | No | When token was used |
| ipAddress | VARCHAR(45) | No | Request IP |
| createdAt | TIMESTAMP | Yes | Creation timestamp |

### 2.25 Notification

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| userId | UUID | Yes | Recipient user |
| type | VARCHAR(50) | Yes | Notification type |
| title | VARCHAR(200) | Yes | Notification title |
| message | TEXT | Yes | Notification content |
| data | JSONB | No | Additional payload |
| isRead | BOOLEAN | Yes | Read status (default: false) |
| readAt | TIMESTAMP | No | Read timestamp |
| createdAt | TIMESTAMP | Yes | Creation timestamp |

---

## 3. Relationships

### 3.1 Core Relationships

| Parent Entity | Child Entity | Relationship Type | Description |
|---------------|--------------|-------------------|-------------|
| Center | Student | 1:N | A center has many students |
| Center | Teacher | 1:N | A center has many teachers |
| Center | Class | 1:N | A center has many classes |
| Center | TuitionPlan | 1:N | A center has many tuition plans |
| Center | Invoice | 1:N | A center has many invoices |
| Center | AuditLog | 1:N | A center has many audit logs |
| User | Student | 1:1 | Optional link (for portal access) |
| User | Teacher | 1:1 | Optional link (for portal access) |
| User | Parent | 1:1 | Optional link (for portal access) |
| User | RefreshToken | 1:N | A user has many refresh tokens |
| User | Notification | 1:N | A user has many notifications |
| User | AuditLog | 1:N | A user has many audit logs |
| Student | Parent | 1:N | A student has many parents/guardians |
| Student | Enrollment | 1:N | A student has many enrollments |
| Student | Invoice | 1:N | A student has many invoices |
| Student | Evaluation | 1:N | A student has many evaluations |
| Class | Enrollment | 1:N | A class has many enrollments |
| Class | ClassTeacher | 1:N | A class has many teacher assignments |
| Class | Session | 1:N | A class has many sessions |
| Class | Evaluation | 1:N | A class has many evaluations |
| Class | TuitionPlan | 1:N (optional) | Class-specific tuition plans |
| Teacher | ClassTeacher | 1:N | A teacher has many class assignments |
| Teacher | Session | 1:N | A teacher has many sessions |
| Teacher | Evaluation | 1:N | A teacher has many evaluations |
| Session | AttendanceRecord | 1:N | A session has many attendance records |
| Session | SessionMaterial | 1:N | A session has many materials |
| Invoice | InvoiceItem | 1:N | An invoice has many line items |
| Invoice | Payment | 1:N | An invoice has many payments |
| TuitionPlan | Invoice | 1:N | A plan has many invoices |
| Role | RolePermission | 1:N | A role has many permissions |
| Role | UserRole | 1:N | A role has many user assignments |
| Permission | RolePermission | 1:N | A permission is assigned to many roles |
| User | UserRole | 1:N | A user has many role assignments |

### 3.2 Junction Tables

| Table | Purpose | Unique Constraint |
|-------|---------|-------------------|
| ClassTeacher | Many-to-many between Class and Teacher | (classId, teacherId, role) where role='primary' |
| RolePermission | Many-to-many between Role and Permission | (roleId, permissionId) |
| UserRole | Many-to-many between User and Role | (userId, roleId, centerId) |

---

## 4. Cardinality

### 4.1 Entity Cardinality Matrix

| Entity | Min | Max | Notes |
|--------|-----|-----|-------|
| User | 0 | ∞ | May exist without linked profile |
| Center | 1 | ∞ | At least one center required |
| Student | 0 | ∞ | May have no user account |
| Parent | 1 | ∞ | At least one parent per student |
| Teacher | 1 | ∞ | At least one teacher per center |
| Class | 0 | ∞ | May have no students initially |
| Enrollment | 1 | 1 | Per student-class pair |
| Session | 0 | ∞ | Generated from class schedule |
| AttendanceRecord | 0 | 1 | Per student-session pair |
| Evaluation | 0 | ∞ | Multiple evaluations per student |
| Invoice | 0 | ∞ | May have no invoices |
| Payment | 0 | ∞ | May have no payments |

### 4.2 Relationship Cardinality

```
Center (1) ──────────< Student (N)
Center (1) ──────────< Teacher (N)
Center (1) ──────────< Class (N)
Center (1) ──────────< TuitionPlan (N)
Center (1) ──────────< Invoice (N)
Center (1) ──────────< AuditLog (N)

Student (1) ─────────< Parent (N)
Student (1) ─────────< Enrollment (N)
Student (1) ─────────< Invoice (N)
Student (1) ─────────< Evaluation (N)

Class (1) ──────────< Enrollment (N)
Class (1) ──────────< Session (N)
Class (1) ──────────< ClassTeacher (N)
Class (1) ──────────< Evaluation (N)
Class (1) ──────────< TuitionPlan (0..1)

Teacher (1) ─────────< ClassTeacher (N)
Teacher (1) ─────────< Session (N)
Teacher (1) ─────────< Evaluation (N)

Session (1) ─────────< AttendanceRecord (N)
Session (1) ─────────< SessionMaterial (N)

Invoice (1) ─────────< InvoiceItem (N)
Invoice (1) ─────────< Payment (N)
TuitionPlan (1) ─────< Invoice (N)

Role (1) ───────────< RolePermission (N)
Role (1) ───────────< UserRole (N)
Permission (1) ──────< RolePermission (N)
User (1) ───────────< UserRole (N)
User (1) ───────────< RefreshToken (N)
User (1) ───────────< AuditLog (N)
```

---

## 5. Business Constraints

### 5.1 Student Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Age Limit | dateOfBirth must be between 3 and 25 years from today | CHECK constraint |
| Enrollment Date | enrollmentDate cannot be in the future | CHECK constraint |
| Unique Name | Full name + enrollment date must be unique within a center | UNIQUE constraint |
| Status Transition | Can only transition: active → inactive → archived | Application logic |

### 5.2 Class Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Capacity | capacity must be between 1 and 100 | CHECK constraint |
| Date Range | endDate must be >= startDate | CHECK constraint |
| Name Unique | Class name must be unique within a center | UNIQUE constraint |
| Schedule Required | schedule JSON must be valid and not empty for active classes | Application validation |

### 5.3 Session Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Time Valid | endTime must be > startTime | CHECK constraint |
| Date Valid | sessionDate must not be in the past for new sessions | Application logic |
| Conflict Detection | Same teacher cannot have overlapping sessions | Application logic |

### 5.4 Enrollment Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Date Range | endDate must be >= startDate | CHECK constraint |
| Unique Enrollment | Student can only have one active enrollment per class | UNIQUE constraint |
| Capacity Check | Enrollment blocked when class reaches capacity | Application logic |

### 5.5 Attendance Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Unique Record | One attendance record per student per session | UNIQUE constraint |
| Reason Required | reason is required when status = 'excused' | CHECK constraint |
| Valid Status | status must be one of: present, absent, late, excused | CHECK constraint |

### 5.6 Evaluation Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Rating Range | participation, homework, behavior must be 1-5 if provided | CHECK constraint |
| Type Valid | evaluationType must be one of: daily, weekly, monthly, term | CHECK constraint |
| One Per Day | One evaluation per student per class per day | UNIQUE constraint |

### 5.7 Invoice Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Amount Valid | amount must be > 0 | CHECK constraint |
| Discount Valid | discount must be >= 0 and <= amount | CHECK constraint |
| Total Valid | totalAmount = amount - discount | Application logic |
| Unique Number | invoiceNumber must be unique | UNIQUE constraint |
| Due Date | dueDate must be >= issueDate | CHECK constraint |

### 5.8 Payment Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Amount Valid | amount must be > 0 | CHECK constraint |
| Match Invoice | amount must not exceed remaining invoice balance | Application logic |

### 5.9 Teacher Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Email Unique | Email must be unique within a center | UNIQUE constraint |
| Hire Date | hireDate cannot be in the future | CHECK constraint |
| Salary Valid | salary must be > 0 if provided | CHECK constraint |

### 5.10 TuitionPlan Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Due Day | dueDay must be between 1 and 28 | CHECK constraint |
| Amount Valid | amount must be > 0 | CHECK constraint |
| Late Fee Valid | lateFee must be >= 0 if provided | CHECK constraint |

---

## 6. Indexes

### 6.1 Primary Indexes

All tables have `id` as the primary key with a B-tree index using UUID.

### 6.2 Foreign Key Indexes

| Table | Column | Index Name | Purpose |
|-------|--------|------------|---------|
| User | centerId | idx_users_center_id | Fast center lookups |
| Student | centerId | idx_students_center_id | Fast center lookups |
| Student | userId | idx_students_user_id | User link lookup |
| Student | status | idx_students_status | Status filtering |
| Student | fullName | idx_students_full_name | Name search |
| Teacher | centerId | idx_teachers_center_id | Fast center lookups |
| Teacher | email | idx_teachers_email | Email uniqueness |
| Teacher | status | idx_teachers_status | Status filtering |
| Parent | studentId | idx_parents_student_id | Student parents lookup |
| Parent | phone | idx_parents_phone | Phone search |
| Class | centerId | idx_classes_center_id | Fast center lookups |
| Class | status | idx_classes_status | Status filtering |
| Class | (centerId, name) | uk_classes_center_name | Unique class names |
| ClassTeacher | classId | idx_class_teachers_class_id | Class teachers lookup |
| ClassTeacher | teacherId | idx_class_teachers_teacher_id | Teacher classes lookup |
| Enrollment | studentId | idx_enrollments_student_id | Student enrollments |
| Enrollment | classId | idx_enrollments_class_id | Class enrollments |
| Enrollment | status | idx_enrollments_status | Status filtering |
| Session | classId | idx_sessions_class_id | Class sessions |
| Session | teacherId | idx_sessions_teacher_id | Teacher sessions |
| Session | sessionDate | idx_sessions_session_date | Date-based queries |
| Session | (classId, sessionDate) | idx_sessions_class_date | Class date lookups |
| AttendanceRecord | studentId | idx_attendance_student_id | Student attendance |
| AttendanceRecord | sessionId | idx_attendance_session_id | Session attendance |
| AttendanceRecord | status | idx_attendance_status | Status filtering |
| AttendanceRecord | (studentId, sessionId) | uk_attendance_student_session | Unique records |
| Evaluation | studentId | idx_evaluations_student_id | Student evaluations |
| Evaluation | classId | idx_evaluations_class_id | Class evaluations |
| Evaluation | (studentId, evaluationDate) | idx_evaluations_student_date | Date range queries |
| TuitionPlan | centerId | idx_tuition_plans_center_id | Center plans |
| TuitionPlan | isActive | idx_tuition_plans_is_active | Active filtering |
| Invoice | centerId | idx_invoices_center_id | Center invoices |
| Invoice | studentId | idx_invoices_student_id | Student invoices |
| Invoice | status | idx_invoices_status | Status filtering |
| Invoice | dueDate | idx_invoices_due_date | Overdue queries |
| Invoice | invoiceNumber | uk_invoices_number | Unique numbers |
| InvoiceItem | invoiceId | idx_invoice_items_invoice_id | Invoice items |
| Payment | invoiceId | idx_payments_invoice_id | Invoice payments |
| Payment | status | idx_payments_status | Status filtering |
| Payment | transactionDate | idx_payments_transaction_date | Date queries |
| RefreshToken | userId | idx_refresh_tokens_user_id | User tokens |
| RefreshToken | expiresAt | idx_refresh_tokens_expires_at | Expiry cleanup |
| AuditLog | userId | idx_audit_logs_user_id | User audit trail |
| AuditLog | centerId | idx_audit_logs_center_id | Center audit |
| AuditLog | resource | idx_audit_logs_resource | Resource queries |
| AuditLog | createdAt | idx_audit_logs_created_at | Time-based queries |
| Notification | userId | idx_notifications_user_id | User notifications |
| Notification | isRead | idx_notifications_is_read | Unread filtering |

### 6.3 Composite Indexes for Query Optimization

| Index Name | Columns | Purpose |
|------------|---------|---------|
| idx_students_center_status | (centerId, status) | Filter active students by center |
| idx_teachers_center_status | (centerId, status) | Filter active teachers by center |
| idx_classes_center_status | (centerId, status) | Filter active classes by center |
| idx_invoices_center_status | (centerId, status) | Filter invoices by status |
| idx_invoices_overdue | (centerId, status, dueDate) | Find overdue invoices |
| idx_evaluations_class_date | (classId, evaluationDate) | Class evaluations by date |

### 6.4 Partial Indexes

```sql
-- Active students only
CREATE INDEX idx_students_active ON students(center_id) WHERE status = 'active';

-- Pending payments
CREATE INDEX idx_payments_pending ON payments(invoice_id) WHERE status = 'pending';

-- Unread notifications
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- Issued but unpaid invoices
CREATE INDEX idx_invoices_unpaid ON invoices(center_id, due_date) WHERE status IN ('issued', 'overdue');
```

---

## 7. Unique Constraints

### 7.1 Unique Constraints List

| Table | Columns | Constraint Name | Reason |
|-------|---------|-----------------|--------|
| User | email | uk_users_email | Prevent duplicate accounts |
| Center | code | uk_centers_code | Unique center codes |
| Class | (centerId, name) | uk_classes_center_name | Unique class names per center |
| Student | (centerId, enrollmentDate, fullName) | uk_students_center_enrollment | Prevent duplicate enrollments |
| Teacher | (centerId, email) | uk_teachers_center_email | Unique teacher emails per center |
| Enrollment | (studentId, classId) | uk_enrollments_student_class | One enrollment per student per class |
| AttendanceRecord | (studentId, sessionId) | uk_attendance_student_session | One attendance per student per session |
| Role | name | uk_roles_name | Unique role names |
| Permission | name | uk_permissions_name | Unique permission names |
| RolePermission | (roleId, permissionId) | uk_role_permission | Prevent duplicate role permissions |
| UserRole | (userId, roleId, centerId) | uk_user_role_center | Prevent duplicate role assignments |
| Invoice | invoiceNumber | uk_invoices_number | Unique invoice numbers |

### 7.2 Semi-Unique Constraints

| Table | Columns | Condition | Reason |
|-------|---------|-----------|--------|
| ClassTeacher | (classId, teacherId) | role = 'primary' | Only one primary teacher per class |
| Parent | studentId | isPrimary = true | Only one primary parent per student |

---

## 8. Soft Delete Strategy

### 8.1 Soft Delete Overview

Entities use a `status` field for soft deletion rather than physical deletion to preserve historical data and maintain referential integrity.

### 8.2 Soft Delete Patterns

#### Pattern 1: Status-Based (Most Common)

```sql
-- All records have a status field
UPDATE students SET status = 'archived', updatedAt = NOW() WHERE id = ?;
SELECT * FROM students WHERE id = ? AND status != 'archived';
```

**Entities:** Student, Teacher, Class, Enrollment, User

#### Pattern 2: Archive Flag

```sql
-- Uses isArchived boolean flag
UPDATE classes SET isArchived = true, updatedAt = NOW() WHERE id = ?;
```

**Entities:** Class (with `status = 'archived'`)

#### Pattern 3: Deleted At Timestamp

```sql
-- Uses deletedAt timestamp
UPDATE invoices SET deletedAt = NOW() WHERE id = ?;
SELECT * FROM invoices WHERE deletedAt IS NULL;
```

**Entities:** AuditLog, Notification (for cleanup retention)

### 8.3 Query Filtering Pattern

```typescript
// Service layer always filters soft-deleted records
async getStudents(centerId: string, includeArchived = false) {
  const where = { centerId };
  if (!includeArchived) {
    where.status = { not: 'archived' };
  }
  return this.prisma.student.findMany({ where });
}
```

### 8.4 Cascade Behavior

| Entity | Delete Behavior | Notes |
|--------|-----------------|-------|
| Center | Cascade soft-delete | All children become inactive |
| Student | Soft-delete only | Preserves enrollment history |
| Class | Soft-delete only | Preserves sessions and evaluations |
| Enrollment | Soft-delete only | Preserves attendance records |
| User | Soft-delete only | Revokes access but preserves history |

### 8.5 Hard Delete Rules

Physical deletion (hard delete) is ONLY permitted for:

1. **Test Data**: During development/testing
2. **GDPR Requests**: When legally required (with audit trail)
3. **Orphaned Records**: Records with broken foreign keys (after verification)

---

## 9. Audit Fields

### 9.1 Standard Audit Fields

All tables include these common fields:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| createdAt | TIMESTAMP | Record creation timestamp |
| updatedAt | TIMESTAMP | Last modification timestamp |

### 9.2 User Audit Fields

| Field | Type | Description |
|-------|------|-------------|
| lastLoginAt | TIMESTAMP | Last successful login |
| lastLoginIp | VARCHAR(45) | Last login IP address |
| failedLoginCount | INT | Consecutive failed attempts |

### 9.3 Attendance Audit Fields

| Field | Type | Description |
|-------|------|-------------|
| recordedBy | UUID | Teacher who marked attendance |
| recordedAt | TIMESTAMP | When attendance was recorded |
| approvedBy | UUID | Manager who approved (if applicable) |
| approvedAt | TIMESTAMP | When approved |

### 9.4 Payment Audit Fields

| Field | Type | Description |
|-------|------|-------------|
| confirmedBy | UUID | Admin who confirmed payment |
| confirmedAt | TIMESTAMP | When payment was confirmed |

### 9.5 Audit Log Structure

```typescript
interface AuditLog {
  id: string;
  userId: string;
  centerId: string | null;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT';
  resource: string;
  resourceId: string | null;
  changes: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  } | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}
```

### 9.6 Audit Log Retention

| Data Type | Retention Period | Storage |
|-----------|------------------|---------|
| Authentication Events | 2 years | Database |
| Data Changes | 5 years | Database |
| Access Logs | 1 year | Database |
| Payment Records | 7 years | Database (legal requirement) |

---

## 10. Multi-Tenant Design

### 10.1 Tenant Isolation Strategy

The platform uses a **shared database, shared schema** approach with `centerId` as the primary isolation mechanism.

### 10.2 Tenant Scoping Rules

| Role | Access Scope | Query Filter |
|------|--------------|---------------|
| Super Admin | All centers | No filter |
| Center Manager | Own center | WHERE centerId = user's centerId |
| Teacher | Assigned classes | WHERE classId IN (assigned classIds) |
| Parent | Own child | WHERE studentId = linked studentId |

### 10.3 Query Pattern Enforcement

```sql
-- ✅ Correct: All queries filtered by center
SELECT * FROM students WHERE center_id = ?;
SELECT * FROM invoices WHERE center_id = ?;

-- ❌ Incorrect: Missing center filter
SELECT * FROM students WHERE status = 'active';
```

### 10.4 Cross-Tenant Prevention

1. **API Layer**: All endpoints verify centerId from authenticated user's session
2. **Service Layer**: All queries include centerId in WHERE clause
3. **Database Layer**: RLS policies can enforce tenant isolation (optional)

### 10.5 Multi-Tenant Indexes

```sql
-- All tenant-scoped tables include center_id in indexes
CREATE INDEX idx_students_center_id ON students(center_id);
CREATE INDEX idx_teachers_center_id ON teachers(center_id);
CREATE INDEX idx_classes_center_id ON classes(center_id);
CREATE INDEX idx_invoices_center_id ON invoices(center_id);
```

---

## Appendix A: Entity Summary Table

| Entity | PK | Soft Delete | Audit Fields | Multi-Tenant |
|--------|-----|-------------|--------------|--------------|
| User | id | status | createdAt, updatedAt | centerId |
| Center | id | status | createdAt, updatedAt | No |
| Student | id | status | createdAt, updatedAt | centerId |
| Parent | id | No | createdAt, updatedAt | No |
| Teacher | id | status | createdAt, updatedAt | centerId |
| Class | id | status | createdAt, updatedAt | centerId |
| ClassTeacher | id | No | createdAt | No |
| Enrollment | id | status | createdAt, updatedAt | No |
| Session | id | No | createdAt, updatedAt | No |
| AttendanceRecord | id | No | createdAt, updatedAt | No |
| AbsenceReason | id | isActive | createdAt | centerId |
| Evaluation | id | No | createdAt, updatedAt | No |
| SessionMaterial | id | No | createdAt | No |
| TuitionPlan | id | isActive | createdAt, updatedAt | centerId |
| Invoice | id | No | createdAt, updatedAt | centerId |
| InvoiceItem | id | No | createdAt | No |
| Payment | id | No | createdAt, updatedAt | No |
| Role | id | isActive | createdAt, updatedAt | No |
| Permission | id | No | createdAt | No |
| RolePermission | id | No | createdAt | No |
| UserRole | id | No | createdAt | centerId |
| AuditLog | id | No | createdAt | centerId |
| RefreshToken | id | No | createdAt | No |
| PasswordReset | id | No | createdAt | No |
| Notification | id | No | createdAt | No |

---

**Document End**