# Database Design Document
# Education Center Management Platform

**Document Version**: 1.0  
**Created**: 2026-06-03  
**Status**: Draft  
**Database**: PostgreSQL 15+  
**ORM**: Prisma 5.x  

---

## Table of Contents

1. [Database Architecture Overview](#1-database-architecture-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Entity Definitions](#3-entity-definitions)
4. [Index Strategy](#4-index-strategy)
5. [Data Integrity Rules](#5-data-integrity-rules)
6. [Multi-Tenant Design](#6-multi-tenant-design)
7. [Migration Strategy](#7-migration-strategy)

---

## 1. Database Architecture Overview

### 1.1 Schema Organization

The database follows a **multi-tenant design** where each education center operates as a isolated tenant. The schema is organized into the following modules:

| Module | Tables | Purpose |
|--------|--------|---------|
| Auth | users, sessions, refresh_tokens, password_reset_tokens | Authentication & session management |
| Core | centers, users, students, teachers, parents | Core entities with tenant isolation |
| Academic | classes, enrollments, sessions | Class management and enrollment |
| Attendance | attendance_records | Student attendance tracking |
| Evaluation | evaluations, evaluation_templates | Student evaluations |
| Financial | tuition_plans, invoices, invoice_items, payments | Tuition and payment management |
| RBAC | roles, permissions, role_permissions, user_roles | Role-based access control |
| Audit | audit_logs | System audit trail |
| Notification | notifications | User notifications |

### 1.2 Naming Conventions

| Object Type | Convention | Example |
|-------------|------------|---------|
| Table | snake_case, plural | students, attendance_records |
| Column | snake_case | first_name, created_at |
| Primary Key | id (UUID) | id |
| Foreign Key | {table_singular}_id | student_id, class_id |
| Index | idx_{table}_{column} | idx_students_center_id |
| Unique Constraint | uk_{table}_{columns} | uk_users_email |
| Check Constraint | chk_{table}_{column} | chk_students_age |
| Default Value | snake_case | created_at, updated_at |

### 1.3 Common Fields

All tables include these common fields:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

---

## 2. Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              PLATFORM LAYER                                        │
│                                                                                   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐                 │
│  │    roles    │◄──────►│ role_perms  │◄──────►│ permissions │                 │
│  │─────────────│         │─────────────│         │─────────────│                 │
│  │ id          │         │ role_id     │         │ id          │                 │
│  │ name        │         │ permission_ │         │ name        │                 │
│  │ description │         │ id          │         │ module      │                 │
│  │ is_system   │         └─────────────┘         │ level       │                 │
│  │ created_at  │                                   │ created_at  │                 │
│  └─────────────┘                                   └─────────────┘                 │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              user_roles                                      │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ user_id │ role_id │ center_id │ created_at                                  │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                     │
│         │     ┌────────────────────────────────────────────────────────────┐  │
│         │     │                     users                                     │  │
│         │     │────────────────────────────────────────────────────────────│  │
│         │     │ id (PK)        │ email              │ password_hash         │  │
│         │     │ center_id (FK) │ phone              │ status                │  │
│         │     │ created_at     │ updated_at         │ last_login_at        │  │
│         └────►│ last_login_ip   │ failed_login_count │ locked_until         │  │
│               └────────────────────────────────────────────────────────────┘  │
│                        │                              │                        │
│                        ▼                              ▼                        │
│               ┌──────────────────┐           ┌──────────────────┐            │
│               │  refresh_tokens  │           │ password_resets  │            │
│               │──────────────────│           │──────────────────│            │
│               │ id               │           │ id                │            │
│               │ user_id (FK)     │           │ user_id (FK)      │            │
│               │ token           │           │ token            │            │
│               │ expires_at      │           │ expires_at       │            │
│               │ created_at      │           │ used_at          │            │
│               │ ip_address      │           │ created_at       │            │
│               │ user_agent      │           │ ip_address       │            │
│               └──────────────────┘           └──────────────────┘            │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              CENTER LAYER (Multi-Tenant)                           │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                                centers                                        │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ id (PK)  │ name          │ code          │ phone                            │ │
│  │ address  │ email         │ status        │ timezone                         │ │
│  │ settings │ created_at    │ updated_at    │ logo_url                         │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                     │
│         │ 1:N                                                                    │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                               teachers                                        │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ id (PK)        │ user_id (FK)     │ center_id (FK)  │ full_name           │ │
│  │ date_of_birth  │ gender           │ phone           │ email               │ │
│  │ address        │ qualification    │ specialization  │ hire_date           │ │
│  │ status         │ salary           │ notes           │ avatar_url          │ │
│  │ created_at     │ updated_at       │                 │                      │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                     │
│         │ 1:N                                      1:N                         │
│         ▼                                                                     │       ┌─────────────────────────────────────┐
│  ┌──────────────────────────────────┐      ┌──────────────────────────────────┐   │       │            parents                    │
│  │       class_teachers             │      │          classes                 │   │       │─────────────────────────────────────│
│  │──────────────────────────────────│      │ id (PK)        │ name              │   │       │ id (PK)       │ user_id (FK)     │
│  │ class_id (FK)   │ teacher_id(FK) │◄─────│ center_id (FK) │ description      │   │       │ student_id(FK)│ full_name       │
│  │ role            │ assigned_at    │      │ academic_level │ capacity        │   │       │ relationship   │ phone           │
│  │ is_primary      │ created_at     │      │ status         │ classroom       │   │       │ email         │ occupation      │
│  └─────────────────┴────────────────┘      │ start_date     │ schedule (JSON)  │   │       │ address       │ created_at      │
│                                             │ end_date       │ notes           │   │       └───────────────┴─────────────────┘
│                                             │ created_at     │ updated_at      │   │                │
│                                             └───────────────────────────────────┘   │                │
│                                                    │                              │                │
│                                                    │ 1:N                          │                │
│                                                    ▼                              │                │
│                           ┌────────────────────────────────────────────────────┐ │                │
│                           │                    enrollments                      │◄┘                │
│                           │────────────────────────────────────────────────────│                  │
│                           │ id (PK) │ student_id (FK) │ class_id (FK)          │                  │
│                           │ enrolled_at │ status │ start_date │ end_date    │                  │
│                           └────────────────────────────────────────────────────┘                  │
│                                    │                                               │                │
│                                    │ 1:N                                           │                │
│                                    ▼                                               │                │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │                │
│  │                              students                                         │ │                │
│  │──────────────────────────────────────────────────────────────────────────────│ │                │
│  │ id (PK)        │ user_id (FK)     │ center_id (FK)  │ full_name             │ │                │
│  │ date_of_birth  │ gender          │ phone           │ email                 │ │                │
│  │ address        │ enrollment_date  │ status          │ avatar_url            │ │                │
│  │ notes          │ created_at      │ updated_at      │                       │ │                │
│  └──────────────────────────────────────────────────────────────────────────────┘ │                │
│         │                                                                     │                │
│         │ 1:N                                                                 │                │
│         ▼                                                                     │                │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │                │
│  │                         sessions                                           │   │                │
│  │──────────────────────────────────────────────────────────────────────────│   │                │
│  │ id (PK)        │ class_id (FK)    │ teacher_id (FK) │ session_date        │   │                │
│  │ start_time    │ end_time         │ classroom       │ session_type        │   │                │
│  │ status        │ notes            │ created_at      │ updated_at          │   │                │
│  └──────────────────────────────────────────────────────────────────────────┘   │                │
│         │                                                                     │                │
│         │ 1:N                                                                 │                │
│         ▼                                                                     │                │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │                │
│  │                       attendance_records                                   │   │                │
│  │──────────────────────────────────────────────────────────────────────────│   │                │
│  │ id (PK)        │ student_id (FK)  │ session_id (FK) │ status              │   │                │
│  │ reason         │ recorded_by(FK)  │ recorded_at    │ approved_by (FK)   │   │                │
│  │ approved_at    │ created_at      │ updated_at     │                     │   │                │
│  └──────────────────────────────────────────────────────────────────────────┘   │                │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           FINANCIAL LAYER                                         │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                            tuition_plans                                     │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ id (PK)        │ center_id (FK)   │ class_id (FK)    │ name                │ │
│  │ amount         │ currency         │ billing_cycle   │ due_day             │ │
│  │ late_fee       │ notes            │ is_active       │ created_at         │ │
│  │ updated_at     │                  │                 │                     │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                     │
│         │ 1:N                                                                    │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              invoices                                        │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ id (PK)              │ invoice_number     │ student_id (FK)    │ plan_id(FK) │ │
│  │ amount               │ discount           │ total_amount      │ status      │ │
│  │ issue_date           │ due_date            │ paid_date         │ paid_amount │ │
│  │ payment_method      │ notes               │ center_id (FK)    │ created_at  │ │
│  │ updated_at          │                     │                   │             │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                     │
│         │ 1:N                                                                    │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              payments                                         │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ id (PK)        │ invoice_id (FK)    │ amount         │ payment_method      │ │
│  │ transaction_id│ transaction_date    │ bank_code      │ status              │ │
│  │ confirmed_by(FK)│ confirmed_at      │ qr_code_url    │ created_at          │ │
│  │ updated_at    │                    │               │                     │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                            invoice_items                                      │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ id (PK)        │ invoice_id (FK)    │ description   │ amount               │ │
│  │ quantity       │ created_at        │              │                      │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           EVALUATION LAYER                                         │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                            evaluations                                        │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ id (PK)              │ student_id (FK)    │ class_id (FK)     │ teacher_id(FK) │
│  │ evaluation_type     │ evaluation_date    │ participation    │ homework       │
│  │ behavior             │ scores (JSON)      │ comments         │ created_at     │
│  │ updated_at          │                    │                  │                │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      session_materials                                        │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ id (PK)        │ session_id (FK)    │ file_url        │ file_type          │ │
│  │ file_name      │ file_size          │ uploaded_by(FK) │ created_at         │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           SUPPORT LAYER                                            │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                             audit_logs                                         │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ id (PK)        │ user_id (FK)     │ action          │ resource            │ │
│  │ resource_id   │ changes (JSON)   │ ip_address      │ user_agent          │ │
│  │ center_id(FK) │ created_at       │                 │                     │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                           notifications                                       │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ id (PK)        │ user_id (FK)     │ type            │ title                │ │
│  │ message        │ data (JSON)      │ is_read         │ read_at              │ │
│  │ created_at    │                  │                │                      │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     absence_reasons (Reference Table)                         │ │
│  │─────────────────────────────────────────────────────────────────────────────│ │
│  │ id (PK)        │ name              │ description     │ is_system          │ │
│  │ center_id(FK) │ display_order     │ is_active       │ created_at         │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Entity Definitions

### 3.1 Authentication Entities

#### users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| center_id | UUID | FK, nullable | NULL for platform admins |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| phone | VARCHAR(20) | nullable | Contact phone |
| status | ENUM | NOT NULL, DEFAULT 'active' | active, inactive, locked |
| last_login_at | TIMESTAMP | nullable | Last successful login |
| last_login_ip | VARCHAR(45) | nullable | Last login IP address |
| failed_login_count | INT | DEFAULT 0 | Consecutive failed attempts |
| locked_until | TIMESTAMP | nullable | Account lock expiry |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_users_email` ON (email)
- `idx_users_center_id` ON (center_id)
- `idx_users_status` ON (status)

#### sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, NOT NULL | User reference |
| token_hash | VARCHAR(255) | NOT NULL | Hashed session token |
| expires_at | TIMESTAMP | NOT NULL | Session expiry |
| ip_address | VARCHAR(45) | nullable | Client IP |
| user_agent | TEXT | nullable | Browser/client info |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_sessions_user_id` ON (user_id)
- `idx_sessions_expires_at` ON (expires_at)

#### refresh_tokens

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, NOT NULL | User reference |
| token_hash | VARCHAR(255) | NOT NULL | Hashed refresh token |
| expires_at | TIMESTAMP | NOT NULL | Token expiry (7 days) |
| is_revoked | BOOLEAN | DEFAULT false | Revocation flag |
| ip_address | VARCHAR(45) | nullable | Client IP |
| user_agent | TEXT | nullable | Browser/client info |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_refresh_tokens_user_id` ON (user_id)
- `idx_refresh_tokens_token_hash` ON (token_hash)
- `idx_refresh_tokens_expires_at` ON (expires_at)

#### password_reset_tokens

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, NOT NULL | User reference |
| token_hash | VARCHAR(255) | NOT NULL | Hashed reset token |
| expires_at | TIMESTAMP | NOT NULL | Token expiry (1 hour) |
| used_at | TIMESTAMP | nullable | When token was used |
| ip_address | VARCHAR(45) | nullable | Request IP |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_password_resets_user_id` ON (user_id)
- `idx_password_resets_token_hash` ON (token_hash)

---

### 3.2 Core Entities

#### centers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(200) | NOT NULL | Center name |
| code | VARCHAR(50) | UNIQUE, NOT NULL | Short code (e.g., "HCM01") |
| address | TEXT | nullable | Full address |
| phone | VARCHAR(20) | nullable | Contact phone |
| email | VARCHAR(255) | nullable | Contact email |
| logo_url | VARCHAR(500) | nullable | Logo image URL |
| timezone | VARCHAR(50) | DEFAULT 'Asia/Ho_Chi_Minh' | Center timezone |
| settings | JSONB | DEFAULT '{}' | Center-specific settings |
| status | ENUM | NOT NULL, DEFAULT 'active' | active, inactive |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_centers_code` ON (code)
- `idx_centers_status` ON (status)

#### students

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, nullable | Linked user account |
| center_id | UUID | FK, NOT NULL | Parent center |
| full_name | VARCHAR(100) | NOT NULL | Student full name |
| date_of_birth | DATE | NOT NULL | Date of birth |
| gender | ENUM | NOT NULL | male, female, other |
| phone | VARCHAR(20) | nullable | Contact phone |
| email | VARCHAR(255) | nullable | Contact email |
| address | TEXT | nullable | Home address |
| avatar_url | VARCHAR(500) | nullable | Photo URL |
| enrollment_date | DATE | NOT NULL | Enrollment date |
| status | ENUM | NOT NULL, DEFAULT 'active' | active, inactive, archived |
| notes | TEXT | nullable | Additional notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_students_center_id` ON (center_id)
- `idx_students_status` ON (status)
- `idx_students_full_name` ON (full_name)
- `idx_students_enrollment_date` ON (enrollment_date)

**Check Constraints:**
- `chk_students_age` CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '3 years' AND date_of_birth >= CURRENT_DATE - INTERVAL '25 years')

#### teachers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, nullable | Linked user account |
| center_id | UUID | FK, NOT NULL | Parent center |
| full_name | VARCHAR(100) | NOT NULL | Teacher full name |
| date_of_birth | DATE | NOT NULL | Date of birth |
| gender | ENUM | NOT NULL | male, female, other |
| phone | VARCHAR(20) | NOT NULL | Contact phone |
| email | VARCHAR(255) | NOT NULL | Email (unique per center) |
| address | TEXT | nullable | Home address |
| qualification | VARCHAR(200) | nullable | Education qualification |
| specialization | VARCHAR(200) | nullable | Teaching specialization |
| hire_date | DATE | NOT NULL | Employment start date |
| salary | DECIMAL(12,2) | nullable | Monthly salary |
| status | ENUM | NOT NULL, DEFAULT 'active' | active, inactive, terminated |
| avatar_url | VARCHAR(500) | nullable | Photo URL |
| notes | TEXT | nullable | Additional notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_teachers_center_id` ON (center_id)
- `idx_teachers_status` ON (status)
- `idx_teachers_email` ON (email)
- `idx_teachers_full_name` ON (full_name)

#### parents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, nullable | Linked user account |
| student_id | UUID | FK, NOT NULL | Primary student |
| full_name | VARCHAR(100) | NOT NULL | Parent/guardian name |
| relationship | ENUM | NOT NULL | father, mother, guardian, other |
| phone | VARCHAR(20) | NOT NULL | Contact phone |
| email | VARCHAR(255) | nullable | Contact email |
| occupation | VARCHAR(100) | nullable | Job title |
| address | TEXT | nullable | Contact address |
| is_primary | BOOLEAN | DEFAULT true | Primary contact flag |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_parents_student_id` ON (student_id)
- `idx_parents_phone` ON (phone)
- `idx_parents_email` ON (email)

---

### 3.3 Academic Entities

#### classes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| center_id | UUID | FK, NOT NULL | Parent center |
| name | VARCHAR(100) | NOT NULL | Class name |
| description | TEXT | nullable | Class description |
| academic_level | ENUM | NOT NULL | beginner, intermediate, advanced |
| capacity | INT | NOT NULL | Max students (1-100) |
| status | ENUM | NOT NULL, DEFAULT 'active' | active, inactive, completed, archived |
| classroom | VARCHAR(100) | nullable | Room/location |
| schedule | JSONB | NOT NULL, DEFAULT '{}' | Weekly schedule |
| start_date | DATE | NOT NULL | Class start date |
| end_date | DATE | nullable | Class end date |
| notes | TEXT | nullable | Additional notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_classes_center_id` ON (center_id)
- `idx_classes_status` ON (status)
- `idx_classes_academic_level` ON (academic_level)
- `uk_classes_center_name` ON (center_id, name) UNIQUE

#### class_teachers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| class_id | UUID | FK, NOT NULL | Class reference |
| teacher_id | UUID | FK, NOT NULL | Teacher reference |
| role | ENUM | NOT NULL, DEFAULT 'primary' | primary, substitute |
| assigned_at | TIMESTAMP | NOT NULL, DEFAULT now() | Assignment date |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_class_teachers_class_id` ON (class_id)
- `idx_class_teachers_teacher_id` ON (teacher_id)
- `uk_class_teachers_assignment` ON (class_id, teacher_id) UNIQUE WHERE role = 'primary'

#### enrollments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| student_id | UUID | FK, NOT NULL | Student reference |
| class_id | UUID | FK, NOT NULL | Class reference |
| enrolled_at | TIMESTAMP | NOT NULL, DEFAULT now() | Enrollment timestamp |
| start_date | DATE | NOT NULL | Enrollment start date |
| end_date | DATE | nullable | Enrollment end date |
| status | ENUM | NOT NULL, DEFAULT 'active' | active, completed, withdrawn |
| notes | TEXT | nullable | Enrollment notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_enrollments_student_id` ON (student_id)
- `idx_enrollments_class_id` ON (class_id)
- `idx_enrollments_status` ON (status)
- `uk_enrollments_student_class` ON (student_id, class_id) UNIQUE

**Check Constraints:**
- `chk_enrollments_dates` CHECK (end_date IS NULL OR end_date >= start_date)

#### sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| class_id | UUID | FK, NOT NULL | Class reference |
| teacher_id | UUID | FK, NOT NULL | Primary teacher |
| session_date | DATE | NOT NULL | Session date |
| start_time | TIME | NOT NULL | Start time (HH:MM) |
| end_time | TIME | NOT NULL | End time |
| classroom | VARCHAR(100) | nullable | Room/location |
| session_type | ENUM | NOT NULL, DEFAULT 'regular' | regular, makeup, trial |
| status | ENUM | NOT NULL, DEFAULT 'scheduled' | scheduled, completed, cancelled |
| notes | TEXT | nullable | Session notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_sessions_class_id` ON (class_id)
- `idx_sessions_teacher_id` ON (teacher_id)
- `idx_sessions_date` ON (session_date)
- `idx_sessions_status` ON (status)
- `idx_sessions_class_date` ON (class_id, session_date)

**Check Constraints:**
- `chk_sessions_time` CHECK (end_time > start_time)

---

### 3.4 Attendance Entities

#### attendance_records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| student_id | UUID | FK, NOT NULL | Student reference |
| session_id | UUID | FK, NOT NULL | Session reference |
| status | ENUM | NOT NULL | present, absent, late, excused |
| reason | TEXT | nullable | Absence reason |
| recorded_by | UUID | FK, NOT NULL | Teacher who recorded |
| recorded_at | TIMESTAMP | NOT NULL, DEFAULT now() | Recording timestamp |
| approved_by | UUID | FK, nullable | Manager who approved |
| approved_at | TIMESTAMP | nullable | Approval timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_attendance_student_id` ON (student_id)
- `idx_attendance_session_id` ON (session_id)
- `idx_attendance_status` ON (status)
- `idx_attendance_recorded_at` ON (recorded_at)
- `uk_attendance_student_session` ON (student_id, session_id) UNIQUE

#### absence_reasons

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| center_id | UUID | FK, nullable | NULL for system reasons |
| name | VARCHAR(100) | NOT NULL | Reason name |
| description | TEXT | nullable | Description |
| display_order | INT | DEFAULT 0 | Display order |
| is_system | BOOLEAN | DEFAULT false | System-defined flag |
| is_active | BOOLEAN | DEFAULT true | Active flag |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_absence_reasons_center_id` ON (center_id)
- `idx_absence_reasons_is_active` ON (is_active)

---

### 3.5 Evaluation Entities

#### evaluations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| student_id | UUID | FK, NOT NULL | Student reference |
| class_id | UUID | FK, NOT NULL | Class reference |
| teacher_id | UUID | FK, NOT NULL | Teacher reference |
| evaluation_type | ENUM | NOT NULL | daily, weekly, monthly, term |
| evaluation_date | DATE | NOT NULL | Date of evaluation |
| participation | INT | nullable | Rating 1-5 |
| homework | INT | nullable | Rating 1-5 |
| behavior | INT | nullable | Rating 1-5 |
| scores | JSONB | nullable | Subject scores |
| comments | TEXT | nullable | Teacher comments |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_evaluations_student_id` ON (student_id)
- `idx_evaluations_class_id` ON (class_id)
- `idx_evaluations_teacher_id` ON (teacher_id)
- `idx_evaluations_type` ON (evaluation_type)
- `idx_evaluations_date` ON (evaluation_date)
- `idx_evaluations_student_date` ON (student_id, evaluation_date)

**Check Constraints:**
- `chk_evaluations_ratings` CHECK (participation IS NULL OR (participation >= 1 AND participation <= 5))
- `chk_evaluations_homework` CHECK (homework IS NULL OR (homework >= 1 AND homework <= 5))
- `chk_evaluations_behavior` CHECK (behavior IS NULL OR (behavior >= 1 AND behavior <= 5))

#### session_materials

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| session_id | UUID | FK, NOT NULL | Session reference |
| file_url | VARCHAR(500) | NOT NULL | Cloudinary file URL |
| file_name | VARCHAR(255) | NOT NULL | Original file name |
| file_type | VARCHAR(100) | NOT NULL | MIME type |
| file_size | INT | NOT NULL | Size in bytes |
| uploaded_by | UUID | FK, NOT NULL | Uploader user ID |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_session_materials_session_id` ON (session_id)

---

### 3.6 Financial Entities

#### tuition_plans

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| center_id | UUID | FK, NOT NULL | Parent center |
| class_id | UUID | FK, nullable | Optional class-specific plan |
| name | VARCHAR(100) | NOT NULL | Plan name |
| amount | DECIMAL(12,2) | NOT NULL | Fee amount |
| currency | VARCHAR(3) | DEFAULT 'VND' | Currency code |
| billing_cycle | ENUM | NOT NULL | monthly, quarterly, term, yearly |
| due_day | INT | NOT NULL | Day of month (1-28) |
| late_fee | DECIMAL(12,2) | nullable | Daily late fee |
| notes | TEXT | nullable | Plan notes |
| is_active | BOOLEAN | DEFAULT true | Active flag |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_tuition_plans_center_id` ON (center_id)
- `idx_tuition_plans_class_id` ON (class_id)
- `idx_tuition_plans_is_active` ON (is_active)

#### invoices

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| center_id | UUID | FK, NOT NULL | Parent center |
| invoice_number | VARCHAR(50) | UNIQUE, NOT NULL | Auto-generated number |
| student_id | UUID | FK, NOT NULL | Student reference |
| tuition_plan_id | UUID | FK, NOT NULL | Plan reference |
| amount | DECIMAL(12,2) | NOT NULL | Original amount |
| discount | DECIMAL(12,2) | DEFAULT 0 | Discount amount |
| total_amount | DECIMAL(12,2) | NOT NULL | Final amount |
| status | ENUM | NOT NULL, DEFAULT 'draft' | draft, issued, paid, overdue, cancelled |
| issue_date | DATE | NOT NULL | Issue date |
| due_date | DATE | NOT NULL | Payment due date |
| paid_date | DATE | nullable | Payment date |
| paid_amount | DECIMAL(12,2) | nullable | Amount paid |
| payment_method | ENUM | nullable | cash, bank_transfer, vietqr |
| notes | TEXT | nullable | Invoice notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_invoices_center_id` ON (center_id)
- `idx_invoices_student_id` ON (student_id)
- `idx_invoices_status` ON (status)
- `idx_invoices_due_date` ON (due_date)
- `idx_invoices_issue_date` ON (issue_date)
- `uk_invoices_number` ON (invoice_number) UNIQUE

**Check Constraints:**
- `chk_invoices_amounts` CHECK (discount >= 0 AND discount <= amount)

#### invoice_items

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| invoice_id | UUID | FK, NOT NULL | Invoice reference |
| description | VARCHAR(255) | NOT NULL | Item description |
| quantity | INT | DEFAULT 1 | Quantity |
| amount | DECIMAL(12,2) | NOT NULL | Line item amount |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_invoice_items_invoice_id` ON (invoice_id)

#### payments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| invoice_id | UUID | FK, NOT NULL | Invoice reference |
| amount | DECIMAL(12,2) | NOT NULL | Payment amount |
| payment_method | ENUM | NOT NULL | cash, bank_transfer, vietqr |
| transaction_id | VARCHAR(100) | nullable | Bank transaction ID |
| transaction_date | TIMESTAMP | NOT NULL | Transaction timestamp |
| bank_code | VARCHAR(20) | nullable | Receiving bank code |
| qr_code_url | VARCHAR(500) | nullable | Generated QR code URL |
| status | ENUM | NOT NULL, DEFAULT 'pending' | pending, completed, failed |
| confirmed_by | UUID | FK, nullable | Admin who confirmed |
| confirmed_at | TIMESTAMP | nullable | Confirmation timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_payments_invoice_id` ON (invoice_id)
- `idx_payments_status` ON (status)
- `idx_payments_transaction_date` ON (transaction_date)

---

### 3.7 RBAC Entities

#### roles

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(50) | NOT NULL | Role name |
| description | TEXT | nullable | Role description |
| is_system | BOOLEAN | DEFAULT false | System-defined flag |
| is_active | BOOLEAN | DEFAULT true | Active flag |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_roles_name` ON (name)
- `idx_roles_is_system` ON (is_system)

**System Roles:**
- super_admin: Platform-wide access
- center_manager: Center-level access
- teacher: Class-level access
- parent: Student-level access

#### permissions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(100) | NOT NULL | Permission name |
| module | VARCHAR(50) | NOT NULL | Module name |
| level | INT | NOT NULL | Permission level (0-5) |
| description | TEXT | nullable | Permission description |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_permissions_module` ON (module)
- `uk_permissions_name` ON (name) UNIQUE

**Module Permission Naming:**
- {module}.{action} (e.g., students.read, students.create, students.update, students.delete)

#### role_permissions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| role_id | UUID | FK, NOT NULL | Role reference |
| permission_id | UUID | FK, NOT NULL | Permission reference |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_role_permissions_role_id` ON (role_id)
- `idx_role_permissions_permission_id` ON (permission_id)
- `uk_role_permission` ON (role_id, permission_id) UNIQUE

#### user_roles

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, NOT NULL | User reference |
| role_id | UUID | FK, NOT NULL | Role reference |
| center_id | UUID | FK, nullable | Center scope (NULL = all centers for super_admin) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_user_roles_user_id` ON (user_id)
- `idx_user_roles_role_id` ON (role_id)
- `idx_user_roles_center_id` ON (center_id)
- `uk_user_role_center` ON (user_id, role_id, center_id) UNIQUE

---

### 3.8 Support Entities

#### audit_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, NOT NULL | User who performed action |
| center_id | UUID | FK, nullable | Center context (for tenant isolation) |
| action | VARCHAR(50) | NOT NULL | Action type (CREATE, READ, UPDATE, DELETE, EXPORT) |
| resource | VARCHAR(100) | NOT NULL | Resource type |
| resource_id | UUID | nullable | Resource ID |
| changes | JSONB | nullable | Before/after values |
| ip_address | VARCHAR(45) | nullable | Client IP |
| user_agent | TEXT | nullable | Client user agent |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Action timestamp |

**Indexes:**
- `idx_audit_logs_user_id` ON (user_id)
- `idx_audit_logs_center_id` ON (center_id)
- `idx_audit_logs_resource` ON (resource)
- `idx_audit_logs_action` ON (action)
- `idx_audit_logs_created_at` ON (created_at)
- `idx_audit_logs_resource_id` ON (resource_id)

**Partitioning:** Consider partitioning by month for retention management.

#### notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, NOT NULL | Recipient user |
| type | VARCHAR(50) | NOT NULL | Notification type |
| title | VARCHAR(200) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification content |
| data | JSONB | nullable | Additional payload |
| is_read | BOOLEAN | DEFAULT false | Read status |
| read_at | TIMESTAMP | nullable | Read timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_notifications_user_id` ON (user_id)
- `idx_notifications_is_read` ON (is_read)
- `idx_notifications_created_at` ON (created_at)

---

## 4. Index Strategy

### 4.1 Primary Indexes

All tables have `id` as the primary key with a B-tree index.

### 4.2 Foreign Key Indexes

All foreign key columns are indexed to optimize join performance:
- `user_roles(user_id)`, `user_roles(role_id)`
- `students(center_id)`, `students(user_id)`
- `teachers(center_id)`, `teachers(user_id)`
- `classes(center_id)`
- `enrollments(student_id)`, `enrollments(class_id)`
- `sessions(class_id)`, `sessions(teacher_id)`
- `attendance_records(student_id)`, `attendance_records(session_id)`
- `invoices(student_id)`, `invoices(center_id)`
- `payments(invoice_id)`

### 4.3 Composite Indexes for Query Optimization

| Query Pattern | Index | Columns |
|---------------|-------|---------|
| Student list by center | idx_students_center_status | center_id, status |
| Class sessions by date | idx_sessions_class_date | class_id, session_date |
| Attendance by student/date | idx_attendance_student_date | student_id, recorded_at |
| Invoices by status | idx_invoices_status_due | status, due_date |
| Evaluation by student/date | idx_evaluations_student_date | student_id, evaluation_date |
| Audit logs by date range | idx_audit_logs_created | created_at, center_id |

### 4.4 Partial Indexes

```sql
-- Active students only
CREATE INDEX idx_students_active ON students(center_id) WHERE status = 'active';

-- Pending payments
CREATE INDEX idx_payments_pending ON payments(invoice_id) WHERE status = 'pending';

-- Unread notifications
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- Overdue invoices
CREATE INDEX idx_invoices_overdue ON invoices(center_id, due_date) WHERE status = 'overdue';
```

---

## 5. Data Integrity Rules

### 5.1 Unique Constraints

| Entity | Constraint | Reason |
|--------|------------|--------|
| users | email | Prevent duplicate accounts |
| centers | code | Unique center codes |
| classes | (center_id, name) | Unique class names per center |
| students | (center_id, enrollment_date, full_name) | Prevent duplicate enrollments |
| enrollments | (student_id, class_id) | One enrollment per student per class |
| role_permissions | (role_id, permission_id) | Prevent duplicate role permissions |
| user_roles | (user_id, role_id, center_id) | Prevent duplicate role assignments |
| attendance_records | (student_id, session_id) | One attendance per student per session |

### 5.2 Check Constraints

| Table | Constraint | Rule |
|-------|------------|------|
| students | age | Date of birth between 3 and 25 years ago |
| enrollments | dates | End date >= start date |
| sessions | time | End time > start time |
| evaluations | ratings | Values between 1 and 5 |
| invoices | amounts | Discount <= amount |
| tuition_plans | due_day | Value between 1 and 28 |

### 5.3 Foreign Key Constraints

All foreign keys use `ON DELETE RESTRICT` or `ON DELETE CASCADE` as appropriate:
- User deletions require reassignment of linked records
- Center deletions cascade to all center data (soft delete preferred)
- Class deletions require withdrawal of enrollments first

### 5.4 Trigger Requirements

1. **invoice_number_generation**: Auto-generate invoice numbers on insert
2. **timestamp_updates**: Auto-update `updated_at` on record changes
3. **enrollment_status_sync**: Sync student enrollment count with class capacity
4. **attendance_session_validation**: Prevent duplicate attendance records

---

## 6. Multi-Tenant Design

### 6.1 Tenant Isolation Strategy

The platform uses a **shared database, shared schema** approach with `center_id` as the primary isolation mechanism.

```
┌─────────────────────────────────────────────────────────────┐
│                      Platform Layer                          │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ Super Admins│ │  Roles   │ │  Settings │              │
│  └───────────┘  └───────────┘  └───────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Tenant Layer                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    centers                               │ │
│  │                         │                               │ │
│  │    ┌────────────────────┼────────────────────┐          │ │
│  │    ▼                    ▼                    ▼          │ │
│  │ ┌──────┐          ┌──────────┐          ┌─────────┐   │ │
│  │ │Students│        │ Teachers │          │ Classes │   │ │
│  │ └──────┘          └──────────┘          └─────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Financial Records (invoices, payments)      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Row-Level Security (RLS)

All tenant-scoped queries MUST include `center_id` in WHERE clauses:

```sql
-- ✅ Correct: All queries filtered by center
SELECT * FROM students WHERE center_id = ?;
SELECT * FROM invoices WHERE center_id = ?;

-- ❌ Incorrect: Missing center filter
SELECT * FROM students WHERE status = 'active';
```

### 6.3 Access Patterns

| Role | Access Scope |
|------|--------------|
| Super Admin | All centers (no center_id filter) |
| Center Manager | Own center only (center_id = user's center) |
| Teacher | Assigned classes and their students |
| Parent | Own child's records only |

---

## 7. Migration Strategy

### 7.1 Migration Naming Convention

```
{version}_{short_description}.sql
YYYYMMDD_{action}_{table_name}.sql
```

**Examples:**
- `001_add_centers_table.sql`
- `20260603_create_auth_tables.sql`
- `006_add_tuition_tables.sql`

### 7.2 Migration File Structure

```sql
-- Migration: 003_add_students_table.sql
-- Description: Create students table with parent info
-- Created: 2026-06-03

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    avatar_url VARCHAR(500),
    enrollment_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_students_center_id ON students(center_id);
CREATE INDEX idx_students_status ON students(status);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 7.3 Initial Seed Data

```sql
-- System Roles
INSERT INTO roles (id, name, description, is_system, is_active) VALUES
    (uuid_generate_v4(), 'super_admin', 'Platform-wide administrator', true, true),
    (uuid_generate_v4(), 'center_manager', 'Education center manager', true, true),
    (uuid_generate_v4(), 'teacher', 'Class teacher', true, true),
    (uuid_generate_v4(), 'parent', 'Student parent/guardian', true, true);

-- System Permissions
INSERT INTO permissions (id, name, module, level, description) VALUES
    -- Students
    (uuid_generate_v4(), 'students.read', 'students', 1, 'View student records'),
    (uuid_generate_v4(), 'students.create', 'students', 2, 'Create student records'),
    (uuid_generate_v4(), 'students.update', 'students', 3, 'Update student records'),
    (uuid_generate_v4(), 'students.delete', 'students', 4, 'Delete/archive student records'),
    -- Classes
    (uuid_generate_v4(), 'classes.read', 'classes', 1, 'View class information'),
    (uuid_generate_v4(), 'classes.create', 'classes', 2, 'Create classes'),
    (uuid_generate_v4(), 'classes.update', 'classes', 3, 'Update class information'),
    (uuid_generate_v4(), 'classes.delete', 'classes', 4, 'Archive classes'),
    -- Attendance
    (uuid_generate_v4(), 'attendance.read', 'attendance', 1, 'View attendance records'),
    (uuid_generate_v4(), 'attendance.create', 'attendance', 2, 'Mark attendance'),
    (uuid_generate_v4(), 'attendance.update', 'attendance', 3, 'Update attendance'),
    -- ... more permissions
;

-- System Absence Reasons
INSERT INTO absence_reasons (id, name, description, is_system, is_active) VALUES
    (uuid_generate_v4(), 'Sick', 'Student illness', true, true),
    (uuid_generate_v4(), 'Family Emergency', 'Family urgent matter', true, true),
    (uuid_generate_v4(), 'Religious Observance', 'Religious holiday', true, true),
    (uuid_generate_v4(), 'School/Event Conflict', 'Other school or event', true, true),
    (uuid_generate_v4(), 'Transportation Issue', 'Transportation problems', true, true),
    (uuid_generate_v4(), 'Weather Condition', 'Bad weather', true, true),
    (uuid_generate_v4(), 'Other', 'Other reason (description required)', true, true);
```

---

## Appendix A: Entity Relationship Summary Table

| Parent Entity | Child Entity | Relationship | Type |
|---------------|--------------|--------------|------|
| center | students | 1:N | Each center has many students |
| center | teachers | 1:N | Each center has many teachers |
| center | classes | 1:N | Each center has many classes |
| center | tuition_plans | 1:N | Each center has many tuition plans |
| center | invoices | 1:N | Each center has many invoices |
| center | audit_logs | 1:N | Each center has many audit logs |
| user | students | 1:1 | Optional link (for parent accounts) |
| user | teachers | 1:1 | Optional link (for teacher accounts) |
| user | parents | 1:1 | Optional link (for parent accounts) |
| user | refresh_tokens | 1:N | Each user has many refresh tokens |
| user | notifications | 1:N | Each user has many notifications |
| student | parents | 1:N | Each student has many parents |
| student | enrollments | 1:N | Each student has many enrollments |
| student | invoices | 1:N | Each student has many invoices |
| student | evaluations | 1:N | Each student has many evaluations |
| class | enrollments | 1:N | Each class has many enrollments |
| class | class_teachers | 1:N | Each class has many teachers |
| class | sessions | 1:N | Each class has many sessions |
| class | tuition_plans | 1:N (optional) | Class-specific tuition plans |
| teacher | class_teachers | 1:N | Each teacher has many class assignments |
| teacher | sessions | 1:N | Each teacher has many sessions |
| teacher | evaluations | 1:N | Each teacher has many evaluations |
| enrollment | attendance_records | 1:N | Each enrollment has many attendance records |
| session | attendance_records | 1:N | Each session has many attendance records |
| session | session_materials | 1:N | Each session has many materials |
| invoice | invoice_items | 1:N | Each invoice has many line items |
| invoice | payments | 1:N | Each invoice has many payments |
| role | role_permissions | 1:N | Each role has many permissions |
| role | user_roles | 1:N | Each role has many user assignments |
| permission | role_permissions | 1:N | Each permission is assigned to many roles |
| user | user_roles | 1:N | Each user has many role assignments |

---

**Document End**