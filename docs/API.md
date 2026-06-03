# API Documentation
## Education Center Management Platform

**Document Version**: 1.0  
**Created**: 2026-06-03  
**API Version**: v1  
**Base URL**: `/api/v1`

---

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Common Patterns](#3-common-patterns)
4. [Auth Module](#4-auth-module)
5. [Users Module](#5-users-module)
6. [Students Module](#6-students-module)
7. [Teachers Module](#7-teachers-module)
8. [Classes Module](#8-classes-module)
9. [Attendance Module](#9-attendance-module)
10. [Sessions Module](#10-sessions-module)
11. [Evaluations Module](#11-evaluations-module)
12. [Tuition Module](#12-tuition-module)
13. [Payments Module](#13-payments-module)
14. [Dashboard Module](#14-dashboard-module)
15. [Error Codes](#15-error-codes)

---

## 1. API Overview

### 1.1 Base URL

```
Production: https://api.educationplatform.com/api/v1
Development: http://localhost:3000/api/v1
```

### 1.2 Content Type

All requests and responses use JSON format:

```
Content-Type: application/json
```

### 1.3 API Versioning

The API uses URL-based versioning. All endpoints are prefixed with `/api/v1`.

### 1.4 Pagination

List endpoints support pagination with the following parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page (max: 100) |
| sort | string | createdAt | Sort field |
| order | string | desc | Sort order (asc/desc) |

**Paginated Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "timestamp": "2026-06-03T10:30:00Z"
  }
}
```

### 1.5 Filtering

Filter parameters are passed as query strings:

```
GET /api/v1/students?status=active&centerId=xxx&search=john
GET /api/v1/students?enrollmentDateFrom=2026-01-01&enrollmentDateTo=2026-06-30
```

### 1.6 Date Format

All dates use ISO 8601 format:

```
Date: 2026-06-03
DateTime: 2026-06-03T10:30:00Z
```

---

## 2. Authentication & Authorization

### 2.1 Authentication Methods

#### JWT Bearer Token

All protected endpoints require JWT authentication:

```
Authorization: Bearer <access_token>
```

#### Token Response (Login)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

### 2.2 Token Lifetimes

| Token Type | Lifetime | Storage |
|------------|----------|---------|
| Access Token | 15 minutes | Memory |
| Refresh Token | 7 days | HttpOnly Cookie |

### 2.3 Authorization Header

```
GET /api/v1/students
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.4 Permission Levels

| Level | Code | Description |
|-------|------|-------------|
| None | 0 | No access |
| Read | 1 | View records |
| Create | 2 | Create new records |
| Update | 3 | Modify existing records |
| Delete | 4 | Remove records |
| Export | 5 | Export data |

### 2.5 Role Permissions Matrix

| Module | Super Admin | Center Manager | Teacher | Parent |
|--------|-------------|-----------------|---------|--------|
| centers | CRUD | R | - | - |
| students | CRUD | CRUD | R | R (own) |
| teachers | CRUD | CRUD | R (assigned) | - |
| classes | CRUD | CRUD | R (assigned) | R (enrolled) |
| attendance | CRUD | CRUD | CRU | R (own) |
| sessions | CRUD | CRUD | RU | R (own) |
| evaluations | CRUD | CRUD | CRU | R (own) |
| tuition | CRUD | CRUD | - | R (own) |
| payments | CRUD | CRUD | - | C (confirm) |
| dashboard | CRUD | RU | R (assigned) | R (own) |

### 2.6 Multi-Tenant Isolation

- **Super Admin**: Access all centers (no filtering)
- **Center Manager**: Access own center only (`centerId` from token)
- **Teacher**: Access assigned classes only
- **Parent**: Access own child's records only

---

## 3. Common Patterns

### 3.1 Success Response

**Single Resource:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "John Doe",
    "..."
  },
  "meta": {
    "timestamp": "2026-06-03T10:30:00Z"
  }
}
```

**List Resource:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "..." },
    { "id": "uuid", "..." }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "timestamp": "2026-06-03T10:30:00Z"
  }
}
```

### 3.2 Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "fullName", "message": "Required field" }
    ],
    "timestamp": "2026-06-03T10:30:00Z"
  }
}
```

### 3.3 HTTP Status Codes

| Code | Status | Usage |
|------|--------|-------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Business rule violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### 3.4 Request Body Format

```json
{
  "email": "john@example.com",
  "password": "securePassword123",
  "centerId": "uuid"
}
```

### 3.5 File Upload

```
Content-Type: multipart/form-data
```

---

## 4. Auth Module

### 4.1 POST /api/v1/auth/login

**Description:** Authenticate user and return tokens

**Authentication:** None required

**Request Body:**
```json
{
  "email": "string (required, email format)",
  "password": "string (required, min 8 chars)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "uuid",
      "email": "admin@center.com",
      "role": "center_manager",
      "centerId": "uuid"
    }
  }
}
```

**Error Responses:**
- 400: `VALIDATION_ERROR` - Invalid email or password format
- 401: `INVALID_CREDENTIALS` - Wrong email or password
- 423: `ACCOUNT_LOCKED` - Account locked due to failed attempts

---

### 4.2 POST /api/v1/auth/logout

**Description:** Invalidate refresh token and logout

**Authentication:** Required

**Request Body:**
```json
{
  "refreshToken": "string (optional, clears specific token)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### 4.3 POST /api/v1/auth/forgot-password

**Description:** Request password reset email

**Authentication:** None required

**Request Body:**
```json
{
  "email": "string (required, email format)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "If email exists, reset instructions will be sent"
  }
}
```

**Note:** Always returns success to prevent email enumeration.

---

### 4.4 POST /api/v1/auth/reset-password

**Description:** Reset password using token

**Authentication:** None required

**Request Body:**
```json
{
  "token": "string (required, from email)",
  "password": "string (required, min 8 chars)",
  "confirmPassword": "string (required, must match password)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

**Error Responses:**
- 400: `TOKEN_EXPIRED` - Reset token has expired
- 400: `TOKEN_INVALID` - Invalid reset token

---

### 4.5 POST /api/v1/auth/refresh

**Description:** Refresh access token

**Authentication:** None (uses cookie or body)

**Request Body:**
```json
{
  "refreshToken": "string (optional, from cookie or body)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

**Error Responses:**
- 401: `REFRESH_TOKEN_EXPIRED` - Refresh token expired
- 401: `REFRESH_TOKEN_INVALID` - Invalid refresh token

---

### 4.6 GET /api/v1/auth/me

**Description:** Get current authenticated user

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@center.com",
    "phone": "0123456789",
    "status": "active",
    "roles": [
      { "id": "uuid", "name": "center_manager", "centerId": "uuid" }
    ],
    "center": {
      "id": "uuid",
      "name": "Ho Chi Minh Center",
      "code": "HCM01"
    },
    "createdAt": "2026-01-15T08:00:00Z"
  }
}
```

---

### 4.7 PUT /api/v1/auth/password

**Description:** Change password for authenticated user

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "string (required)",
  "password": "string (required, min 8 chars)",
  "confirmPassword": "string (required, must match)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Error Responses:**
- 400: `PASSWORD_MISMATCH` - Passwords don't match
- 401: `INVALID_PASSWORD` - Current password incorrect

---

## 5. Users Module

### 5.1 GET /api/v1/users

**Description:** List users (admin only)

**Authentication:** Required
**Permissions:** centers.read (Super Admin only)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 20, max: 100) |
| centerId | uuid | Filter by center |
| status | string | Filter by status (active/inactive/locked) |
| search | string | Search by email or name |
| role | string | Filter by role name |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "phone": "0123456789",
      "status": "active",
      "roles": [{ "name": "center_manager", "centerId": "uuid" }],
      "lastLoginAt": "2026-06-03T08:00:00Z",
      "createdAt": "2026-01-15T08:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
}
```

---

### 5.2 POST /api/v1/users

**Description:** Create new user

**Authentication:** Required
**Permissions:** centers.create (Super Admin only)

**Request Body:**
```json
{
  "email": "string (required, unique)",
  "password": "string (required, min 8 chars)",
  "phone": "string (optional)",
  "centerId": "uuid (required for non-super_admin)",
  "roles": [
    { "roleId": "uuid", "centerId": "uuid (optional)" }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "status": "active",
    "createdAt": "2026-06-03T10:00:00Z"
  }
}
```

---

### 5.3 GET /api/v1/users/:id

**Description:** Get user by ID

**Authentication:** Required
**Permissions:** Own record or centers.read (Super Admin)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "0123456789",
    "status": "active",
    "roles": [{ "name": "teacher", "centerId": "uuid" }],
    "center": { "id": "uuid", "name": "Center Name" },
    "lastLoginAt": "2026-06-03T08:00:00Z",
    "failedLoginCount": 0,
    "createdAt": "2026-01-15T08:00:00Z",
    "updatedAt": "2026-06-03T08:00:00Z"
  }
}
```

---

### 5.4 PUT /api/v1/users/:id

**Description:** Update user

**Authentication:** Required
**Permissions:** Own record or centers.update (Super Admin)

**Request Body:**
```json
{
  "phone": "string (optional)",
  "status": "string (optional, active/inactive/locked)",
  "roles": [
    { "roleId": "uuid", "centerId": "uuid" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "0987654321",
    "status": "active",
    "updatedAt": "2026-06-03T10:00:00Z"
  }
}
```

---

### 5.5 DELETE /api/v1/users/:id

**Description:** Deactivate user (soft delete)

**Authentication:** Required
**Permissions:** centers.delete (Super Admin only)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "inactive",
    "message": "User deactivated successfully"
  }
}
```

---

### 5.6 GET /api/v1/users/:id/audit-logs

**Description:** Get audit logs for user

**Authentication:** Required
**Permissions:** Own record or audit.read (Super Admin)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Filter from date |
| endDate | date | Filter to date |
| action | string | Filter by action (CREATE/UPDATE/DELETE) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "UPDATE",
      "resource": "student",
      "resourceId": "uuid",
      "changes": { "before": { "status": "active" }, "after": { "status": "archived" } },
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-06-03T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

---

## 6. Students Module

### 6.1 GET /api/v1/students

**Description:** List students with filtering and pagination

**Authentication:** Required
**Permissions:** students.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| limit | integer | Items per page |
| centerId | uuid | Filter by center (auto for non-admin) |
| status | string | active, inactive, archived |
| gender | string | male, female, other |
| search | string | Search by name, email, phone |
| enrollmentDateFrom | date | Filter enrollment start |
| enrollmentDateTo | date | Filter enrollment end |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fullName": "Nguyen Van A",
      "dateOfBirth": "2015-03-15",
      "gender": "male",
      "phone": "0123456789",
      "email": "parent@email.com",
      "status": "active",
      "enrollmentDate": "2026-01-15",
      "center": { "id": "uuid", "name": "Center Name" },
      "currentClass": { "id": "uuid", "name": "Class 1A" },
      "createdAt": "2026-01-15T08:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

---

### 6.2 POST /api/v1/students

**Description:** Create new student

**Authentication:** Required
**Permissions:** students.create

**Request Body:**
```json
{
  "centerId": "uuid (required)",
  "fullName": "string (required, 2-100 chars)",
  "dateOfBirth": "date (required, age 3-25)",
  "gender": "string (required, male/female/other)",
  "phone": "string (optional)",
  "email": "string (optional, valid email)",
  "address": "string (optional)",
  "enrollmentDate": "date (required)",
  "notes": "string (optional, max 2000 chars)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Nguyen Van A",
    "dateOfBirth": "2015-03-15",
    "gender": "male",
    "status": "active",
    "enrollmentDate": "2026-06-03",
    "createdAt": "2026-06-03T10:00:00Z"
  }
}
```

**Error Responses:**
- 400: `VALIDATION_ERROR` - Invalid input data
- 409: `DUPLICATE_STUDENT` - Student with same name and enrollment date exists

---

### 6.3 GET /api/v1/students/:id

**Description:** Get student by ID

**Authentication:** Required
**Permissions:** students.read

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Nguyen Van A",
    "dateOfBirth": "2015-03-15",
    "gender": "male",
    "phone": "0123456789",
    "email": "parent@email.com",
    "address": "123 Street, District 1",
    "avatarUrl": "https://...",
    "status": "active",
    "enrollmentDate": "2026-01-15",
    "notes": "Special needs: None",
    "center": { "id": "uuid", "name": "Center Name" },
    "parents": [
      {
        "id": "uuid",
        "fullName": "Nguyen Van B",
        "relationship": "father",
        "phone": "0987654321",
        "email": "father@email.com",
        "isPrimary": true
      }
    ],
    "createdAt": "2026-01-15T08:00:00Z",
    "updatedAt": "2026-06-01T10:00:00Z"
  }
}
```

---

### 6.4 PUT /api/v1/students/:id

**Description:** Update student

**Authentication:** Required
**Permissions:** students.update

**Request Body:**
```json
{
  "fullName": "string (optional)",
  "phone": "string (optional)",
  "email": "string (optional)",
  "address": "string (optional)",
  "avatarUrl": "string (optional)",
  "notes": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Nguyen Van A Updated",
    "updatedAt": "2026-06-03T10:00:00Z"
  }
}
```

---

### 6.5 DELETE /api/v1/students/:id

**Description:** Archive student (soft delete)

**Authentication:** Required
**Permissions:** students.delete

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "archived",
    "message": "Student archived successfully"
  }
}
```

