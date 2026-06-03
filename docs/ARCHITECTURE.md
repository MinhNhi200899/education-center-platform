# Architecture Document
## Education Center Management Platform

**Document Version**: 1.0  
**Created**: 2026-06-03  
**Status**: Draft  
**Tech Stack**: Express.js, TypeScript, Prisma, PostgreSQL

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Folder Structure](#2-folder-structure)
3. [Module Boundaries](#3-module-boundaries)
4. [Service Layer](#4-service-layer)
5. [Repository Layer](#5-repository-layer)
6. [Middleware Layer](#6-middleware-layer)
7. [Validation Layer](#7-validation-layer)
8. [Error Handling Strategy](#8-error-handling-strategy)
9. [Logging Strategy](#9-logging-strategy)
10. [RBAC Architecture](#10-rbac-architecture)

---

## 1. System Overview

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │   Web Admin     │  │   Teacher App   │  │     Parent Portal        │   │
│  │   (React)       │  │   (React)       │  │     (React)              │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTPS + JWT
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY (Nginx)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • SSL Termination  • Rate Limiting  • Request Routing                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API SERVER (Express.js)                         │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Express Application                               │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    Middleware Stack                             │ │   │
│  │  │  cors → helmet → bodyParser → rateLimit → authenticate → authorize │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    Routes Layer                                 │ │   │
│  │  │  /api/v1/auth/* → /api/v1/students/* → /api/v1/teachers/* → ...│ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    Controller Layer                            │ │   │
│  │  │  AuthController  StudentController  TeacherController  ...       │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    Service Layer                               │ │   │
│  │  │  AuthService  StudentService  TeacherService  ...               │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    Repository Layer (Prisma)                   │ │   │
│  │  │  prisma.student.findMany()  prisma.class.create()  ...       │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
          ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
          │    PostgreSQL     │ │      Redis        │ │   Cloudinary     │
          │   (Primary DB)    │ │  (Cache/Sessions)│ │   (File Storage) │
          └──────────────────┘ └──────────────────┘ └──────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-------------|---------|
| Runtime | Node.js 20.x LTS | Server runtime |
| Framework | Express.js 4.x | HTTP framework |
| Language | TypeScript 5.x | Type safety |
| ORM | Prisma 5.x | Database access |
| Database | PostgreSQL 15.x | Primary data store |
| Cache | Redis 7.x | Session & cache |
| File Storage | Cloudinary | Media files |
| Validation | Zod | Schema validation |
| Auth | jsonwebtoken + bcrypt | JWT & password hashing |

### 1.3 Design Principles

1. **Layered Architecture**: Clear separation between routes, controllers, services, and repositories
2. **Module Isolation**: Each module is self-contained with its own routes, controllers, services
3. **Dependency Injection**: Services receive dependencies via constructor injection
4. **Single Responsibility**: Each class/function has one purpose
5. **Repository Pattern**: Data access abstraction through Prisma
6. **Multi-Tenant Isolation**: All queries include `centerId` for tenant filtering

---

## 2. Folder Structure

### 2.1 Project Root

```
education-center-platform/
├── src/
│   ├── app.ts                    # Express app setup
│   ├── server.ts                # Server entry point
│   │
│   ├── config/
│   │   ├── index.ts              # Configuration loader
│   │   ├── database.ts          # Prisma client
│   │   ├── redis.ts              # Redis client
│   │   ├── cloudinary.ts         # Cloudinary config
│   │   └── env.ts                # Environment variables
│   │
│   ├── modules/                  # Feature modules
│   │   ├── auth/
│   │   ├── students/
│   │   ├── teachers/
│   │   ├── classes/
│   │   ├── attendance/
│   │   ├── schedule/
│   │   ├── evaluations/
│   │   ├── tuition/
│   │   ├── payments/
│   │   ├── dashboard/
│   │   └── rbac/
│   │
│   ├── shared/                   # Shared utilities
│   │   ├── services/
│   │   │   ├── prisma.service.ts
│   │   │   ├── cache.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── logger.service.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── error-handler.ts
│   │   │   ├── validate-request.ts
│   │   │   ├── audit-log.ts
│   │   │   └── rate-limit.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── async-handler.ts
│   │   │   ├── paginate.ts
│   │   │   ├── date-helpers.ts
│   │   │   └── crypto.ts
│   │   │
│   │   ├── types/
│   │   │   ├── api.types.ts
│   │   │   ├── pagination.types.ts
│   │   │   └── error.types.ts
│   │   │
│   │   ├── constants/
│   │   │   ├── enums.ts
│   │   │   └── permissions.ts
│   │   │
│   │   └── validators/
│   │       └── common.validators.ts
│   │
│   ├── routes/
│   │   └── index.ts              # Main router aggregator
│   │
│   └── types/
│       └── global.d.ts            # Global type declarations
│
├── prisma/
│   ├── schema.prisma             # Prisma schema
│   └── migrations/               # Database migrations
│
├── tests/                        # Test files
│   ├── unit/
│   └── integration/
│
├── scripts/                      # Utility scripts
│   └── seed.ts                   # Database seeder
│
├── package.json
├── tsconfig.json
├── .env.example
└── docker-compose.yml
```

### 2.2 Module Structure

Each module follows the same structure:

```
src/modules/{module-name}/
│
├── {module-name}.controller.ts    # HTTP handlers
├── {module-name}.service.ts       # Business logic
├── {module-name}.routes.ts         # Route definitions
├── {module-name}.types.ts          # Module-specific types
│
├── services/                      # Sub-services (if needed)
│   ├── helper.service.ts
│   └── utility.service.ts
│
├── repositories/                  # Data access (if separated)
│   └── {entity}.repository.ts
│
├── validators/                    # Zod schemas
│   ├── create.schema.ts
│   ├── update.schema.ts
│   └── query.schema.ts
│
├── middleware/                   # Module-specific middleware
│   └── {module}.middleware.ts
│
├── enums/                         # Module enums
│   └── {module}.enums.ts
│
└── index.ts                       # Module exports
```

### 2.3 Example Module Structure (Students)

```
src/modules/students/
├── students.controller.ts
├── students.service.ts
├── students.routes.ts
├── students.types.ts
│
├── services/
│   ├── enrollment.service.ts     # Enrollment business logic
│   └── parent.service.ts         # Parent management logic
│
├── validators/
│   ├── create-student.schema.ts
│   ├── update-student.schema.ts
│   └── query-student.schema.ts
│
├── enums/
│   └── student-status.enum.ts
│
└── index.ts
```

---

## 3. Module Boundaries

### 3.1 Module Overview

| Module | Routes | Controllers | Services | Primary Entities |
|-------|--------|-------------|----------|------------------|
| auth | /api/v1/auth/* | AuthController | AuthService, JwtService, SessionService | User, RefreshToken |
| students | /api/v1/students/* | StudentController | StudentService, EnrollmentService, ParentService | Student, Parent |
| teachers | /api/v1/teachers/* | TeacherController | TeacherService, AssignmentService | Teacher, ClassTeacher |
| classes | /api/v1/classes/* | ClassController | ClassService, ScheduleService | Class, Enrollment |
| attendance | /api/v1/attendance/* | AttendanceController | AttendanceService, ReasonService | AttendanceRecord |
| schedule | /api/v1/schedule/*, /api/v1/sessions/* | ScheduleController | ScheduleService, MaterialService | Session, SessionMaterial |
| evaluations | /api/v1/evaluations/* | EvaluationController | EvaluationService, TemplateService | Evaluation |
| tuition | /api/v1/tuition/* | TuitionController | TuitionPlanService, InvoiceService, DiscountService | TuitionPlan, Invoice, InvoiceItem |
| payments | /api/v1/payments/* | PaymentController | VietQRService, PaymentService, ReconciliationService | Payment |
| dashboard | /api/v1/dashboard/*, /api/v1/reports/* | DashboardController | RevenueService, StudentMetricsService, ReportService | Analytics |
| rbac | /api/v1/roles/*, /api/v1/permissions/*, /api/v1/audit-logs/* | RbacController | RoleService, PermissionService, AuditService | Role, Permission, AuditLog |

### 3.2 Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                         auth                                    │
│                    (Depends on: none)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       shared                                      │
│              (Depends on: config, types)                        │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│   │   prisma    │ │    cache   │ │    email   │ │  logger  │  │
│   │  service    │ │   service   │ │   service  │ │  service │  │
│   └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      modules                                      │
│                                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│   │  students │  │ teachers │  │ classes │  │  rbac   │          │
│   │     ↓     │  │    ↓     │  │    ↓     │  │    ↓    │          │
│   │     └─────┴──┴────┬────┴──┴────┘     │     └───────────────│
│   │                   │                  │                     │
│   │                   ▼                  ▼                     │
│   │            ┌──────────────┐  ┌──────────────┐             │
│   │            │  attendance │  │   schedule   │             │
│   │            │     ↓       │  │     ↓       │             │
│   │            │     └────────┴──┴─────┘       │             │
│   │            │                             │             │
│   │            │     ┌──────────────┐       │             │
│   │            └────►│  evaluations │◄──────┘             │
│   │                  │     ↓         │                     │
│   │                  └──────┬───────┘                     │
│   │                         │                             │
│   │            ┌───────────┴───────────┐                │
│   │            ▼                       ▼                │
│   │     ┌─────────────┐         ┌─────────────┐          │
│   │     │   tuition   │         │  payments   │          │
│   │     └──────┬──────┘         └──────┬──────┘          │
│   │            │                       │                 │
│   │            └───────────┬───────────┘                 │
│   │                        ▼                             │
│   │                 ┌─────────────┐                     │
│   │                 │  dashboard  │                     │
│   │                 └─────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Cross-Module Communication

Modules communicate through **service injection** (dependency injection pattern):

```typescript
// src/modules/attendance/attendance.service.ts
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private studentService: StudentService  // Injected module service
  ) {}

  async markAttendance(data: AttendanceDTO) {
    // Can call studentService methods
    const student = await this.studentService.getStudentById(data.studentId);
    // ...
  }
}
```

---

## 4. Service Layer

### 4.1 Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Controller Layer                             │
│  studentController.getStudents(req, res)                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │ calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    StudentService                           │ │
│  │  • Business logic                                           │ │
│  │  • Transaction management                                   │ │
│  │  • Data transformation                                     │ │
│  │  • Coordinates with other services                         │ │
│  │                                                             │ │
│  │  getStudents(centerId, filters, pagination)                 │ │
│  │  createStudent(centerId, data)                             │ │
│  │  updateStudent(id, data)                                    │ │
│  │  archiveStudent(id)                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ calls                             │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Repository Layer (Prisma)                   │ │
│  │                                                             │ │
│  │  prisma.student.findMany({ where: { centerId } })          │ │
│  │  prisma.student.create({ data: {} })                        │ │
│  │  prisma.student.update({ where: { id }, data: {} })        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Service Pattern

Each service follows a consistent pattern:

```typescript
// src/modules/students/services/student.service.ts

export class StudentService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private eventEmitter: EventEmitter
  ) {}

  // Public API methods
  async getStudents(
    centerId: string,
    filters: StudentFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Student>> {
    // 1. Check cache
    const cacheKey = `students:${centerId}:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // 2. Build query with filters
    const where = this.buildWhereClause(centerId, filters);

    // 3. Execute query with pagination
    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: { parents: true, enrollments: { where: { status: 'active' } } },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.student.count({ where })
    ]);

    const result = {
      data,
      meta: { page: pagination.page, limit: pagination.limit, total }
    };

    // 4. Cache result
    await this.cacheService.set(cacheKey, result, 300);

    return result;
  }

  async createStudent(centerId: string, data: CreateStudentDTO): Promise<Student> {
    // 1. Validate center
    await this.validateCenter(centerId);

    // 2. Check duplicates
    await this.checkDuplicate(centerId, data.fullName, data.dateOfBirth);

    // 3. Create with transaction
    const student = await this.prisma.$transaction(async (tx) => {
      return tx.student.create({
        data: { centerId, ...data }
      });
    });

    // 4. Emit event
    this.eventEmitter.emit('student.created', { studentId: student.id, centerId });

    // 5. Invalidate cache
    await this.cacheService.invalidate(`students:${centerId}:*`);

    return student;
  }

  // Private helper methods
  private async validateCenter(centerId: string): Promise<Center> {
    const center = await this.prisma.center.findUnique({ where: { id: centerId } });
    if (!center) throw new NotFoundException('Center not found');
    return center;
  }

  private async checkDuplicate(centerId: string, fullName: string, dob: Date): Promise<void> {
    const existing = await this.prisma.student.findFirst({
      where: { centerId, fullName, dateOfBirth: dob }
    });
    if (existing) throw new ConflictException('Student already exists');
  }

  private buildWhereClause(centerId: string, filters: StudentFilters): Prisma.StudentWhereInput {
    const where: Prisma.StudentWhereInput = { centerId };

    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } }
      ];
    }
    if (filters.gender) where.gender = filters.gender;

    return where;
  }
}
```

### 4.3 Transaction Pattern

```typescript
// src/modules/classes/classes.service.ts

export class ClassService {
  constructor(private prisma: PrismaService) {}

  async enrollStudents(classId: string, studentIds: string[], data: EnrollmentDTO) {
    return this.prisma.$transaction(async (tx) => {
      // Check class capacity
      const classRecord = await tx.class.findUnique({
        where: { id: classId },
        include: { _count: { select: { enrollments: { where: { status: 'active' } } } } }
      });

      if (!classRecord) throw new NotFoundException('Class not found');

      const availableSlots = classRecord.capacity - classRecord._count.enrollments;
      if (studentIds.length > availableSlots) {
        throw new BadRequestException(`Only ${availableSlots} slots available`);
      }

      // Create enrollments
      const enrollments = await Promise.all(
        studentIds.map(studentId =>
          tx.enrollment.create({
            data: {
              studentId,
              classId,
              startDate: data.startDate || classRecord.startDate,
              status: 'active'
            }
          })
        )
      );

      // Update class enrollment count
      await tx.class.update({
        where: { id: classId },
        data: { currentEnrollment: { increment: studentIds.length } }
      });

      return enrollments;
    });
  }
}
```

### 4.4 Service Interface Pattern

```typescript
// src/modules/students/services/interfaces/student-service.interface.ts

export interface IStudentService {
  getStudents(centerId: string, filters: StudentFilters, pagination: PaginationParams): Promise<PaginatedResult<Student>>;
  getStudentById(id: string): Promise<Student | null>;
  createStudent(centerId: string, data: CreateStudentDTO): Promise<Student>;
  updateStudent(id: string, data: UpdateStudentDTO): Promise<Student>;
  archiveStudent(id: string): Promise<Student>;
  searchStudents(centerId: string, query: string): Promise<Student[]>;
  importFromExcel(centerId: string, file: Buffer): Promise<ImportResult>;
  exportToExcel(centerId: string, filters: StudentFilters): Promise<Buffer>;
}

// src/modules/students/services/student.service.ts

export class StudentService implements IStudentService {
  // Implementation
}
```

---

## 5. Repository Layer

### 5.1 Repository Architecture

The repository layer is implemented through **Prisma Client** with repository classes for complex queries:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer                                │
│   studentService.getStudents()                                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Repository Layer                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                StudentRepository                             │ │
│  │  • Complex query methods                                     │ │
│  │  • Query builders                                            │ │
│  │  • Helper methods                                            │ │
│  │                                                             │ │
│  │  findByCenter(centerId, options)                            │ │
│  │  findWithEnrollments(id)                                     │ │
│  │  search(query, filters)                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Prisma Client                               │ │
│  │                                                             │ │
│  │  prisma.student.findMany({ ... })                           │ │
│  │  prisma.student.findUnique({ where: { id } })               │ │
│  │  prisma.student.create({ data: { ... } })                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Repository Implementation

```typescript
// src/modules/students/repositories/student.repository.ts

export class StudentRepository {
  constructor(private prisma: PrismaService) {}

  async findByCenter(
    centerId: string,
    options: {
      filters?: StudentFilters;
      pagination?: PaginationParams;
      include?: Prisma.StudentInclude;
    }
  ): Promise<PaginatedResult<Student>> {
    const { filters = {}, pagination = { page: 1, limit: 20 }, include } = options;

    const where = this.buildWhereClause(centerId, filters);

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.student.count({ where })
    ]);

    return {
      data,
      meta: { page: pagination.page, limit: pagination.limit, total }
    };
  }

  async findWithEnrollments(id: string): Promise<Student | null> {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          where: { status: 'active' },
          include: { class: true }
        },
        parents: true
      }
    });
  }

  async search(centerId: string, query: string, limit: number = 20): Promise<Student[]> {
    return this.prisma.student.findMany({
      where: {
        centerId,
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } }
        ]
      },
      take: limit,
      orderBy: { fullName: 'asc' }
    });
  }

  async countByStatus(centerId: string): Promise<Record<StudentStatus, number>> {
    const results = await this.prisma.student.groupBy({
      by: ['status'],
      where: { centerId },
      _count: { id: true }
    });

    return results.reduce((acc, { status, _count }) => {
      acc[status as StudentStatus] = _count.id;
      return acc;
    }, {} as Record<StudentStatus, number>);
  }

  private buildWhereClause(centerId: string, filters: StudentFilters): Prisma.StudentWhereInput {
    const where: Prisma.StudentWhereInput = { centerId };

    if (filters.status) where.status = filters.status;
    if (filters.gender) where.gender = filters.gender;
    if (filters.enrollmentDateFrom) {
      where.enrollmentDate = { ...where.enrollmentDate, gte: filters.enrollmentDateFrom };
    }

    return where;
  }
}
```

### 5.3 Query Builder Pattern

```typescript
// src/shared/utils/query-builder.ts

export class QueryBuilder<T> {
  private conditions: Prisma.WhereInput[] = [];
  private includes: Prisma.Include[] = [];
  private orderBy: Prisma.OrderByInput[] = [];
  private pagination = { skip: 0, take: 20 };

  constructor(private model: string) {}

  filter(condition: Prisma.WhereInput): this {
    this.conditions.push(condition);
    return this;
  }

  include(include: Prisma.Include): this {
    this.includes.push(include);
    return this;
  }

  orderBy(order: Prisma.OrderByInput): this {
    this.orderBy.push(order);
    return this;
  }

  paginate(page: number, limit: number): this {
    this.pagination = { skip: (page - 1) * limit, take: limit };
    return this;
  }

  build(): { where: Prisma.WhereInput; include: any; orderBy: any; skip: number; take: number } {
    return {
      where: this.conditions.length > 1 ? { AND: this.conditions } : this.conditions[0] || {},
      include: this.includes.length > 1 ? { AND: this.includes } : this.includes[0],
      orderBy: this.orderBy.length > 1 ? this.orderBy : this.orderBy[0],
      ...this.pagination
    };
  }
}

// Usage
const query = new QueryBuilder('student')
  .filter({ centerId })
  .filter({ status: 'active' })
  .include({ parents: true })
  .orderBy({ createdAt: 'desc' })
  .paginate(1, 20)
  .build();
```

---

## 6. Middleware Layer

### 6.1 Middleware Stack

Request flow through middleware in order:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INCOMING REQUEST                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MIDDLEWARE STACK                                     │
│                                                                              │
│  1. cors()              - CORS headers                                        │
│  2. helmet()           - Security headers (CSP, HSTS, etc.)                   │
│  3. compress()          - Gzip compression                                   │
│  4. bodyParser.json()  - Parse JSON body                                    │
│  5. bodyParser.urlencoded() - Parse form data                               │
│  6. rateLimit()         - Rate limiting (100 req/min)                        │
│  7. authenticate        - JWT verification                                   │
│  8. authorize           - Permission check                                  │
│  9. validateRequest     - Zod schema validation                             │
│ 10. auditLog            - Request logging                                    │
│ 11. controller          - Route handler                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RESPONSE SENT                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Middleware Implementation

```typescript
// src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from './shared/middleware/authenticate';
import { authorize } from './shared/middleware/authorize';
import { errorHandler } from './shared/middleware/error-handler';
import { auditLog } from './shared/middleware/audit-log';

const app = express();

// Security & Infrastructure
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.vietqr.io']
    }
  }
}));

app.use(compression());

// Rate Limiting
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false
}));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check (No auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Protected Routes
app.use('/api/v1', authenticate, authorize, auditLog, routes);

app.use(errorHandler);
```

### 6.3 Authentication Middleware

```typescript
// src/shared/middleware/authenticate.ts

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.substring(7);

    // Verify JWT
    const decoded = jwtService.verifyAccessToken(token);

    // Get user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { permissions: true }
            }
          }
        },
        center: true
      }
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Account inactive or not found');
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedException(`Account locked until ${user.lockedUntil}`);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      centerId: user.centerId,
      roles: user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        centerId: ur.centerId,
        permissions: ur.role.permissions.map(p => p.name)
      })),
      center: user.center
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'Invalid or expired token' }
      });
      return;
    }
    next(error);
  }
};
```

### 6.4 Authorization Middleware

```typescript
// src/shared/middleware/authorize.ts

export const authorize = (...requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AuthenticatedUser;

    // Super admin has all permissions
    if (user.roles.some(r => r.name === 'super_admin')) {
      next();
      return;
    }

    // Check if user has ALL required permissions
    const hasAllPermissions = requiredPermissions.every(required => {
      return user.roles.some(role => role.permissions.includes(required));
    });

    if (!hasAllPermissions) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          required: requiredPermissions
        }
      });
      return;
    }

    // Check center access for non-super-admin
    const resourceCenterId = req.params.centerId || req.body.centerId;
    if (resourceCenterId && user.centerId && resourceCenterId !== user.centerId) {
      // Check if user has cross-center access
      const hasCrossAccess = user.roles.some(r => r.name === 'center_manager' && r.centerId === null);
      if (!hasCrossAccess) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied for this center' }
        });
        return;
      }
    }

    next();
  };
};
```

### 6.5 Error Handler Middleware

```typescript
// src/shared/middleware/error-handler.ts

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Handle known errors
  if (error instanceof ValidationException) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof NotFoundException) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error.message
      }
    });
    return;
  }

  if (error instanceof ConflictException) {
    res.status(409).json({
      success: false,
      error: {
        code: error.code || 'CONFLICT',
        message: error.message
      }
    });
    return;
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_ENTRY', message: 'Resource already exists' }
      });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' }
      });
      return;
    }
  }

  // Default error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message
    }
  });
};
```

### 6.6 Audit Log Middleware

```typescript
// src/shared/middleware/audit-log.ts

export const auditLog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip health checks and certain paths
  if (req.path === '/health' || req.path.startsWith('/api/v1/auth/login')) {
    next();
    return;
  }

  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    res.send = originalSend;

    const duration = Date.now() - startTime;
    const user = req.user as AuthenticatedUser;

    // Log asynchronously (non-blocking)
    setImmediate(() => {
      logAuditEvent({
        userId: user?.id,
        centerId: user?.centerId,
        action: getActionFromMethod(req.method),
        resource: getResourceFromPath(req.path),
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        duration
      });
    });

    return res.send(body);
  };

  next();
};

function getActionFromMethod(method: string): AuditAction {
  const map: Record<string, AuditAction> = {
    GET: 'READ',
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE'
  };
  return map[method] || 'READ';
}

function getResourceFromPath(path: string): string {
  const match = path.match(/\/api\/v1\/([^\/]+)/);
  return match ? match[1] : 'unknown';
}
```

---

## 7. Validation Layer

### 7.1 Validation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Request Flow                                 │
│                                                                  │
│   HTTP Request → Middleware Stack → validateRequest → Controller │
│                                       │                          │
│                                       ▼                          │
│                        ┌──────────────────────────┐           │
│                        │   Zod Validation Schema   │           │
│                        │                            │           │
│                        │  • Parse request body      │           │
│                        │  • Validate types         │           │
│                        │  • Check required fields   │           │
│                        │  • Apply transformations   │           │
│                        └──────────────────────────┘           │
│                                       │                          │
│                          ┌────────────┴────────────┐            │
│                          │                         │            │
│                          ▼                         ▼            │
│                   Valid                Invalid                  │
│                   → Controller         → 400 Error              │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Validation Schema Pattern

```typescript
// src/modules/students/validators/create-student.schema.ts

import { z } from 'zod';

export const createStudentSchema = z.object({
  body: z.object({
    centerId: z.string().uuid('Invalid center ID'),
    fullName: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),
    dateOfBirth: z.string()
      .transform(val => new Date(val))
      .refine(date => date <= new Date(), 'Date of birth cannot be in the future')
      .refine(date => {
        const age = (new Date().getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return age >= 3 && age <= 25;
      }, 'Age must be between 3 and 25 years'),
    gender: z.enum(['male', 'female', 'other'], {
      errorMap: () => ({ message: 'Gender must be male, female, or other' })
    }),
    phone: z.string()
      .regex(/^(0[0-9]{9,10})$/, 'Invalid Vietnamese phone number')
      .optional()
      .or(z.literal('')),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    address: z.string().max(500).optional(),
    enrollmentDate: z.string()
      .transform(val => new Date(val))
      .refine(date => date <= new Date(), 'Enrollment date cannot be in the future'),
    notes: z.string().max(2000).optional()
  })
});

// src/modules/students/validators/query-student.schema.ts

export const queryStudentSchema = z.object({
  query: z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
    status: z.enum(['active', 'inactive', 'archived']).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    search: z.string().max(100).optional(),
    enrollmentDateFrom: z.string().transform(val => new Date(val)).optional(),
    enrollmentDateTo: z.string().transform(val => new Date(val)).optional(),
    sort: z.enum(['fullName', 'dateOfBirth', 'enrollmentDate', 'createdAt']).optional(),
    order: z.enum(['asc', 'desc']).optional()
  })
});
```

### 7.3 Validation Middleware

```typescript
// src/shared/middleware/validate-request.ts

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

type ZodSchema = z.ZodSchema<any, any, any>;

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (options: ValidateOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (options.body) {
        req.body = await options.body.parseAsync(req.body);
      }
      if (options.query) {
        req.query = await options.query.parseAsync(req.query);
      }
      if (options.params) {
        req.params = await options.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        });
        return;
      }
      next(error);
    }
  };
};

// Usage in routes
router.post(
  '/',
  authenticate,
  authorize('students.create'),
  validateRequest({
    body: createStudentSchema,
    query: queryStudentSchema
  }),
  studentController.createStudent
);
```

### 7.4 Custom Validators

```typescript
// src/shared/validators/common.validators.ts

import { z } from 'zod';

// Vietnamese phone number
export const vietnamesePhone = z.string()
  .regex(/^(0[0-9]{9,10})$/, 'Invalid Vietnamese phone number');

// Vietnamese date (DD/MM/YYYY)
export const vietnameseDate = z.string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in DD/MM/YYYY format')
  .transform(val => {
    const [day, month, year] = val.split('/').map(Number);
    return new Date(year, month - 1, day);
  });

// UUID
export const uuid = z.string().uuid('Invalid UUID format');

// Password strength
export const strongPassword = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
});
```

---

## 8. Error Handling Strategy

### 8.1 Error Class Hierarchy

```
Error
├── BaseException
│   ├── ValidationException
│   ├── NotFoundException
│   ├── ConflictException
│   ├── UnauthorizedException
│   ├── ForbiddenException
│   ├── AccountLockedException
│   └── BusinessException
├── PrismaClientKnownRequestError
└── JsonWebTokenError
```

### 8.2 Exception Classes

```typescript
// src/shared/types/error.types.ts

export class BaseException extends Error {
  constructor(
    public message: string,
    public code: string,
    public httpStatus: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationException extends BaseException {
  constructor(message: string, public details: ValidationError[] = []) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundException extends BaseException {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictException extends BaseException {
  constructor(message: string, code: string = 'CONFLICT') {
    super(message, code, 409);
  }
}

export class UnauthorizedException extends BaseException {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenException extends BaseException {
  constructor(message: string = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class AccountLockedException extends BaseException {
  constructor(message: string = 'Account is locked') {
    super(message, 'ACCOUNT_LOCKED', 423);
  }
}

export class BusinessException extends BaseException {
  constructor(message: string, code: string) {
    super(message, code, 422);
  }
}

// Usage
throw new ValidationException('Invalid input', [
  { field: 'email', message: 'Invalid email format' },
  { field: 'dateOfBirth', message: 'Age must be between 3 and 25' }
]);

throw new NotFoundException('Student');

throw new ConflictException('Student already enrolled', 'ALREADY_ENROLLED');
```

### 8.3 Error Response Format

```typescript
// src/shared/types/api.types.ts

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ValidationError[];
    timestamp: string;
    path?: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

// Example error responses
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "fullName", "message": "Name is required" }
    ],
    "timestamp": "2026-06-03T10:30:00Z",
    "path": "/api/v1/students"
  }
}
```

### 8.4 Async Error Wrapper

```typescript
// src/shared/utils/async-handler.ts

import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncFunction): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage
router.get('/students', asyncHandler(async (req, res) => {
  const students = await studentService.getStudents(req.user.centerId, req.query);
  res.json({ success: true, data: students });
}));
```

---

## 9. Logging Strategy

### 9.1 Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| ERROR | Application errors requiring attention | Database connection failed, unhandled exception |
| WARN | Warning conditions | Rate limit hit, deprecated API usage |
| INFO | Important business events | User login, invoice paid, class created |
| DEBUG | Detailed debugging information | Query execution, cache hit/miss |
| TRACE | Very detailed tracing | Function entry/exit, variable values |

### 9.2 Logger Service

```typescript
// src/shared/services/logger.service.ts

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
  ip?: string;
  duration?: number;
}

export class LoggerService {
  private level: LogLevel;
  private format: 'json' | 'text';

  constructor() {
    this.level = LogLevel[process.env.LOG_LEVEL?.toUpperCase() || 'INFO'];
    this.format = process.env.LOG_FORMAT as 'json' | 'text' || 'json';
  }

  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  trace(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (level > this.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      ...context
    };

    if (this.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      console.log(`[${entry.timestamp}] ${entry.level}: ${message}`, context || '');
    }
  }
}

// Global logger instance
export const logger = new LoggerService();
```

### 9.3 Structured Logging

```typescript
// Authentication logging
logger.info('User login successful', {
  userId: user.id,
  email: user.email,
  centerId: user.centerId,
  ip: req.ip,
  userAgent: req.headers['user-agent']
});

// Business event logging
logger.info('Invoice paid', {
  invoiceId: invoice.id,
  invoiceNumber: invoice.invoiceNumber,
  studentId: invoice.studentId,
  amount: invoice.totalAmount,
  paymentMethod: payment.paymentMethod,
  transactionId: payment.transactionId
});

// Error logging with stack trace
logger.error('Failed to mark attendance', {
  error: error.message,
  stack: error.stack,
  sessionId: sessionId,
  teacherId: teacherId,
  studentIds: studentIds
});
```

### 9.4 Request Logging

```typescript
// src/shared/middleware/request-logger.ts

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Attach request ID to request
  req.requestId = requestId;

  // Log request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
  });

  next();
};
```

### 9.5 Audit Log Structure

```typescript
// src/shared/services/audit.service.ts

interface AuditEntry {
  userId: string;
  centerId?: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT';
  resource: string;
  resourceId?: string;
  changes?: { before: any; after: any };
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        centerId: entry.centerId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        changes: entry.changes ? JSON.stringify(entry.changes) : undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent
      }
    });
  }

  async getLogs(filters: AuditLogFilters): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.centerId) where.centerId = filters.centerId;
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true } } },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return { data, meta: { page: filters.page, limit: filters.limit, total } };
  }
}
```

---

## 10. RBAC Architecture

### 10.1 RBAC Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  id: uuid                   │  email: string                       │   │
│   │  centerId: uuid (nullable)  │  roles: UserRole[]                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       USER_ROLE (Junction)                          │   │
│   │   userId  │  roleId  │  centerId (nullable for super_admin)       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                            ROLE                                     │   │
│   │   id: uuid  │  name: string  │  isSystem: boolean                  │   │
│   │   description  │  isActive  │  permissions: RolePermission[]       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    ROLE_PERMISSION (Junction)                        │   │
│   │   roleId  │  permissionId                                          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         PERMISSION                                   │   │
│   │   id: uuid  │  name: string  │  module: string  │  level: number   │   │
│   │   description                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Permission Definition

```typescript
// System permissions

export const PERMISSIONS = {
  // Centers
  CENTERS_READ: { name: 'centers.read', module: 'centers', level: 1 },
  CENTERS_CREATE: { name: 'centers.create', module: 'centers', level: 2 },
  CENTERS_UPDATE: { name: 'centers.update', module: 'centers', level: 3 },
  CENTERS_DELETE: { name: 'centers.delete', module: 'centers', level: 4 },

  // Students
  STUDENTS_READ: { name: 'students.read', module: 'students', level: 1 },
  STUDENTS_CREATE: { name: 'students.create', module: 'students', level: 2 },
  STUDENTS_UPDATE: { name: 'students.update', module: 'students', level: 3 },
  STUDENTS_DELETE: { name: 'students.delete', module: 'students', level: 4 },
  STUDENTS_EXPORT: { name: 'students.export', module: 'students', level: 5 },

  // Teachers
  TEACHERS_READ: { name: 'teachers.read', module: 'teachers', level: 1 },
  TEACHERS_CREATE: { name: 'teachers.create', module: 'teachers', level: 2 },
  TEACHERS_UPDATE: { name: 'teachers.update', module: 'teachers', level: 3 },
  TEACHERS_DELETE: { name: 'teachers.delete', module: 'teachers', level: 4 },
  TEACHERS_EXPORT: { name: 'teachers.export', module: 'teachers', level: 5 },

  // Classes
  CLASSES_READ: { name: 'classes.read', module: 'classes', level: 1 },
  CLASSES_CREATE: { name: 'classes.create', module: 'classes', level: 2 },
  CLASSES_UPDATE: { name: 'classes.update', module: 'classes', level: 3 },
  CLASSES_DELETE: { name: 'classes.delete', module: 'classes', level: 4 },

  // Attendance
  ATTENDANCE_READ: { name: 'attendance.read', module: 'attendance', level: 1 },
  ATTENDANCE_CREATE: { name: 'attendance.create', module: 'attendance', level: 2 },
  ATTENDANCE_UPDATE: { name: 'attendance.update', module: 'attendance', level: 3 },

  // Evaluations
  EVALUATIONS_READ: { name: 'evaluations.read', module: 'evaluations', level: 1 },
  EVALUATIONS_CREATE: { name: 'evaluations.create', module: 'evaluations', level: 2 },
  EVALUATIONS_UPDATE: { name: 'evaluations.update', module: 'evaluations', level: 3 },

  // Tuition
  TUITION_READ: { name: 'tuition.read', module: 'tuition', level: 1 },
  TUITION_CREATE: { name: 'tuition.create', module: 'tuition', level: 2 },
  TUITION_UPDATE: { name: 'tuition.update', module: 'tuition', level: 3 },

  // Payments
  PAYMENTS_READ: { name: 'payments.read', module: 'payments', level: 1 },
  PAYMENTS_CREATE: { name: 'payments.create', module: 'payments', level: 2 },

  // Dashboard
  DASHBOARD_READ: { name: 'dashboard.read', module: 'dashboard', level: 1 },
  DASHBOARD_EXPORT: { name: 'dashboard.export', module: 'dashboard', level: 5 },
} as const;

// Permission level hierarchy
export const PERMISSION_LEVELS = {
  NONE: 0,
  READ: 1,
  CREATE: 2,
  UPDATE: 3,
  DELETE: 4,
  EXPORT: 5
};
```

### 10.3 Role Definitions

```typescript
// src/modules/rbac/config/default-roles.ts

export const DEFAULT_ROLES = [
  {
    name: 'super_admin',
    description: 'Platform-wide administrator with full access',
    isSystem: true,
    permissions: ['*'] // All permissions
  },
  {
    name: 'center_manager',
    description: 'Manages a single education center',
    isSystem: true,
    permissions: [
      'centers.read',
      'students.read', 'students.create', 'students.update', 'students.delete', 'students.export',
      'teachers.read', 'teachers.create', 'teachers.update', 'teachers.delete', 'teachers.export',
      'classes.read', 'classes.create', 'classes.update', 'classes.delete',
      'attendance.read', 'attendance.create', 'attendance.update',
      'evaluations.read', 'evaluations.create', 'evaluations.update',
      'tuition.read', 'tuition.create', 'tuition.update',
      'payments.read', 'payments.create',
      'dashboard.read', 'dashboard.export'
    ]
  },
  {
    name: 'teacher',
    description: 'Class teacher with teaching-focused access',
    isSystem: true,
    permissions: [
      'classes.read',
      'attendance.read', 'attendance.create', 'attendance.update',
      'evaluations.read', 'evaluations.create', 'evaluations.update'
    ]
  },
  {
    name: 'parent',
    description: 'Parent/guardian with child-view access',
    isSystem: true,
    permissions: [
      'students.read',
      'attendance.read',
      'evaluations.read',
      'tuition.read',
      'payments.create'
    ]
  }
];
```

### 10.4 RBAC Service Implementation

```typescript
// src/modules/rbac/services/rbac.service.ts

export class RbacService {
  constructor(private prisma: PrismaService) {}

  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { permissions: true }
            }
          }
        }
      }
    });

    if (!user) return false;

    // Super admin has all permissions
    if (user.userRoles.some(ur => ur.role.name === 'super_admin')) {
      return true;
    }

    // Check if any role has the permission
    return user.userRoles.some(role => {
      // Null centerId means all centers
      if (role.centerId === null) {
        return role.role.permissions.some(p => p.name === permission);
      }
      // Otherwise check if role applies to user's center
      if (role.centerId === user.centerId) {
        return role.role.permissions.some(p => p.name === permission);
      }
      return false;
    });
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { permissions: true }
            }
          }
        }
      }
    });

    if (!user) return [];

    const permissions = new Set<string>();
    user.userRoles.forEach(ur => {
      ur.role.permissions.forEach(p => permissions.add(p.name));
    });

    return Array.from(permissions);
  }

  async assignRoleToUser(userId: string, roleId: string, centerId?: string): Promise<void> {
    await this.prisma.userRole.create({
      data: { userId, roleId, centerId }
    });
  }

  async removeRoleFromUser(userId: string, roleId: string, centerId?: string): Promise<void> {
    await this.prisma.userRole.deleteMany({
      where: { userId, roleId, centerId }
    });
  }

  async createRole(data: CreateRoleDTO): Promise<Role> {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: false,
        isActive: true
      }
    });
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    // Remove existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId }
    });

    // Add new permissions
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map(permissionId => ({
        roleId,
        permissionId
      }))
    });
  }
}
```

### 10.5 Permission Check Middleware

```typescript
// src/shared/middleware/require-permission.ts

export const requirePermission = (...permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AuthenticatedUser;

    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    const hasPermission = permissions.every(perm => {
      return user.roles.some(role => role.permissions.includes(perm));
    });

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action',
          required: permissions
        }
      });
      return;
    }

    next();
  };
};

// Usage in routes
router.delete(
  '/students/:id',
  authenticate,
  requirePermission('students.delete'),
  studentController.archiveStudent
);
```

### 10.6 Multi-Tenant Permission Scoping

```typescript
// Permission scoping logic

interface ScopedPermission {
  permission: string;
  centerId?: string;  // undefined = all centers
}

// User's effective permissions with scope
function getUserScopedPermissions(user: AuthenticatedUser): ScopedPermission[] {
  const scopedPermissions: ScopedPermission[] = [];

  user.roles.forEach(role => {
    role.permissions.forEach(permission => {
      scopedPermissions.push({
        permission,
        centerId: role.centerId || undefined  // undefined means all centers
      });
    });
  });

  return scopedPermissions;
}

// Check if user can access resource in specific center
function canAccessCenter(user: AuthenticatedUser, centerId: string): boolean {
  // Super admin (no center restriction) can access all
  if (user.roles.some(r => r.name === 'super_admin' && !r.centerId)) {
    return true;
  }

  // Check if user has any role that applies to this center
  return user.roles.some(role => role.centerId === centerId);
}
```

---

## Appendix A: File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Controller | `{module}.controller.ts` | `students.controller.ts` |
| Service | `{module}.service.ts` | `students.service.ts` |
| Routes | `{module}.routes.ts` | `students.routes.ts` |
| Validator | `{action}.schema.ts` | `create-student.schema.ts` |
| Types | `{module}.types.ts` | `students.types.ts` |
| Enums | `{module}.enum.ts` | `student-status.enum.ts` |
| Repository | `{entity}.repository.ts` | `student.repository.ts` |
| Middleware | `{purpose}.ts` | `authenticate.ts` |
| Exception | `{type}.exception.ts` | `not-found.exception.ts` |

---

**Document End**