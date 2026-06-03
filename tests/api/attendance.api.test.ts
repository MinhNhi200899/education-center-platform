import { vi } from 'vitest';
import request, { SuperTest, Test } from 'supertest';
import express, { Application } from 'express';

// ============================================================
// API TEST SETUP
// ============================================================

// Mock the database connection before importing app
vi.mock('../src/config/database', () => {
  const mockPrismaClient = {
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    attendanceRecord: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    class: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    absenceReason: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrismaClient)),
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };

  return {
    prisma: mockPrismaClient,
    connectDatabase: vi.fn().mockResolvedValue(undefined),
    disconnectDatabase: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock logger
vi.mock('../src/shared/services/logger.service', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import express app after mocking
import { app } from '../src/app';
import { AttendanceStatus, SessionStatus, EnrollmentStatus } from '@prisma/client';
import { generateId } from './factories/data.factory';

// ============================================================
// API TESTS - ATTENDANCE ENDPOINTS
// ============================================================

describe('Attendance API', () => {
  let agent: SuperTest<Test>;

  beforeEach(() => {
    agent = request(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // GET /api/v1/attendance - List Attendance
  // ============================================================

  describe('GET /api/v1/attendance', () => {
    it('should return 200 with paginated attendance records', async () => {
      const mockRecords = [
        {
          id: generateId(),
          studentId: generateId(),
          sessionId: generateId(),
          status: AttendanceStatus.present,
          reason: null,
          recordedBy: generateId(),
          recordedAt: new Date().toISOString(),
          approvedBy: null,
          approvedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          student: { id: generateId(), fullName: 'Test Student', avatarUrl: null },
          session: {
            id: generateId(),
            sessionDate: new Date().toISOString(),
            startTime: '08:00',
            endTime: '09:30',
            classId: generateId(),
            class: { id: generateId(), name: 'Test Class' },
          },
        },
      ];

      // Mock the attendance service
      const { prisma } = await import('../src/config/database');
      (prisma.attendanceRecord.count as any).mockResolvedValue(1);
      (prisma.attendanceRecord.findMany as any).mockResolvedValue(mockRecords);

      const response = await agent.get('/api/v1/attendance').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBeDefined();
    });

    it('should accept filter parameters', async () => {
      const { prisma } = await import('../src/config/database');
      (prisma.attendanceRecord.count as any).mockResolvedValue(0);
      (prisma.attendanceRecord.findMany as any).mockResolvedValue([]);

      const response = await agent
        .get('/api/v1/attendance')
        .query({
          studentId: generateId(),
          status: 'present',
          page: '1',
          limit: '10',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await agent.get('/api/v1/attendance').query({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // ============================================================
  // POST /api/v1/attendance - Mark Single Attendance
  // ============================================================

  describe('POST /api/v1/attendance', () => {
    it('should return 201 when attendance is marked successfully', async () => {
      const studentId = generateId();
      const sessionId = generateId();
      const classId = generateId();

      const mockSession = {
        id: sessionId,
        classId,
        teacherId: generateId(),
        sessionDate: new Date(),
        startTime: '08:00',
        endTime: '09:30',
        classroom: 'Room 101',
        sessionType: 'regular',
        status: SessionStatus.scheduled,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        class: { id: classId, name: 'Test Class' },
      };

      const mockEnrollment = {
        id: generateId(),
        studentId,
        classId,
        enrolledAt: new Date(),
        startDate: new Date(),
        endDate: null,
        status: EnrollmentStatus.active,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRecord = {
        id: generateId(),
        studentId,
        sessionId,
        status: AttendanceStatus.present,
        reason: null,
        recordedBy: 'system',
        recordedAt: new Date(),
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: { id: studentId, fullName: 'Test Student', avatarUrl: null },
        session: mockSession,
      };

      const { prisma } = await import('../src/config/database');
      (prisma.session.findUnique as any).mockResolvedValue(mockSession);
      (prisma.enrollment.findUnique as any).mockResolvedValue(mockEnrollment);
      (prisma.attendanceRecord.findUnique as any).mockResolvedValue(null);
      (prisma.attendanceRecord.create as any).mockResolvedValue(mockRecord);

      const response = await agent
        .post('/api/v1/attendance')
        .send({
          studentId,
          sessionId,
          status: AttendanceStatus.present,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.studentId).toBe(studentId);
    });

    it('should return 400 for invalid request body', async () => {
      const response = await agent.post('/api/v1/attendance').send({
        studentId: 'invalid-uuid',
        sessionId: generateId(),
        status: AttendanceStatus.present,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await agent.post('/api/v1/attendance').send({
        studentId: generateId(),
        // missing sessionId and status
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // POST /api/v1/attendance/bulk - Bulk Mark Attendance
  // ============================================================

  describe('POST /api/v1/attendance/bulk', () => {
    it('should return 201 when bulk attendance is marked', async () => {
      const sessionId = generateId();
      const classId = generateId();

      const mockSession = {
        id: sessionId,
        classId,
        teacherId: generateId(),
        sessionDate: new Date(),
        startTime: '08:00',
        endTime: '09:30',
        classroom: 'Room 101',
        sessionType: 'regular',
        status: SessionStatus.scheduled,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        class: { id: classId, name: 'Test Class' },
      };

      const { prisma } = await import('../src/config/database');
      (prisma.session.findUnique as any).mockResolvedValue(mockSession);
      (prisma.attendanceRecord.findUnique as any).mockResolvedValue(null);
      (prisma.attendanceRecord.create as any).mockResolvedValue({});
      (prisma.session.update as any).mockResolvedValue({});

      const response = await agent
        .post('/api/v1/attendance/bulk')
        .send({
          sessionId,
          records: [
            { studentId: generateId(), status: AttendanceStatus.present },
            { studentId: generateId(), status: AttendanceStatus.absent },
          ],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.marked).toBeDefined();
    });

    it('should return 400 when records array is empty', async () => {
      const response = await agent
        .post('/api/v1/attendance/bulk')
        .send({
          sessionId: generateId(),
          records: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // PUT /api/v1/attendance/:id - Update Attendance
  // ============================================================

  describe('PUT /api/v1/attendance/:id', () => {
    it('should return 200 when attendance is updated', async () => {
      const attendanceId = generateId();
      const mockRecord = {
        id: attendanceId,
        studentId: generateId(),
        sessionId: generateId(),
        status: AttendanceStatus.present,
        reason: null,
        recordedBy: generateId(),
        recordedAt: new Date(),
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: { id: generateId(), fullName: 'Test Student', avatarUrl: null },
        session: {
          id: generateId(),
          sessionDate: new Date(),
          startTime: '08:00',
          endTime: '09:30',
          classId: generateId(),
          class: { id: generateId(), name: 'Test Class' },
        },
      };

      const { prisma } = await import('../src/config/database');
      (prisma.attendanceRecord.findUnique as any).mockResolvedValue(mockRecord);
      (prisma.attendanceRecord.update as any).mockResolvedValue({
        ...mockRecord,
        status: AttendanceStatus.late,
      });

      const response = await agent
        .put(`/api/v1/attendance/${attendanceId}`)
        .send({
          status: AttendanceStatus.late,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(AttendanceStatus.late);
    });

    it('should return 404 when attendance record not found', async () => {
      const { prisma } = await import('../src/config/database');
      (prisma.attendanceRecord.findUnique as any).mockResolvedValue(null);

      const response = await agent
        .put(`/api/v1/attendance/${generateId()}`)
        .send({
          status: AttendanceStatus.late,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // POST /api/v1/attendance/:id/approve - Approve Absence
  // ============================================================

  describe('POST /api/v1/attendance/:id/approve', () => {
    it('should return 200 when absence is approved', async () => {
      const attendanceId = generateId();
      const approverId = generateId();

      const mockRecord = {
        id: attendanceId,
        studentId: generateId(),
        sessionId: generateId(),
        status: AttendanceStatus.absent,
        reason: 'Sick',
        recordedBy: generateId(),
        recordedAt: new Date(),
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: { id: generateId(), fullName: 'Test Student', avatarUrl: null },
        session: {
          id: generateId(),
          sessionDate: new Date(),
          startTime: '08:00',
          endTime: '09:30',
          classId: generateId(),
          class: { id: generateId(), name: 'Test Class' },
        },
      };

      const { prisma } = await import('../src/config/database');
      (prisma.attendanceRecord.findUnique as any).mockResolvedValue(mockRecord);
      (prisma.attendanceRecord.update as any).mockResolvedValue({
        ...mockRecord,
        status: AttendanceStatus.excused,
        approvedBy: approverId,
        approvedAt: new Date(),
      });

      const response = await agent
        .post(`/api/v1/attendance/${attendanceId}/approve`)
        .send({
          approvedBy: approverId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(AttendanceStatus.excused);
    });

    it('should return 400 when record is not absent', async () => {
      const mockRecord = {
        id: generateId(),
        status: AttendanceStatus.present,
      };

      const { prisma } = await import('../src/config/database');
      (prisma.attendanceRecord.findUnique as any).mockResolvedValue(mockRecord);

      const response = await agent
        .post(`/api/v1/attendance/${mockRecord.id}/approve`)
        .send({
          approvedBy: generateId(),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // GET /api/v1/attendance/stats - Get Attendance Statistics
  // ============================================================

  describe('GET /api/v1/attendance/stats', () => {
    it('should return 200 with student statistics', async () => {
      const studentId = generateId();

      const { prisma } = await import('../src/config/database');
      (prisma.student.findUnique as any).mockResolvedValue({
        id: studentId,
        fullName: 'Test Student',
      });
      (prisma.attendanceRecord.findMany as any).mockResolvedValue([
        { status: AttendanceStatus.present },
        { status: AttendanceStatus.present },
        { status: AttendanceStatus.absent },
      ]);

      const response = await agent
        .get('/api/v1/attendance/stats')
        .query({ studentId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.studentId).toBe(studentId);
      expect(response.body.data.totalSessions).toBe(3);
    });

    it('should return 200 with class statistics', async () => {
      const classId = generateId();

      const { prisma } = await import('../src/config/database');
      (prisma.class.findUnique as any).mockResolvedValue({ id: classId, name: 'Test Class' });
      (prisma.enrollment.count as any).mockResolvedValue(25);
      (prisma.attendanceRecord.findMany as any).mockResolvedValue([
        { status: AttendanceStatus.present },
        { status: AttendanceStatus.present },
      ]);

      const response = await agent
        .get('/api/v1/attendance/stats')
        .query({ classId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.classId).toBe(classId);
    });

    it('should return 400 when neither studentId nor classId provided', async () => {
      const response = await agent.get('/api/v1/attendance/stats');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('studentId or classId');
    });
  });

  // ============================================================
  // GET /api/v1/attendance/reasons - Get Absence Reasons
  // ============================================================

  describe('GET /api/v1/attendance/reasons', () => {
    it('should return 200 with absence reasons', async () => {
      const mockReasons = [
        {
          id: generateId(),
          name: 'Sick',
          description: 'Student illness',
          displayOrder: 1,
          isSystem: true,
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: generateId(),
          name: 'Family Emergency',
          description: null,
          displayOrder: 2,
          isSystem: true,
          isActive: true,
          createdAt: new Date(),
        },
      ];

      const { prisma } = await import('../src/config/database');
      (prisma.absenceReason.findMany as any).mockResolvedValue(mockReasons);

      const response = await agent.get('/api/v1/attendance/reasons').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.count).toBe(2);
    });
  });

  // ============================================================
  // POST /api/v1/attendance/reasons - Create Absence Reason
  // ============================================================

  describe('POST /api/v1/attendance/reasons', () => {
    it('should return 201 when reason is created', async () => {
      const centerId = generateId();

      const mockReason = {
        id: generateId(),
        name: 'Custom Reason',
        description: 'Custom description',
        displayOrder: 5,
        isSystem: false,
        isActive: true,
        createdAt: new Date(),
      };

      const { prisma } = await import('../src/config/database');
      (prisma.absenceReason.create as any).mockResolvedValue(mockReason);

      const response = await agent
        .post('/api/v1/attendance/reasons')
        .set('x-center-id', centerId)
        .send({
          name: 'Custom Reason',
          description: 'Custom description',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Custom Reason');
    });

    it('should return 400 when centerId is missing', async () => {
      const response = await agent.post('/api/v1/attendance/reasons').send({
        name: 'Custom Reason',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // 404 Handler
  // ============================================================

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await agent.get('/api/v1/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});