---

### 6.6 GET /api/v1/students/:id/enrollments

**Description:** Get student's enrollment history

**Authentication:** Required
**Permissions:** students.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by enrollment status |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "class": {
        "id": "uuid",
        "name": "Class 1A",
        "academicLevel": "beginner"
      },
      "status": "active",
      "startDate": "2026-01-15",
      "enrolledAt": "2026-01-10T08:00:00Z"
    },
    {
      "id": "uuid",
      "class": { "id": "uuid", "name": "Class 2A", "academicLevel": "intermediate" },
      "status": "completed",
      "startDate": "2025-09-01",
      "endDate": "2026-05-31",
      "enrolledAt": "2025-08-25T08:00:00Z"
    }
  ]
}
```

---

### 6.7 GET /api/v1/students/:id/attendance

**Description:** Get student's attendance records

**Authentication:** Required
**Permissions:** students.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Filter from date |
| endDate | date | Filter to date |
| status | string | Filter by attendance status |
| classId | uuid | Filter by class |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "session": {
        "id": "uuid",
        "class": { "id": "uuid", "name": "Class 1A" },
        "sessionDate": "2026-06-01",
        "startTime": "08:00",
        "endTime": "09:30"
      },
      "status": "present",
      "recordedAt": "2026-06-01T08:05:00Z"
    },
    {
      "id": "uuid",
      "session": {
        "id": "uuid",
        "class": { "id": "uuid", "name": "Class 1A" },
        "sessionDate": "2026-05-31",
        "startTime": "08:00",
        "endTime": "09:30"
      },
      "status": "absent",
      "reason": null,
      "recordedAt": "2026-05-31T08:05:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45 }
}
```

