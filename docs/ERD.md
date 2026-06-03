# Entity Relationship Diagram
## Education Center Management Platform

**Document Version**: 1.0  
**Created**: 2026-06-03  
**Diagram Type**: Mermaid ERD

---

## Table of Contents

1. [Complete ERD](#1-complete-erd)
2. [Entity Definitions](#2-entity-definitions)
3. [Relationship Descriptions](#3-relationship-descriptions)

---

## 1. Complete ERD

```mermaid
erDiagram
    %% ============================================================
    %% PLATFORM CORE
    %% ============================================================
    
    CENTER {
        uuid id PK
        string name
        string code UK
        text address
        string phone
        string email
        string logoUrl
        string timezone
        jsonb settings
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    USER {
        uuid id PK
        uuid centerId FK "nullable"
        string email UK
        string passwordHash
        string phone
        string status
        timestamp lastLoginAt
        string lastLoginIp
        int failedLoginCount
        timestamp lockedUntil
        timestamp createdAt
        timestamp updatedAt
    }

    REFRESH_TOKEN {
        uuid id PK
        uuid userId FK
        string tokenHash
        timestamp expiresAt
        boolean isRevoked
        string ipAddress
        text userAgent
        timestamp createdAt
    }

    PASSWORD_RESET {
        uuid id PK
        uuid userId FK
        string tokenHash
        timestamp expiresAt
        timestamp usedAt
        string ipAddress
        timestamp createdAt
    }

    %% ============================================================
    %% STUDENT MANAGEMENT
    %% ============================================================

    STUDENT {
        uuid id PK
        uuid userId FK "nullable"
        uuid centerId FK
        string fullName
        date dateOfBirth
        string gender
        string phone
        string email
        text address
        string avatarUrl
        date enrollmentDate
        string status
        text notes
        timestamp createdAt
        timestamp updatedAt
    }

    PARENT {
        uuid id PK
        uuid userId FK "nullable"
        uuid studentId FK
        string fullName
        string relationship
        string phone
        string email
        string occupation
        text address
        boolean isPrimary
        timestamp createdAt
        timestamp updatedAt
    }

    %% ============================================================
    %% TEACHER MANAGEMENT
    %% ============================================================

    TEACHER {
        uuid id PK
        uuid userId FK "nullable"
        uuid centerId FK
        string fullName
        date dateOfBirth
        string gender
        string phone
        string email
        text address
        string qualification
        string specialization
        date hireDate
        decimal salary
        string status
        string avatarUrl
        text notes
        timestamp createdAt
        timestamp updatedAt
    }

    %% ============================================================
    %% CLASS MANAGEMENT
    %% ============================================================

    CLASS {
        uuid id PK
        uuid centerId FK
        string name
        text description
        string academicLevel
        int capacity
        string status
        string classroom
        jsonb schedule
        date startDate
        date endDate
        text notes
        timestamp createdAt
        timestamp updatedAt
    }

    CLASS_TEACHER {
        uuid id PK
        uuid classId FK
        uuid teacherId FK
        string role
        timestamp assignedAt
        timestamp createdAt
    }

    ENROLLMENT {
        uuid id PK
        uuid studentId FK
        uuid classId FK
        timestamp enrolledAt
        date startDate
        date endDate
        string status
        text notes
        timestamp createdAt
        timestamp updatedAt
    }

    %% ============================================================
    %% SCHEDULE & SESSIONS
    %% ============================================================

    SESSION {
        uuid id PK
        uuid classId FK
        uuid teacherId FK
        date sessionDate
        time startTime
        time endTime
        string classroom
        string sessionType
        string status
        text notes
        timestamp createdAt
        timestamp updatedAt
    }

    SESSION_MATERIAL {
        uuid id PK
        uuid sessionId FK
        string fileUrl
        string fileName
        string fileType
        int fileSize
        uuid uploadedBy
        timestamp createdAt
    }

    %% ============================================================
    %% ATTENDANCE
    %% ============================================================

    ATTENDANCE_RECORD {
        uuid id PK
        uuid studentId FK
        uuid sessionId FK
        string status
        text reason
        uuid recordedBy
        timestamp recordedAt
        uuid approvedBy
        timestamp approvedAt
        timestamp createdAt
        timestamp updatedAt
    }

    ABSENCE_REASON {
        uuid id PK
        uuid centerId FK "nullable"
        string name
        text description
        int displayOrder
        boolean isSystem
        boolean isActive
        timestamp createdAt
    }

    %% ============================================================
    %% EVALUATION
    %% ============================================================

    EVALUATION {
        uuid id PK
        uuid studentId FK
        uuid classId FK
        uuid teacherId FK
        string evaluationType
        date evaluationDate
        int participation
        int homework
        int behavior
        jsonb scores
        text comments
        timestamp createdAt
        timestamp updatedAt
    }

    %% ============================================================
    %% TUITION & PAYMENTS
    %% ============================================================

    TUITION_PLAN {
        uuid id PK
        uuid centerId FK
        uuid classId FK "nullable"
        string name
        decimal amount
        string currency
        string billingCycle
        int dueDay
        decimal lateFee
        text notes
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    INVOICE {
        uuid id PK
        uuid centerId FK
        string invoiceNumber UK
        uuid studentId FK
        uuid tuitionPlanId FK
        decimal amount
        decimal discount
        decimal totalAmount
        string status
        date issueDate
        date dueDate
        date paidDate
        decimal paidAmount
        string paymentMethod
        text notes
        timestamp createdAt
        timestamp updatedAt
    }

    INVOICE_ITEM {
        uuid id PK
        uuid invoiceId FK
        string description
        int quantity
        decimal amount
        timestamp createdAt
    }

    PAYMENT {
        uuid id PK
        uuid invoiceId FK
        decimal amount
        string paymentMethod
        string transactionId
        timestamp transactionDate
        string bankCode
        string qrCodeUrl
        string status
        uuid confirmedBy
        timestamp confirmedAt
        timestamp createdAt
        timestamp updatedAt
    }

    %% ============================================================
    %% RBAC
    %% ============================================================

    ROLE {
        uuid id PK
        string name UK
        text description
        boolean isSystem
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    PERMISSION {
        uuid id PK
        string name UK
        string module
        int level
        text description
        timestamp createdAt
    }

    ROLE_PERMISSION {
        uuid id PK
        uuid roleId FK
        uuid permissionId FK
        timestamp createdAt
    }

    USER_ROLE {
        uuid id PK
        uuid userId FK
        uuid roleId FK
        uuid centerId FK "nullable"
        timestamp createdAt
    }

    AUDIT_LOG {
        uuid id PK
        uuid userId FK
        uuid centerId FK "nullable"
        string action
        string resource
        uuid resourceId
        jsonb changes
        string ipAddress
        text userAgent
        timestamp createdAt
    }

    %% ============================================================
    %% NOTIFICATIONS
    %% ============================================================

    NOTIFICATION {
        uuid id PK
        uuid userId FK
        string type
        string title
        text message
        jsonb data
        boolean isRead
        timestamp readAt
        timestamp createdAt
    }

    %% ============================================================
    %% RELATIONSHIPS
    %% ============================================================

    %% Center relationships
    CENTER ||--o{ STUDENT : "has"
    CENTER ||--o{ TEACHER : "has"
    CENTER ||--o{ CLASS : "has"
    CENTER ||--o{ TUITION_PLAN : "has"
    CENTER ||--o{ INVOICE : "has"
    CENTER ||--o{ AUDIT_LOG : "has"

    %% User relationships
    USER ||--o{ STUDENT : "linked_to"
    USER ||--o{ TEACHER : "linked_to"
    USER ||--o{ PARENT : "linked_to"
    USER ||--o{ REFRESH_TOKEN : "has"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ USER_ROLE : "assigned"
    USER ||--o{ AUDIT_LOG : "creates"

    %% Student-Parent relationship
    STUDENT ||--o{ PARENT : "has"

    %% Student-Class relationships
    STUDENT ||--o{ ENROLLMENT : "enrolled_in"
    STUDENT ||--o{ EVALUATION : "receives"
    STUDENT ||--o{ INVOICE : "receives"

    %% Class relationships
    CLASS ||--o{ ENROLLMENT : "contains"
    CLASS ||--o{ CLASS_TEACHER : "assigned"
    CLASS ||--o{ SESSION : "scheduled"
    CLASS ||--o{ EVALUATION : "generates"
    CLASS ||--o{ TUITION_PLAN : "applies_to"

    %% Teacher relationships
    TEACHER ||--o{ CLASS_TEACHER : "assigned"
    TEACHER ||--o{ SESSION : "conducts"
    TEACHER ||--o{ EVALUATION : "creates"

    %% Session relationships
    SESSION ||--o{ ATTENDANCE_RECORD : "records"
    SESSION ||--o{ SESSION_MATERIAL : "contains"

    %% Invoice relationships
    INVOICE ||--o{ INVOICE_ITEM : "contains"
    INVOICE ||--o{ PAYMENT : "receives"

    %% Tuition relationships
    TUITION_PLAN ||--o{ INVOICE : "generates"

    %% RBAC relationships
    ROLE ||--o{ ROLE_PERMISSION : "grants"
    ROLE ||--o{ USER_ROLE : "assigned_to"
    PERMISSION ||--o{ ROLE_PERMISSION : "assigned_to"
    USER_ROLE }o--|| USER : "has"
    USER_ROLE }o--|| ROLE : "grants"
```

---

## 2. Entity Definitions

### 2.1 Core Entities

| Entity | Description | Parent | Cardinality |
|--------|-------------|--------|-------------|
| CENTER | Education center/tenant | - | 1 |
| USER | Platform users | CENTER | 0:N |
| STUDENT | Student records | CENTER | 0:N |
| PARENT | Parent/guardian | STUDENT | 1:N |
| TEACHER | Teacher profiles | CENTER | 1:N |
| CLASS | Class definitions | CENTER | 0:N |
| ENROLLMENT | Student-class enrollment | STUDENT, CLASS | M:N |
| SESSION | Teaching sessions | CLASS, TEACHER | N:1 |
| ATTENDANCE_RECORD | Attendance per session | STUDENT, SESSION | M:N |
| EVALUATION | Student evaluations | STUDENT, CLASS, TEACHER | M:N |

### 2.2 Financial Entities

| Entity | Description | Parent | Cardinality |
|--------|-------------|--------|-------------|
| TUITION_PLAN | Tuition fee plans | CENTER, CLASS | N:1, N:0 |
| INVOICE | Tuition invoices | CENTER, STUDENT, TUITION_PLAN | M:N |
| INVOICE_ITEM | Invoice line items | INVOICE | 1:N |
| PAYMENT | Payment records | INVOICE | M:1 |

### 2.3 RBAC Entities

| Entity | Description | Parent | Cardinality |
|--------|-------------|--------|-------------|
| ROLE | System roles | - | 1 |
| PERMISSION | Permission definitions | - | 1 |
| ROLE_PERMISSION | Role-permission mapping | ROLE, PERMISSION | M:N |
| USER_ROLE | User-role assignments | USER, ROLE | M:N |

### 2.4 Supporting Entities

| Entity | Description | Parent | Cardinality |
|--------|-------------|--------|-------------|
| REFRESH_TOKEN | JWT refresh tokens | USER | 1:N |
| PASSWORD_RESET | Password reset tokens | USER | 1:N |
| AUDIT_LOG | Audit trail | USER, CENTER | N:1, N:0 |
| NOTIFICATION | User notifications | USER | M:1 |
| ABSENCE_REASON | Absence reasons | CENTER | N:0 |
| SESSION_MATERIAL | Session materials | SESSION | 1:N |
| CLASS_TEACHER | Class-teacher assignments | CLASS, TEACHER | M:N |

---

## 3. Relationship Descriptions

### 3.1 Multi-Tenant Relationships

```
CENTER (1) ──────────────< STUDENT (N)
    │                         │
    │                         │
    ├───────< TEACHER (N) ───┤
    │                         │
    │                         │
    ├───────< CLASS (N) ─────┤
    │          │             │
    │          │             │
    │          ├───────< ENROLLMENT (N) >─────── STUDENT (N)
    │          │
    │          ├───────< SESSION (N)
    │          │         │
    │          │         ├───────< ATTENDANCE_RECORD (N) >─────── STUDENT (N)
    │          │         │
    │          │         └───────< EVALUATION (N) >─────── STUDENT (N)
    │          │
    │          └───────< CLASS_TEACHER (N) >─────── TEACHER (N)
    │
    ├───────< TUITION_PLAN (N)
    │          │
    │          └───────< INVOICE (N) >─────── STUDENT (N)
    │                     │
    │                     └───────< PAYMENT (N)
    │
    └───────< AUDIT_LOG (N)
```

### 3.2 User-Profile Relationships

```
USER (1) ────────────────< REFRESH_TOKEN (N)
    │
    ├───────────────< USER_ROLE (N) >─────── ROLE (1)
    │                       │
    │                       └───────< ROLE_PERMISSION (N) >─────── PERMISSION (1)
    │
    ├───────────────< NOTIFICATION (N)
    │
    ├───────────────< STUDENT (0..1)
    │
    ├───────────────< TEACHER (0..1)
    │
    └───────────────< PARENT (0..1)
```

### 3.3 Enrollment Relationship (Ternary)

```
STUDENT (N) <────── ENROLLMENT (N) >────── CLASS (N)
                 │
                 ├── enrolledAt: timestamp
                 ├── startDate: date
                 ├── endDate: date
                 ├── status: active|completed|withdrawn
                 └── notes: text
```

### 3.4 Attendance Relationship (Ternary)

```
STUDENT (N) <────── ATTENDANCE_RECORD (N) >────── SESSION (N)
                 │
                 ├── status: present|absent|late|excused
                 ├── reason: text
                 ├── recordedBy: uuid
                 ├── recordedAt: timestamp
                 ├── approvedBy: uuid
                 └── approvedAt: timestamp
```

### 3.5 Invoice Relationship

```
STUDENT (1) ───────< INVOICE (N)
                        │
                        ├── invoiceNumber: string (unique)
                        ├── amount: decimal
                        ├── discount: decimal
                        ├── totalAmount: decimal
                        ├── status: draft|issued|paid|overdue|cancelled
                        ├── issueDate: date
                        ├── dueDate: date
                        ├── paidDate: date
                        ├── paidAmount: decimal
                        └── paymentMethod: cash|bank_transfer|vietqr
                            │
                            └───────< PAYMENT (N)
                                │
                                ├── amount: decimal
                                ├── transactionId: string
                                ├── transactionDate: timestamp
                                ├── bankCode: string
                                └── status: pending|completed|failed
```

### 3.6 Role-Permission Matrix

```
ROLE (1) ───────< ROLE_PERMISSION (N) >────── PERMISSION (1)
    │
    ├── super_admin ──────────────── All permissions (platform-wide)
    ├── center_manager ────────────── Center-level permissions
    ├── teacher ────────────────────── Teaching-specific permissions
    └── parent ─────────────────────── Child-view permissions
```

---

## Appendix A: Cardinality Summary

| Relationship | Type | Parent | Child | Notes |
|--------------|------|--------|-------|-------|
| Center → Students | 1:N | CENTER | STUDENT | One center has many students |
| Center → Teachers | 1:N | CENTER | TEACHER | One center has many teachers |
| Center → Classes | 1:N | CENTER | CLASS | One center has many classes |
| Center → TuitionPlans | 1:N | CENTER | TUITION_PLAN | One center has many plans |
| Center → Invoices | 1:N | CENTER | INVOICE | One center has many invoices |
| Center → AuditLogs | 1:N | CENTER | AUDIT_LOG | One center has many logs |
| Student → Parents | 1:N | STUDENT | PARENT | One student has many parents |
| Student → Enrollments | 1:N | STUDENT | ENROLLMENT | One student has many enrollments |
| Student → Invoices | 1:N | STUDENT | INVOICE | One student has many invoices |
| Student → Evaluations | 1:N | STUDENT | EVALUATION | One student has many evaluations |
| Class → Enrollments | 1:N | CLASS | ENROLLMENT | One class has many enrollments |
| Class → Sessions | 1:N | CLASS | SESSION | One class has many sessions |
| Class → Evaluations | 1:N | CLASS | EVALUATION | One class has many evaluations |
| Class → ClassTeachers | 1:N | CLASS | CLASS_TEACHER | One class has many teachers |
| Class → TuitionPlans | 1:N | CLASS | TUITION_PLAN | Class-specific plans (optional) |
| Teacher → ClassTeachers | 1:N | TEACHER | CLASS_TEACHER | One teacher has many classes |
| Teacher → Sessions | 1:N | TEACHER | SESSION | One teacher has many sessions |
| Teacher → Evaluations | 1:N | TEACHER | EVALUATION | One teacher has many evaluations |
| Session → AttendanceRecords | 1:N | SESSION | ATTENDANCE_RECORD | One session has many records |
| Session → SessionMaterials | 1:N | SESSION | SESSION_MATERIAL | One session has many materials |
| Invoice → InvoiceItems | 1:N | INVOICE | INVOICE_ITEM | One invoice has many items |
| Invoice → Payments | 1:N | INVOICE | PAYMENT | One invoice has many payments |
| TuitionPlan → Invoices | 1:N | TUITION_PLAN | INVOICE | One plan has many invoices |
| Role → RolePermissions | 1:N | ROLE | ROLE_PERMISSION | One role has many permissions |
| Role → UserRoles | 1:N | ROLE | USER_ROLE | One role has many users |
| Permission → RolePermissions | 1:N | PERMISSION | ROLE_PERMISSION | One perm assigned to many roles |
| User → UserRoles | 1:N | USER | USER_ROLE | One user has many roles |
| User → RefreshTokens | 1:N | USER | REFRESH_TOKEN | One user has many tokens |
| User → Notifications | 1:N | USER | NOTIFICATION | One user has many notifications |
| User → AuditLogs | 1:N | USER | AUDIT_LOG | One user has many audit logs |

---

## Appendix B: Unique Constraints Summary

| Entity | Constraint | Columns |
|--------|------------|---------|
| CENTER | UK | code |
| USER | UK | email |
| CLASS | UK | centerId + name |
| STUDENT | UK | centerId + enrollmentDate + fullName |
| TEACHER | UK | centerId + email |
| ENROLLMENT | UK | studentId + classId |
| ATTENDANCE_RECORD | UK | studentId + sessionId |
| INVOICE | UK | invoiceNumber |
| ROLE | UK | name |
| PERMISSION | UK | name |
| ROLE_PERMISSION | UK | roleId + permissionId |
| USER_ROLE | UK | userId + roleId + centerId |

---

**Document End**