import { describe, it, expect, vi, beforeEach } from 'vitest';
import request, { SuperTest, Test } from 'supertest';
import express, { Application } from 'express';
import { validateRequest } from '../../src/shared/middleware/validate-request';
import {
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
  createAttendanceSessionSchema,
  updateAttendanceSchema,
  approveAbsenceSchema,
  getAttendanceSchema,
  getStudentAttendanceSchema,
  getClassAttendanceSchema,
  createAbsenceReasonSchema,
  updateAbsenceReasonSchema,
} from '../../src/modules/attendance/validators/attendance.validators';
import { AttendanceStatus } from '@prisma/client';
import { generateId } from '../factories/data.factory';

// ============================================================
// INTEGRATION TESTS - VALIDATORS VIA HTTP
// ============================================================

describe('Attendance Validators Integration', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  // Helper to make request and return response
  const makeRequest = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: any) => {
    const agent = request(app);
    const req = method === 'get' ? agent.get(path) :
                method === 'post' ? agent.post(path).send(body || {}) :
                method === 'put' ? agent.put(path).send(body || {}) :
                agent.delete(path);
    return req;
  };

  describe('Mark Attendance Validation', () => {
    it('should pass valid attendance data through validation', async () => {
      const handler = vi.fn((req, res) => {
        res.json({ success: true, data: req.body });
      });

      app.post(
        '/attendance',
        validateRequest(markAttendanceSchema),
        handler
      );

      const response = await request(app)
        .post('/attendance')
        .send({
          studentId: generateId(),
          sessionId: generateId(),
          status: AttendanceStatus.present,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('should reject invalid UUID in request', async () => {
      app.post(
        '/attendance',
        validateRequest(markAttendanceSchema),
        vi.fn()
      );

      const response = await request(app)
        .post('/attendance')
        .send({
          studentId: 'not-a-uuid',
          sessionId: generateId(),
          status: AttendanceStatus.present,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid status value', async () => {
      app.post(
        '/attendance',
        validateRequest(markAttendanceSchema),
        vi.fn()
      );

      const response = await request(app)
        .post('/attendance')
        .send({
          studentId: generateId(),
          sessionId: generateId(),
          status: 'invalid_status',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      app.post(
        '/attendance',
        validateRequest(markAttendanceSchema),
        vi.fn()
      );

      const response = await request(app)
        .post('/attendance')
        .send({
          studentId: generateId(),
          // missing sessionId and status
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Bulk Mark Attendance Validation', () => {
    it('should pass valid bulk attendance data', async () => {
      const handler = vi.fn((req, res) => {
        res.json({ success: true });
      });

      app.post(
        '/attendance/bulk',
        validateRequest(bulkMarkAttendanceSchema),
        handler
      );

      const response = await request(app)
        .post('/attendance/bulk')
        .send({
          sessionId: generateId(),
          records: [
            { studentId: generateId(), status: AttendanceStatus.present },
            { studentId: generateId(), status: AttendanceStatus.absent },
          ],
        });

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should reject empty records array', async () => {
      app.post(
        '/attendance/bulk',
        validateRequest(bulkMarkAttendanceSchema),
        vi.fn()
      );

      const response = await request(app)
        .post('/attendance/bulk')
        .send({
          sessionId: generateId(),
          records: [],
        });

      expect(response.status).toBe(400);
    });

    it('should reject when records array is missing', async () => {
      app.post(
        '/attendance/bulk',
        validateRequest(bulkMarkAttendanceSchema),
        vi.fn()
      );

      const response = await request(app)
        .post('/attendance/bulk')
        .send({
          sessionId: generateId(),
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Update Attendance Validation', () => {
    it('should pass valid update with params', async () => {
      const handler = vi.fn((req, res) => {
        res.json({ success: true });
      });

      app.put(
        '/attendance/:id',
        validateRequest(updateAttendanceSchema),
        handler
      );

      const response = await request(app)
        .put(`/attendance/${generateId()}`)
        .send({ status: AttendanceStatus.late });

      expect(response.status).toBe(200);
    });

    it('should reject invalid UUID in params', async () => {
      app.put(
        '/attendance/:id',
        validateRequest(updateAttendanceSchema),
        vi.fn()
      );

      const response = await request(app)
        .put('/attendance/invalid-id')
        .send({ status: AttendanceStatus.present });

      expect(response.status).toBe(400);
    });

    it('should allow partial updates (empty body)', async () => {
      const handler = vi.fn((req, res) => {
        res.json({ success: true });
      });

      app.put(
        '/attendance/:id',
        validateRequest(updateAttendanceSchema),
        handler
      );

      const response = await request(app)
        .put(`/attendance/${generateId()}`)
        .send({});

      expect(response.status).toBe(200);
    });
  });

  describe('Approve Absence Validation', () => {
    it('should pass valid approval request', async () => {
      const handler = vi.fn((req, res) => {
        res.json({ success: true });
      });

      app.post(
        '/attendance/:id/approve',
        validateRequest(approveAbsenceSchema),
        handler
      );

      const response = await request(app)
        .post(`/attendance/${generateId()}/approve`)
        .send({ approvedBy: generateId() });

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ approvedBy: expect.any(String) }),
        }),
        expect.anything(),
        expect.anything()
      );
    });

    it('should reject invalid approver UUID', async () => {
      app.post(
        '/attendance/:id/approve',
        validateRequest(approveAbsenceSchema),
        vi.fn()
      );

      const response = await request(app)
        .post(`/attendance/${generateId()}/approve`)
        .send({ approvedBy: 'invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('Get Attendance Query Validation', () => {
    it('should pass valid query parameters', async () => {
      const handler = vi.fn((req, res) => {
        res.json({ success: true });
      });

      app.get(
        '/attendance',
        validateRequest(getAttendanceSchema),
        handler
      );

      const response = await request(app)
        .get('/attendance')
        .query({
          centerId: generateId(),
          classId: generateId(),
          status: AttendanceStatus.present,
          page: '1',
          limit: '20',
        });

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should allow empty query', async () => {
      const handler = vi.fn((req, res) => {
        res.json({ success: true });
      });

      app.get(
        '/attendance',
        validateRequest(getAttendanceSchema),
        handler
      );

      const response = await request(app).get('/attendance');

      expect(response.status).toBe(200);
    });

    it('should convert string pagination to numbers', async () => {
      let capturedBody: any;

      const handler = vi.fn((req, res) => {
        capturedBody = req.query;
        res.json({ success: true });
      });

      app.get(
        '/attendance',
        validateRequest(getAttendanceSchema),
        handler
      );

      await request(app)
        .get('/attendance')
        .query({ page: '5', limit: '50' });

      expect(capturedBody.page).toBe(5);
      expect(capturedBody.limit).toBe(50);
    });
  });

  describe('Get Student Attendance Validation', () => {
    it('should pass valid student attendance query', async () => {
      const handler = vi.fn((req, res) => {
        res.json({ success: true });
      });

      app.get(
        '/attendance/student/:id',
        validateRequest(getStudentAttendanceSchema),
        handler
      );

      const response = await request(app)
        .get(`/attendance/student/${generateId()}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });

      expect(response.status).toBe(200);
    });

    it('should reject invalid student ID in params', async () => {
      app.get(
        '/attendance/student/:id',
        validateRequest(getStudentAttendanceSchema),
        vi.fn()
      );

      const response = await request(app)
        .get('/attendance/student/invalid-id')
        .query({});

      expect(response.status).toBe(400);
    });
  });

  describe('Get Class Attendance Validation', () => {
    it('should pass valid class attendance query', async () => {
      const handler = vi.fn((req, res) => {
        res.json({ success: true });
      });

      app.get(
        '/attendance/class/:id',
        validateRequest(getClassAttendanceSchema),
        handler
      );

      const response = await request(app)
        .get(`/attendance/class/${generateId()}`)
        .query({ sessionId: generateId() });

      expect(response.status).toBe(200);
    });
  });

  describe('Create Absence Reason Validation', () => {
    it('should pass valid absence reason creation', async () => {
      const handler = vi.fn((req, res) => {
        res.json({ success: true });
      });

      app.post(
        '/attendance/reasons',
        validateRequest(createAbsenceReasonSchema),
        handler
      );

      const response = await request(app)
        .post('/attendance/reasons')
        .send({
          name: 'Custom Reason',
          description: 'A custom absence reason',
          centerId: generateId(),
        });

      expect(response.status).toBe(200);
    });

    it('should reject missing name field', async () => {
      app.post(
        '/attendance/reasons',
        validateRequest(createAbsenceReasonSchema),
        vi.fn()
      );

      const response = await request(app)
        .post('/attendance/reasons')
        .send({
          description: 'Missing name',
        });

      expect(response.status).toBe(400);
    });

    it('should reject name exceeding 100 characters', async () => {
      app.post(
        '/attendance/reasons',
        validateRequest(createAbsenceReasonSchema),
        vi.fn()
      );

      const response = await request(app)
        .post('/attendance/reasons')
        .send({
          name: 'a'.repeat(101),
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Update Absence Reason Validation', () => {
    it('should pass valid absence reason update', async () => {
      const handler = vi.fn((req, res) => {
        res.json({ success: true });
      });

      app.put(
        '/attendance/reasons/:id',
        validateRequest(updateAbsenceReasonSchema),
        handler
      );

      const response = await request(app)
        .put(`/attendance/reasons/${generateId()}`)
        .send({
          name: 'Updated Name',
          isActive: false,
        });

      expect(response.status).toBe(200);
    });

    it('should reject invalid reason ID in params', async () => {
      app.put(
        '/attendance/reasons/:id',
        validateRequest(updateAbsenceReasonSchema),
        vi.fn()
      );

      const response = await request(app)
        .put('/attendance/reasons/invalid-id')
        .send({ name: 'Updated' });

      expect(response.status).toBe(400);
    });
  });
});