---

### 6.8 GET /api/v1/students/:id/invoices

**Description:** Get student's invoices

**Authentication:** Required
**Permissions:** students.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by invoice status |
| startDate | date | Filter from issue date |
| endDate | date | Filter to issue date |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-2026-0001",
      "amount": 1500000,
      "discount": 0,
      "totalAmount": 1500000,
      "status": "paid",
      "issueDate": "2026-06-01",
      "dueDate": "2026-06-15",
      "paidDate": "2026-06-05",
      "paidAmount": 1500000
    },
    {
      "id": "uuid",
      "invoiceNumber": "INV-2026-0002",
      "amount": 1500000,
      "discount": 0,
      "totalAmount": 1500000,
      "status": "issued",
      "issueDate": "2026-06-15",
      "dueDate": "2026-06-30"
    }
  ]
}
```

---

### 6.9 GET /api/v1/students/:id/evaluations

**Description:** Get student's evaluations

**Authentication:** Required
**Permissions:** students.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by evaluation type (daily/weekly/monthly/term) |
| classId | uuid | Filter by class |
| startDate | date | Filter from date |
| endDate | date | Filter to date |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "class": { "id": "uuid", "name": "Class 1A" },
      "evaluationType": "monthly",
      "evaluationDate": "2026-06-01",
      "participation": 4,
      "homework": 5,
      "behavior": 4,
      "comments": "Good progress this month",
      "teacher": { "id": "uuid", "fullName": "Teacher Name" },
      "createdAt": "2026-06-01T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 12 }
}
```

---

### 6.10 POST /api/v1/students/import

**Description:** Import students from Excel file

**Authentication:** Required
**Permissions:** students.create, students.export

**Request:** multipart/form-data
- file: Excel file (.xlsx, max 5MB, max 500 rows)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "totalRows": 100,
    "imported": 98,
    "failed": 2,
    "errors": [
      { "row": 15, "message": "Invalid date format in dateOfBirth" },
      { "row": 47, "message": "Duplicate email in row 23 and 47" }
    ],
    "students": [
      { "id": "uuid", "fullName": "Student 1" },
      { "id": "uuid", "fullName": "Student 2" }
    ]
  }
}
```

---

### 6.11 GET /api/v1/students/export

**Description:** Export students to Excel

**Authentication:** Required
**Permissions:** students.export

**Query Parameters:** Same as GET /api/v1/students

**Response (200):**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="students-export-2026-06-03.xlsx"
```

---

## 7. Teachers Module

### 7.1 GET /api/v1/teachers

**Description:** List teachers

**Authentication:** Required
**Permissions:** teachers.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| limit | integer | Items per page |
| centerId | uuid | Filter by center |
| status | string | active, inactive, terminated |
| search | string | Search by name or email |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fullName": "Teacher Name",
      "email": "teacher@center.com",
      "phone": "0123456789",
      "qualification": "Master's Degree",
      "specialization": "Mathematics",
      "status": "active",
      "hireDate": "2024-09-01",
      "center": { "id": "uuid", "name": "Center Name" },
      "currentClasses": [
        { "id": "uuid", "name": "Class 1A", "role": "primary" }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 30 }
}
```

---

### 7.2 POST /api/v1/teachers

**Description:** Create new teacher

**Authentication:** Required
**Permissions:** teachers.create

**Request Body:**
```json
{
  "centerId": "uuid (required)",
  "fullName": "string (required)",
  "dateOfBirth": "date (required)",
  "gender": "string (required)",
  "phone": "string (required)",
  "email": "string (required, unique per center)",
  "address": "string (optional)",
  "qualification": "string (optional)",
  "specialization": "string (optional)",
  "hireDate": "date (required)",
  "salary": "decimal (optional)",
  "notes": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Teacher Name",
    "email": "teacher@center.com",
    "status": "active",
    "hireDate": "2026-06-03",
    "createdAt": "2026-06-03T10:00:00Z"
  }
}
```

---

### 7.3 GET /api/v1/teachers/:id

**Description:** Get teacher by ID

**Authentication:** Required
**Permissions:** teachers.read

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Teacher Name",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "phone": "0123456789",
    "email": "teacher@center.com",
    "address": "456 Street, District 2",
    "qualification": "Master's Degree",
    "specialization": "Mathematics",
    "hireDate": "2024-09-01",
    "salary": 15000000,
    "status": "active",
    "avatarUrl": "https://...",
    "center": { "id": "uuid", "name": "Center Name" },
    "classes": [
      {
        "id": "uuid",
        "name": "Class 1A",
        "role": "primary",
        "status": "active"
      }
    ],
    "createdAt": "2024-09-01T08:00:00Z",
    "updatedAt": "2026-06-01T10:00:00Z"
  }
}
```

---

### 7.4 PUT /api/v1/teachers/:id

**Description:** Update teacher

**Authentication:** Required
**Permissions:** teachers.update

**Request Body:**
```json
{
  "fullName": "string (optional)",
  "phone": "string (optional)",
  "email": "string (optional)",
  "address": "string (optional)",
  "qualification": "string (optional)",
  "specialization": "string (optional)",
  "salary": "decimal (optional)",
  "notes": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Updated Name",
    "updatedAt": "2026-06-03T10:00:00Z"
  }
}
```

---

### 7.5 DELETE /api/v1/teachers/:id

**Description:** Archive teacher (soft delete)

**Authentication:** Required
**Permissions:** teachers.delete

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "terminated",
    "message": "Teacher archived successfully"
  }
}
```

---

### 7.6 GET /api/v1/teachers/:id/assignments

**Description:** Get teacher's class assignments

**Authentication:** Required
**Permissions:** teachers.read

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "class": {
        "id": "uuid",
        "name": "Class 1A",
        "academicLevel": "beginner",
        "status": "active"
      },
      "role": "primary",
      "assignedAt": "2024-09-01T08:00:00Z",
      "currentStudents": 25,
      "capacity": 30
    }
  ]
}
```

---

### 7.7 GET /api/v1/teachers/:id/schedule

**Description:** Get teacher's teaching schedule

**Authentication:** Required
**Permissions:** teachers.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date (required) | Schedule start date |
| endDate | date (required) | Schedule end date |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "class": { "id": "uuid", "name": "Class 1A" },
      "sessionDate": "2026-06-03",
      "startTime": "08:00",
      "endTime": "09:30",
      "classroom": "Room A101",
      "sessionType": "regular",
      "status": "scheduled"
    },
    {
      "id": "uuid",
      "class": { "id": "uuid", "name": "Class 2A" },
      "sessionDate": "2026-06-03",
      "startTime": "10:00",
      "endTime": "11:30",
      "classroom": "Room B102",
      "sessionType": "regular",
      "status": "scheduled"
    }
  ]
}
```

---

### 7.8 POST /api/v1/teachers/import

**Description:** Import teachers from Excel

**Authentication:** Required
**Permissions:** teachers.create, teachers.export

**Request:** multipart/form-data
- file: Excel file (.xlsx, max 5MB)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "totalRows": 50,
    "imported": 48,
    "failed": 2,
    "errors": [...]
  }
}
```

---

### 7.9 GET /api/v1/teachers/export

**Description:** Export teachers to Excel

**Authentication:** Required
**Permissions:** teachers.export

**Response (200):**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="teachers-export-2026-06-03.xlsx"
```

---

## 8. Classes Module

### 8.1 GET /api/v1/classes

**Description:** List classes

**Authentication:** Required
**Permissions:** classes.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| limit | integer | Items per page |
| centerId | uuid | Filter by center |
| status | string | active, inactive, completed, archived |
| academicLevel | string | beginner, intermediate, advanced |
| search | string | Search by name |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Class 1A",
      "description": "Beginner Mathematics",
      "academicLevel": "beginner",
      "capacity": 30,
      "currentEnrollment": 25,
      "status": "active",
      "classroom": "Room A101",
      "startDate": "2026-01-15",
      "endDate": "2026-05-31",
      "center": { "id": "uuid", "name": "Center Name" },
      "primaryTeacher": { "id": "uuid", "fullName": "Teacher Name" },
      "schedule": {
        "monday": [{ "startTime": "08:00", "endTime": "09:30", "room": "A101" }],
        "wednesday": [{ "startTime": "08:00", "endTime": "09:30", "room": "A101" }],
        "friday": [{ "startTime": "08:00", "endTime": "09:30", "room": "A101" }]
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 15 }
}
```

---

### 8.2 POST /api/v1/classes

**Description:** Create new class

**Authentication:** Required
**Permissions:** classes.create

**Request Body:**
```json
{
  "centerId": "uuid (required)",
  "name": "string (required, unique per center)",
  "description": "string (optional)",
  "academicLevel": "string (required, beginner/intermediate/advanced)",
  "capacity": "integer (required, 1-100)",
  "classroom": "string (optional)",
  "schedule": {
    "monday": [{ "startTime": "08:00", "endTime": "09:30", "room": "A101" }],
    "tuesday": [],
    "wednesday": [{ "startTime": "10:00", "endTime": "11:30", "room": "A101" }],
    "thursday": [],
    "friday": [],
    "saturday": [],
    "sunday": []
  },
  "startDate": "date (required)",
  "endDate": "date (optional)",
  "notes": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Class 1A",
    "academicLevel": "beginner",
    "capacity": 30,
    "status": "active",
    "startDate": "2026-06-03",
    "createdAt": "2026-06-03T10:00:00Z"
  }
}
```

**Error Responses:**
- 409: `DUPLICATE_CLASS` - Class name already exists in center

---

### 8.3 GET /api/v1/classes/:id

**Description:** Get class by ID

**Authentication:** Required
**Permissions:** classes.read

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Class 1A",
    "description": "Beginner Mathematics",
    "academicLevel": "beginner",
    "capacity": 30,
    "currentEnrollment": 25,
    "status": "active",
    "classroom": "Room A101",
    "schedule": { "monday": [...], "..." : [...] },
    "startDate": "2026-01-15",
    "endDate": "2026-05-31",
    "center": { "id": "uuid", "name": "Center Name" },
    "teachers": [
      { "id": "uuid", "fullName": "Teacher A", "role": "primary" },
      { "id": "uuid", "fullName": "Teacher B", "role": "substitute" }
    ],
    "students": [
      { "id": "uuid", "fullName": "Student A", "status": "active" }
    ],
    "createdAt": "2026-01-15T08:00:00Z",
    "updatedAt": "2026-06-01T10:00:00Z"
  }
}
```

---

### 8.4 PUT /api/v1/classes/:id

**Description:** Update class

**Authentication:** Required
**Permissions:** classes.update

**Request Body:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "capacity": "integer (optional)",
  "classroom": "string (optional)",
  "schedule": "object (optional)",
  "endDate": "date (optional)",
  "notes": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Class Name",
    "updatedAt": "2026-06-03T10:00:00Z"
  }
}
```

---

### 8.5 DELETE /api/v1/classes/:id

**Description:** Archive class (soft delete)

**Authentication:** Required
**Permissions:** classes.delete

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "archived",
    "message": "Class archived successfully"
  }
}
```

---

### 8.6 POST /api/v1/classes/:id/teachers

**Description:** Assign teachers to class

**Authentication:** Required
**Permissions:** classes.update

**Request Body:**
```json
{
  "teachers": [
    { "teacherId": "uuid", "role": "primary" },
    { "teacherId": "uuid", "role": "substitute" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "teachers": [
      { "id": "uuid", "fullName": "Teacher A", "role": "primary" },
      { "id": "uuid", "fullName": "Teacher B", "role": "substitute" }
    ]
  }
}
```

**Error Responses:**
- 409: `DUPLICATE_PRIMARY` - Only one primary teacher allowed

---

### 8.7 DELETE /api/v1/classes/:id/teachers/:teacherId

**Description:** Remove teacher from class

**Authentication:** Required
**Permissions:** classes.update

**Query Parameters:**
- role: string (optional, primary/substitute - needed if teacher has both roles)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Teacher removed from class"
  }
}
```

---

### 8.8 POST /api/v1/classes/:id/students

**Description:** Enroll students in class

**Authentication:** Required
**Permissions:** classes.update

**Request Body:**
```json
{
  "studentIds": ["uuid", "uuid"],
  "startDate": "date (optional, defaults to class start date)",
  "notes": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "enrollments": [
      { "id": "uuid", "studentId": "uuid", "status": "active" },
      { "id": "uuid", "studentId": "uuid", "status": "active" }
    ],
    "message": "2 students enrolled successfully"
  }
}
```

**Error Responses:**
- 422: `CAPACITY_EXCEEDED` - Class at full capacity
- 409: `ALREADY_ENROLLED` - Student already enrolled

---

### 8.9 DELETE /api/v1/classes/:id/students/:studentId

**Description:** Remove student from class (withdraw enrollment)

**Authentication:** Required
**Permissions:** classes.update

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Student withdrawn from class"
  }
}
```

---

### 8.10 GET /api/v1/classes/:id/sessions

**Description:** Get class sessions

**Authentication:** Required
**Permissions:** classes.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Filter from date |
| endDate | date | Filter to date |
| status | string | scheduled, completed, cancelled |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sessionDate": "2026-06-03",
      "startTime": "08:00",
      "endTime": "09:30",
      "classroom": "Room A101",
      "sessionType": "regular",
      "status": "completed",
      "teacher": { "id": "uuid", "fullName": "Teacher Name" },
      "attendanceSummary": {
        "present": 23,
        "absent": 1,
        "late": 1,
        "excused": 0
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 40 }
}
```

---

## 9. Attendance Module

### 9.1 POST /api/v1/attendance/session

**Description:** Mark attendance for a session

**Authentication:** Required
**Permissions:** attendance.create

**Request Body:**
```json
{
  "sessionId": "uuid (required)",
  "records": [
    { "studentId": "uuid", "status": "present" },
    { "studentId": "uuid", "status": "absent" },
    { "studentId": "uuid", "status": "late" },
    { "studentId": "uuid", "status": "excused", "reason": "Family emergency" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "marked": 25,
    "present": 20,
    "absent": 3,
    "late": 1,
    "excused": 1,
    "absentStudents": [
      { "studentId": "uuid", "fullName": "Student Name" }
    ]
  }
}
```

**Error Responses:**
- 400: `SESSION_COMPLETED` - Cannot mark attendance for completed session

---

### 9.2 POST /api/v1/attendance/bulk

**Description:** Bulk mark attendance for multiple sessions

**Authentication:** Required
**Permissions:** attendance.create

**Request Body:**
```json
{
  "records": [
    {
      "sessionId": "uuid",
      "studentId": "uuid",
      "status": "present"
    },
    {
      "sessionId": "uuid",
      "studentId": "uuid",
      "status": "absent",
      "reason": "Sick"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "marked": 10,
    "failed": 0
  }
}
```

---

### 9.3 GET /api/v1/attendance

**Description:** List attendance records with filters

**Authentication:** Required
**Permissions:** attendance.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | uuid | Filter by session |
| studentId | uuid | Filter by student |
| classId | uuid | Filter by class |
| startDate | date | Filter from date |
| endDate | date | Filter to date |
| status | string | present, absent, late, excused |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "student": { "id": "uuid", "fullName": "Student Name" },
      "session": {
        "id": "uuid",
        "class": { "id": "uuid", "name": "Class 1A" },
        "sessionDate": "2026-06-03",
        "startTime": "08:00"
      },
      "status": "present",
      "recordedBy": { "id": "uuid", "fullName": "Teacher Name" },
      "recordedAt": "2026-06-03T08:05:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 500 }
}
```

---

### 9.4 PUT /api/v1/attendance/:id

**Description:** Update attendance record

**Authentication:** Required
**Permissions:** attendance.update

**Request Body:**
```json
{
  "status": "string (required)",
  "reason": "string (optional, required if status=excused)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "excused",
    "reason": "Doctor's appointment",
    "updatedAt": "2026-06-03T12:00:00Z"
  }
}
```

---

### 9.5 POST /api/v1/attendance/:id/approve

**Description:** Approve excused absence

**Authentication:** Required
**Permissions:** attendance.update (Center Manager only)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "excused",
    "approvedBy": { "id": "uuid", "fullName": "Manager Name" },
    "approvedAt": "2026-06-03T12:00:00Z"
  }
}
```

---

### 9.6 GET /api/v1/attendance/stats

**Description:** Get attendance statistics

**Authentication:** Required
**Permissions:** attendance.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| studentId | uuid | Student attendance stats |
| classId | uuid | Class attendance stats |
| startDate | date | Period start |
| endDate | date | Period end |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "studentId": "uuid",
    "classId": "uuid",
    "period": { "startDate": "2026-06-01", "endDate": "2026-06-30" },
    "totalSessions": 20,
    "attendanceRate": 95.0,
    "present": 19,
    "absent": 1,
    "late": 0,
    "excused": 0,
    "bySession": [
      { "sessionDate": "2026-06-01", "status": "present" },
      { "sessionDate": "2026-06-03", "status": "present" }
    ]
  }
}
```

---

## 10. Sessions Module

### 10.1 GET /api/v1/schedule/weekly

**Description:** Get weekly schedule

**Authentication:** Required
**Permissions:** schedule.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| week | string | Week number (optional, defaults to current) |
| year | integer | Year (optional, defaults to current) |
| teacherId | uuid | Filter by teacher |
| classId | uuid | Filter by class |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "week": 23,
    "year": 2026,
    "startDate": "2026-06-02",
    "endDate": "2026-06-08",
    "days": [
      {
        "date": "2026-06-02",
        "dayOfWeek": "monday",
        "sessions": [
          {
            "id": "uuid",
            "class": { "id": "uuid", "name": "Class 1A" },
            "startTime": "08:00",
            "endTime": "09:30",
            "classroom": "Room A101",
            "sessionType": "regular",
            "status": "scheduled"
          }
        ]
      }
    ]
  }
}
```

---

### 10.2 GET /api/v1/schedule/monthly

**Description:** Get monthly schedule

**Authentication:** Required
**Permissions:** schedule.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| month | integer | Month number (1-12) |
| year | integer | Year |
| teacherId | uuid | Filter by teacher |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "month": 6,
    "year": 2026,
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "totalSessions": 40,
    "days": [
      {
        "date": "2026-06-03",
        "dayOfWeek": "tuesday",
        "sessions": [
          {
            "id": "uuid",
            "class": { "id": "uuid", "name": "Class 1A" },
            "startTime": "08:00",
            "endTime": "09:30",
            "status": "scheduled"
          }
        ]
      }
    ]
  }
}
```

---

### 10.3 POST /api/v1/sessions

**Description:** Create session (override schedule)

**Authentication:** Required
**Permissions:** schedule.create

**Request Body:**
```json
{
  "classId": "uuid (required)",
  "teacherId": "uuid (required)",
  "sessionDate": "date (required)",
  "startTime": "string (required, HH:MM)",
  "endTime": "string (required, must be > startTime)",
  "classroom": "string (optional)",
  "sessionType": "string (regular/makeup/trial)",
  "notes": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "class": { "id": "uuid", "name": "Class 1A" },
    "sessionDate": "2026-06-10",
    "startTime": "10:00",
    "endTime": "11:30",
    "status": "scheduled"
  }
}
```

**Error Responses:**
- 409: `SCHEDULE_CONFLICT` - Teacher or room has conflict

---

### 10.4 PUT /api/v1/sessions/:id

**Description:** Update session

**Authentication:** Required
**Permissions:** schedule.update

**Request Body:**
```json
{
  "teacherId": "uuid (optional)",
  "startTime": "string (optional)",
  "endTime": "string (optional)",
  "classroom": "string (optional)",
  "status": "string (optional, scheduled/completed/cancelled)",
  "notes": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "updatedAt": "2026-06-03T12:00:00Z"
  }
}
```

---

### 10.5 POST /api/v1/sessions/:id/notes

**Description:** Add lesson notes to session

**Authentication:** Required
**Permissions:** schedule.update

**Request Body:**
```json
{
  "notes": "string (required, lesson content and observations)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "notes": "Covered chapter 5, students participated well...",
    "updatedAt": "2026-06-03T12:00:00Z"
  }
}
```

---

### 10.6 POST /api/v1/sessions/:id/materials

**Description:** Upload learning materials

**Authentication:** Required
**Permissions:** schedule.update

**Request:** multipart/form-data
- files: File(s) to upload (max 10 files, 10MB each)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "materials": [
      {
        "id": "uuid",
        "fileName": "worksheet.pdf",
        "fileType": "application/pdf",
        "fileSize": 1024000,
        "fileUrl": "https://cloudinary.url/...",
        "uploadedBy": { "id": "uuid", "fullName": "Teacher Name" },
        "createdAt": "2026-06-03T12:00:00Z"
      }
    ]
  }
}
```

---

### 10.7 DELETE /api/v1/sessions/:id/cancel

**Description:** Cancel session

**Authentication:** Required
**Permissions:** schedule.update

**Request Body:**
```json
{
  "reason": "string (optional, reason for cancellation)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "message": "Session cancelled"
  }
}
```

---

## 11. Evaluations Module

### 11.1 GET /api/v1/evaluations

**Description:** List evaluations

**Authentication:** Required
**Permissions:** evaluations.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| studentId | uuid | Filter by student |
| classId | uuid | Filter by class |
| type | string | daily, weekly, monthly, term |
| startDate | date | Filter from date |
| endDate | date | Filter to date |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "student": { "id": "uuid", "fullName": "Student Name" },
      "class": { "id": "uuid", "name": "Class 1A" },
      "evaluationType": "daily",
      "evaluationDate": "2026-06-03",
      "participation": 4,
      "homework": 5,
      "behavior": 4,
      "comments": "Good progress today",
      "teacher": { "id": "uuid", "fullName": "Teacher Name" },
      "createdAt": "2026-06-03T11:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

---

### 11.2 POST /api/v1/evaluations

**Description:** Create evaluation

**Authentication:** Required
**Permissions:** evaluations.create

**Request Body:**
```json
{
  "studentId": "uuid (required)",
  "classId": "uuid (required)",
  "evaluationType": "string (required, daily/weekly/monthly/term)",
  "evaluationDate": "date (required)",
  "participation": "integer (optional, 1-5)",
  "homework": "integer (optional, 1-5)",
  "behavior": "integer (optional, 1-5)",
  "scores": "object (optional, subject scores for monthly/term)",
  "comments": "string (optional)"
}
```

**Example scores for monthly evaluation:**
```json
{
  "scores": {
    "math": 85,
    "vietnamese": 90,
    "english": 88
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "evaluationType": "daily",
    "evaluationDate": "2026-06-03",
    "participation": 4,
    "createdAt": "2026-06-03T11:00:00Z"
  }
}
```

---

### 11.3 GET /api/v1/evaluations/:id

**Description:** Get evaluation by ID

**Authentication:** Required
**Permissions:** evaluations.read

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "student": {
      "id": "uuid",
      "fullName": "Student Name",
      "avatarUrl": "https://..."
    },
    "class": { "id": "uuid", "name": "Class 1A" },
    "evaluationType": "monthly",
    "evaluationDate": "2026-06-01",
    "participation": 4,
    "homework": 5,
    "behavior": 4,
    "scores": { "math": 85, "vietnamese": 90 },
    "comments": "Good progress this month. Keep it up!",
    "teacher": { "id": "uuid", "fullName": "Teacher Name" },
    "createdAt": "2026-06-01T10:00:00Z",
    "updatedAt": "2026-06-01T10:00:00Z"
  }
}
```

---

### 11.4 PUT /api/v1/evaluations/:id

**Description:** Update evaluation

**Authentication:** Required
**Permissions:** evaluations.update

**Request Body:** Same as POST (all fields optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "comments": "Updated comments",
    "updatedAt": "2026-06-03T11:00:00Z"
  }
}
```

---

### 11.5 GET /api/v1/evaluations/:id/report

**Description:** Generate parent report for evaluation

**Authentication:** Required
**Permissions:** evaluations.read

**Response (200):**
```json
{
  "success": true,
  "data": {
    "report": {
      "student": { "fullName": "Student Name", "avatarUrl": "..." },
      "class": { "name": "Class 1A" },
      "evaluationType": "monthly",
      "evaluationDate": "2026-06-01",
      "period": "June 2026",
      "ratings": {
        "participation": { "value": 4, "label": "Very Good" },
        "homework": { "value": 5, "label": "Excellent" },
        "behavior": { "value": 4, "label": "Very Good" }
      },
      "scores": { "math": 85, "vietnamese": 90 },
      "comments": "Good progress this month. Keep it up!",
      "teacher": { "fullName": "Teacher Name" },
      "generatedAt": "2026-06-03T10:00:00Z"
    }
  }
}
```

---

### 11.6 GET /api/v1/evaluations/student/:studentId

**Description:** Get all evaluations for a student

**Authentication:** Required
**Permissions:** evaluations.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by evaluation type |
| classId | uuid | Filter by class |
| startDate | date | Filter from date |
| endDate | date | Filter to date |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "studentId": "uuid",
    "studentName": "Student Name",
    "evaluations": [
      {
        "id": "uuid",
        "class": { "id": "uuid", "name": "Class 1A" },
        "evaluationType": "monthly",
        "evaluationDate": "2026-06-01",
        "participation": 4,
        "homework": 5,
        "behavior": 4,
        "comments": "Good progress"
      }
    ],
    "summary": {
      "averageParticipation": 4.2,
      "averageHomework": 4.5,
      "averageBehavior": 4.3
    }
  }
}
```

---

## 12. Tuition Module

### 12.1 GET /api/v1/tuition/plans

**Description:** List tuition plans

**Authentication:** Required
**Permissions:** tuition.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| centerId | uuid | Filter by center |
| classId | uuid | Filter by class |
| isActive | boolean | Filter by active status |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Monthly Plan",
      "amount": 1500000,
      "currency": "VND",
      "billingCycle": "monthly",
      "dueDay": 15,
      "lateFee": 50000,
      "isActive": true,
      "class": { "id": "uuid", "name": "Class 1A" } | null,
      "center": { "id": "uuid", "name": "Center Name" },
      "createdAt": "2026-01-01T08:00:00Z"
    }
  ]
}
```

---

### 12.2 POST /api/v1/tuition/plans

**Description:** Create tuition plan

**Authentication:** Required
**Permissions:** tuition.create

**Request Body:**
```json
{
  "centerId": "uuid (required)",
  "classId": "uuid (optional, for class-specific plan)",
  "name": "string (required)",
  "amount": "decimal (required, > 0)",
  "currency": "string (optional, default VND)",
  "billingCycle": "string (required, monthly/quarterly/term/yearly)",
  "dueDay": "integer (required, 1-28)",
  "lateFee": "decimal (optional)",
  "notes": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Monthly Plan",
    "amount": 1500000,
    "billingCycle": "monthly",
    "dueDay": 15,
    "isActive": true,
    "createdAt": "2026-06-03T10:00:00Z"
  }
}
```

---

### 12.3 PUT /api/v1/tuition/plans/:id

**Description:** Update tuition plan

**Authentication:** Required
**Permissions:** tuition.update

**Request Body:** Same as POST (all fields optional except id)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Plan Name",
    "amount": 1600000,
    "updatedAt": "2026-06-03T10:00:00Z"
  }
}
```

---

### 12.4 GET /api/v1/tuition/invoices

**Description:** List invoices

**Authentication:** Required
**Permissions:** tuition.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| studentId | uuid | Filter by student |
| status | string | draft, issued, paid, overdue, cancelled |
| startDate | date | Filter from issue date |
| endDate | date | Filter to issue date |
| overdue | boolean | Filter overdue invoices only |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-2026-0001",
      "student": { "id": "uuid", "fullName": "Student Name" },
      "tuitionPlan": { "id": "uuid", "name": "Monthly Plan" },
      "amount": 1500000,
      "discount": 0,
      "totalAmount": 1500000,
      "status": "paid",
      "issueDate": "2026-06-01",
      "dueDate": "2026-06-15",
      "paidDate": "2026-06-05",
      "paidAmount": 1500000
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 50 }
}
```

---

### 12.5 POST /api/v1/tuition/invoices

**Description:** Create/generate invoice

**Authentication:** Required
**Permissions:** tuition.create

**Request Body:**
```json
{
  "studentId": "uuid (required)",
  "tuitionPlanId": "uuid (required)",
  "amount": "decimal (optional, overrides plan amount)",
  "discount": "decimal (optional, default 0)",
  "issueDate": "date (optional, default today)",
  "dueDate": "date (optional, calculated from plan)",
  "notes": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoiceNumber": "INV-2026-0003",
    "amount": 1500000,
    "discount": 0,
    "totalAmount": 1500000,
    "status": "draft",
    "issueDate": "2026-06-03",
    "dueDate": "2026-06-18",
    "createdAt": "2026-06-03T10:00:00Z"
  }
}
```

---

### 12.6 POST /api/v1/tuition/invoices/generate

**Description:** Batch generate invoices for students

**Authentication:** Required
**Permissions:** tuition.create

**Request Body:**
```json
{
  "studentIds": ["uuid", "uuid"],
  "tuitionPlanId": "uuid (required)",
  "billingDate": "date (required)",
  "dueDay": "integer (optional, overrides plan due day)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "generated": 10,
    "invoices": [
      { "id": "uuid", "invoiceNumber": "INV-2026-0004" },
      { "id": "uuid", "invoiceNumber": "INV-2026-0005" }
    ]
  }
}
```

---

### 12.7 GET /api/v1/tuition/invoices/:id

**Description:** Get invoice details

**Authentication:** Required
**Permissions:** tuition.read

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoiceNumber": "INV-2026-0001",
    "student": {
      "id": "uuid",
      "fullName": "Student Name",
      "center": { "id": "uuid", "name": "Center Name" }
    },
    "tuitionPlan": { "id": "uuid", "name": "Monthly Plan" },
    "amount": 1500000,
    "discount": 0,
    "totalAmount": 1500000,
    "status": "paid",
    "issueDate": "2026-06-01",
    "dueDate": "2026-06-15",
    "paidDate": "2026-06-05",
    "paidAmount": 1500000,
    "paymentMethod": "vietqr",
    "items": [
      {
        "id": "uuid",
        "description": "Tuition Fee - June 2026",
        "quantity": 1,
        "amount": 1500000
      }
    ],
    "payments": [
      {
        "id": "uuid",
        "amount": 1500000,
        "paymentMethod": "vietqr",
        "transactionDate": "2026-06-05T10:30:00Z",
        "status": "completed"
      }
    ],
    "createdAt": "2026-06-01T08:00:00Z"
  }
}
```

---

### 12.8 PUT /api/v1/tuition/invoices/:id

**Description:** Update invoice

**Authentication:** Required
**Permissions:** tuition.update

**Request Body:**
```json
{
  "discount": "decimal (optional)",
  "dueDate": "date (optional)",
  "notes": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "discount": 100000,
    "totalAmount": 1400000,
    "updatedAt": "2026-06-03T10:00:00Z"
  }
}
```

---

### 12.9 POST /api/v1/tuition/invoices/:id/pay

**Description:** Record payment for invoice

**Authentication:** Required
**Permissions:** payments.create

**Request Body:**
```json
{
  "amount": "decimal (required)",
  "paymentMethod": "string (required, cash/bank_transfer/vietqr)",
  "transactionId": "string (optional)",
  "transactionDate": "datetime (optional, defaults to now)",
  "notes": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice": {
      "id": "uuid",
      "invoiceNumber": "INV-2026-0001",
      "status": "paid",
      "paidDate": "2026-06-05",
      "paidAmount": 1500000
    },
    "payment": {
      "id": "uuid",
      "amount": 1500000,
      "paymentMethod": "vietqr",
      "status": "completed",
      "transactionDate": "2026-06-05T10:30:00Z"
    }
  }
}
```

---

### 12.10 GET /api/v1/tuition/invoices/overdue

**Description:** Get all overdue invoices

**Authentication:** Required
**Permissions:** tuition.read

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-2026-0002",
      "student": { "id": "uuid", "fullName": "Student Name" },
      "totalAmount": 1500000,
      "dueDate": "2026-05-15",
      "daysOverdue": 19,
      "lateFee": 950000,
      "totalWithLateFee": 2450000
    }
  ],
  "meta": { "total": 25, "totalAmount": 37500000 }
}
```

---

## 13. Payments Module

### 13.1 POST /api/v1/payments/vietqr

**Description:** Generate VietQR code for invoice

**Authentication:** Required
**Permissions:** payments.read

**Request Body:**
```json
{
  "invoiceId": "uuid (required)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "qrCodeUrl": "https://img.vietqr.io/...",
    "amount": 1500000,
    "receiverName": "Center Name",
    "receiverBank": "Vietcombank",
    "receiverAccount": "123456789",
    "description": "INV-2026-0001",
    "expiresAt": "2026-06-04T10:00:00Z"
  }
}
```

---

### 13.2 POST /api/v1/payments/confirm

**Description:** Confirm payment received

**Authentication:** Required
**Permissions:** payments.create

**Request Body:**
```json
{
  "invoiceId": "uuid (required)",
  "transactionId": "string (optional, bank reference)",
  "amount": "decimal (required, must match invoice total)",
  "paymentMethod": "string (required)",
  "transactionDate": "datetime (optional, defaults to now)",
  "bankCode": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "uuid",
      "invoiceNumber": "INV-2026-0001",
      "status": "paid",
      "paidDate": "2026-06-05"
    },
    "payment": {
      "id": "uuid",
      "amount": 1500000,
      "status": "completed",
      "confirmedBy": { "id": "uuid", "fullName": "Manager Name" }
    }
  }
}
```

---

### 13.3 GET /api/v1/payments/history

**Description:** Get payment history

**Authentication:** Required
**Permissions:** payments.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| invoiceId | uuid | Filter by invoice |
| studentId | uuid | Filter by student |
| status | string | Filter by status |
| startDate | date | Filter from date |
| endDate | date | Filter to date |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "invoice": { "id": "uuid", "invoiceNumber": "INV-2026-0001" },
      "student": { "id": "uuid", "fullName": "Student Name" },
      "amount": 1500000,
      "paymentMethod": "vietqr",
      "transactionId": "VCB123456789",
      "transactionDate": "2026-06-05T10:30:00Z",
      "status": "completed",
      "confirmedBy": { "id": "uuid", "fullName": "Manager Name" },
      "confirmedAt": "2026-06-05T11:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

---

### 13.4 GET /api/v1/payments/:id

**Description:** Get payment details

**Authentication:** Required
**Permissions:** payments.read

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice": {
      "id": "uuid",
      "invoiceNumber": "INV-2026-0001",
      "student": { "fullName": "Student Name" }
    },
    "amount": 1500000,
    "paymentMethod": "vietqr",
    "transactionId": "VCB123456789",
    "transactionDate": "2026-06-05T10:30:00Z",
    "bankCode": "VCB",
    "qrCodeUrl": "https://...",
    "status": "completed",
    "confirmedBy": { "id": "uuid", "fullName": "Manager Name" },
    "confirmedAt": "2026-06-05T11:00:00Z",
    "createdAt": "2026-06-05T10:35:00Z"
  }
}
```

---

### 13.5 POST /api/v1/payments/reconcile

**Description:** Trigger payment reconciliation

**Authentication:** Required
**Permissions:** payments.create (Admin only)

**Request Body:**
```json
{
  "centerId": "uuid (optional, specific center or all)",
  "startDate": "date (required)",
  "endDate": "date (required)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reconciled": 15,
    "matched": 12,
    "unmatched": 3,
    "totalAmount": 22500000
  }
}
```

---

## 14. Dashboard Module

### 14.1 GET /api/v1/dashboard/revenue

**Description:** Get revenue overview

**Authentication:** Required
**Permissions:** dashboard.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| centerId | uuid | Filter by center |
| period | string | day, week, month, year (default: month) |
| startDate | date | Custom period start |
| endDate | date | Custom period end |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": { "startDate": "2026-06-01", "endDate": "2026-06-30" },
    "totalRevenue": 150000000,
    "previousPeriod": 140000000,
    "growthRate": 7.14,
    "collectionRate": 92.5,
    "outstandingAmount": 12500000,
    "byClass": [
      { "className": "Class 1A", "revenue": 45000000 },
      { "className": "Class 2A", "revenue": 37500000 }
    ],
    "trend": [
      { "date": "2026-06-01", "amount": 5000000 },
      { "date": "2026-06-02", "amount": 7500000 }
    ]
  }
}
```

---

### 14.2 GET /api/v1/dashboard/students

**Description:** Get student metrics

**Authentication:** Required
**Permissions:** dashboard.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| centerId | uuid | Filter by center |
| period | string | day, week, month, year |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalStudents": 150,
    "activeStudents": 140,
    "newEnrollments": 15,
    "withdrawnStudents": 5,
    "growthRate": 7.14,
    "byClass": [
      { "className": "Class 1A", "students": 30 },
      { "className": "Class 2A", "students": 25 }
    ],
    "byStatus": {
      "active": 140,
      "inactive": 8,
      "archived": 2
    },
    "trend": [
      { "date": "2026-01", "total": 130 },
      { "date": "2026-02", "total": 135 },
      { "date": "2026-03", "total": 140 }
    ]
  }
}
```

---

### 14.3 GET /api/v1/dashboard/attendance

**Description:** Get attendance metrics

**Authentication:** Required
**Permissions:** dashboard.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| centerId | uuid | Filter by center |
| classId | uuid | Filter by class |
| period | string | day, week, month, year |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "averageAttendanceRate": 92.5,
    "totalSessions": 200,
    "completedSessions": 180,
    "cancelledSessions": 5,
    "byStatus": {
      "present": 16650,
      "absent": 900,
      "late": 450,
      "excused": 200
    },
    "problemStudents": [
      { "studentId": "uuid", "fullName": "Student A", "attendanceRate": 65.0 }
    ]
  }
}
```

---

### 14.4 GET /api/v1/dashboard/collections

**Description:** Get collection metrics

**Authentication:** Required
**Permissions:** dashboard.read

**Response (200):**
```json
{
  "success": true,
  "data": {
    "issuedInvoices": 150,
    "paidInvoices": 138,
    "overdueInvoices": 8,
    "cancelledInvoices": 4,
    "totalIssued": 225000000,
    "totalCollected": 207750000,
    "totalOutstanding": 17250000,
    "collectionRate": 92.0,
    "averagePaymentTime": 5.2,
    "byStatus": {
      "draft": 10,
      "issued": 5,
      "paid": 138,
      "overdue": 8,
      "cancelled": 4
    }
  }
}
```

---

### 14.5 GET /api/v1/reports/monthly

**Description:** Generate monthly report

**Authentication:** Required
**Permissions:** dashboard.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| centerId | uuid | Filter by center |
| month | integer | Month number (1-12) |
| year | integer | Year |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reportType": "monthly",
    "period": { "month": 6, "year": 2026 },
    "center": { "id": "uuid", "name": "Center Name" },
    "generatedAt": "2026-06-30T23:00:00Z",
    "summary": {
      "revenue": 150000000,
      "students": 150,
      "attendanceRate": 92.5,
      "newEnrollments": 15
    },
    "revenue": { "total": 150000000, "collectionRate": 92.0 },
    "attendance": { "averageRate": 92.5, "totalSessions": 200 },
    "enrollments": { "new": 15, "withdrawn": 5 },
    "topClasses": [...],
    "outstandingInvoices": [...]
  }
}
```

---

### 14.6 GET /api/v1/reports/yearly

**Description:** Generate yearly report

**Authentication:** Required
**Permissions:** dashboard.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| centerId | uuid | Filter by center |
| year | integer | Year |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reportType": "yearly",
    "year": 2026,
    "center": { "id": "uuid", "name": "Center Name" },
    "generatedAt": "2026-12-31T23:00:00Z",
    "summary": {
      "totalRevenue": 1800000000,
      "averageMonthlyRevenue": 150000000,
      "totalStudents": 150,
      "totalClasses": 20,
      "averageAttendanceRate": 91.5
    },
    "monthlyBreakdown": [...],
    "yearlyComparison": {...}
  }
}
```

---

### 14.7 GET /api/v1/reports/export/pdf

**Description:** Export report as PDF

**Authentication:** Required
**Permissions:** dashboard.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | monthly, yearly |
| centerId | uuid | Filter by center |
| month | integer | Month (for monthly) |
| year | integer | Year |

**Response (200):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="monthly-report-2026-06.pdf"
```

---

### 14.8 GET /api/v1/reports/export/excel

**Description:** Export report as Excel

**Authentication:** Required
**Permissions:** dashboard.read

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | students, teachers, revenue, attendance |
| centerId | uuid | Filter by center |
| format | string | detailed, summary |

**Response (200):**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="revenue-report-2026-06.xlsx"
```

---

## 15. Error Codes

### 15.1 Error Code Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| TOKEN_EXPIRED | 401 | Authentication token expired |
| TOKEN_INVALID | 401 | Invalid authentication token |
| INVALID_CREDENTIALS | 401 | Wrong email or password |
| REFRESH_TOKEN_EXPIRED | 401 | Refresh token expired |
| REFRESH_TOKEN_INVALID | 401 | Invalid refresh token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| DUPLICATE_STUDENT | 409 | Student already exists |
| DUPLICATE_CLASS | 409 | Class name already exists |
| ALREADY_ENROLLED | 409 | Student already enrolled |
| DUPLICATE_PRIMARY | 409 | Only one primary teacher allowed |
| SCHEDULE_CONFLICT | 409 | Schedule conflict detected |
| CAPACITY_EXCEEDED | 422 | Class at full capacity |
| ACCOUNT_LOCKED | 423 | Account locked |
| SESSION_COMPLETED | 400 | Cannot modify completed session |
| PASSWORD_MISMATCH | 400 | Passwords don't match |
| INVALID_PASSWORD | 401 | Current password incorrect |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |

### 15.2 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "dateOfBirth", "message": "Age must be between 3 and 25" }
    ],
    "timestamp": "2026-06-03T10:30:00Z"
  }
}
```

---

**Document End**