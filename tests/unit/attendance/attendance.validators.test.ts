import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
  createAttendanceSessionSchema,
  updateAttendanceSchema,
  approveAbsenceSchema,
  getAttendanceSchema,
  getStudentAttendanceSchema,
  getClassAttendanceSchema,
  getAttendanceStatsSchema,
  createAbsenceReasonSchema,
  updateAbsenceReasonSchema,
} from '../../../src/modules/attendance/validators/attendance.validators';
import { ZodError } from 'zod';
import { AttendanceStatus } from '@prisma/client';
import { generateId } from '../../factories/data.factory';

// ============================================================
// UNIT TESTS - ATTENDANCE VALIDATORS
// ============================================================

describe('Attendance Validators', () => {
  describe('markAttendanceSchema', () => {
    it('should validate correct attendance data', () => {
      const validData = {
        studentId: generateId(),
        sessionId: generateId(),
        status: AttendanceStatus.present,
      };

      const result = markAttendanceSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });

    it('should reject invalid studentId format', () => {
      const invalidData = {
        studentId: 'not-a-uuid',
        sessionId: generateId(),
        status: AttendanceStatus.present,
      };

      const result = markAttendanceSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject invalid sessionId format', () => {
      const invalidData = {
        studentId: generateId(),
        sessionId: 'invalid-session',
        status: AttendanceStatus.present,
      };

      const result = markAttendanceSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject invalid attendance status', () => {
      const invalidData = {
        studentId: generateId(),
        sessionId: generateId(),
        status: 'invalid_status',
      };

      const result = markAttendanceSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should accept optional reason', () => {
      const validData = {
        studentId: generateId(),
        sessionId: generateId(),
        status: AttendanceStatus.excused,
        reason: 'Doctor appointment',
      };

      const result = markAttendanceSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });

    it('should reject reason longer than 500 characters', () => {
      const invalidData = {
        studentId: generateId(),
        sessionId: generateId(),
        status: AttendanceStatus.excused,
        reason: 'a'.repeat(501),
      };

      const result = markAttendanceSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });
  });

  describe('bulkMarkAttendanceSchema', () => {
    it('should validate bulk attendance with multiple records', () => {
      const validData = {
        sessionId: generateId(),
        records: [
          { studentId: generateId(), status: AttendanceStatus.present },
          { studentId: generateId(), status: AttendanceStatus.absent },
        ],
      };

      const result = bulkMarkAttendanceSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });

    it('should reject empty records array', () => {
      const invalidData = {
        sessionId: generateId(),
        records: [],
      };

      const result = bulkMarkAttendanceSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject when records array is missing', () => {
      const invalidData = {
        sessionId: generateId(),
      };

      const result = bulkMarkAttendanceSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should validate each record in bulk attendance', () => {
      const validData = {
        sessionId: generateId(),
        records: [
          { studentId: generateId(), status: AttendanceStatus.present },
          { studentId: generateId(), status: AttendanceStatus.late, reason: 'Traffic' },
        ],
      };

      const result = bulkMarkAttendanceSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });
  });

  describe('createAttendanceSessionSchema', () => {
    it('should validate session attendance with required screenshot', () => {
      const validData = {
        sessionId: generateId(),
        attendanceScreenshotUrl: 'https://example.com/screenshot.png',
      };

      const result = createAttendanceSessionSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });

    it('should accept optional defaultStatus', () => {
      const validData = {
        sessionId: generateId(),
        attendanceScreenshotUrl: 'https://example.com/screenshot.png',
        defaultStatus: AttendanceStatus.present,
      };

      const result = createAttendanceSessionSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });

    it('should accept optional records', () => {
      const validData = {
        sessionId: generateId(),
        attendanceScreenshotUrl: 'https://example.com/screenshot.png',
        records: [
          { studentId: generateId(), status: AttendanceStatus.present },
        ],
      };

      const result = createAttendanceSessionSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });

    it('should reject missing screenshot url', () => {
      const validData = {
        sessionId: generateId(),
      };

      const result = createAttendanceSessionSchema.safeParse({ body: validData });
      expect(result.success).toBe(false);
    });
  });

  describe('updateAttendanceSchema', () => {
    it('should validate update with new status', () => {
      const validData = {
        status: AttendanceStatus.late,
      };

      const result = updateAttendanceSchema.safeParse({
        params: { id: generateId() },
        body: validData,
      });
      expect(result.success).toBe(true);
    });

    it('should validate update with new reason', () => {
      const validData = {
        reason: 'Updated reason',
      };

      const result = updateAttendanceSchema.safeParse({
        params: { id: generateId() },
        body: validData,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid attendance id', () => {
      const result = updateAttendanceSchema.safeParse({
        params: { id: 'invalid-id' },
        body: { status: AttendanceStatus.present },
      });
      expect(result.success).toBe(false);
    });

    it('should allow empty body (no updates)', () => {
      const result = updateAttendanceSchema.safeParse({
        params: { id: generateId() },
        body: {},
      });
      expect(result.success).toBe(true);
    });
  });

  describe('approveAbsenceSchema', () => {
    it('should validate approval with approver id', () => {
      const validData = {
        approvedBy: generateId(),
      };

      const result = approveAbsenceSchema.safeParse({
        params: { id: generateId() },
        body: validData,
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional reason in approval', () => {
      const validData = {
        approvedBy: generateId(),
        reason: 'Approved by manager',
      };

      const result = approveAbsenceSchema.safeParse({
        params: { id: generateId() },
        body: validData,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid approver id', () => {
      const invalidData = {
        approvedBy: 'not-a-uuid',
      };

      const result = approveAbsenceSchema.safeParse({
        params: { id: generateId() },
        body: invalidData,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getAttendanceSchema', () => {
    it('should validate query parameters', () => {
      const validQuery = {
        centerId: generateId(),
        classId: generateId(),
        status: AttendanceStatus.present,
        page: '1',
        limit: '20',
      };

      const result = getAttendanceSchema.safeParse({ query: validQuery });
      expect(result.success).toBe(true);
    });

    it('should convert string page to number', () => {
      const validQuery = {
        page: '5',
      };

      const result = getAttendanceSchema.safeParse({ query: validQuery });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.page).toBe(5);
      }
    });

    it('should reject invalid status', () => {
      const invalidQuery = {
        status: 'invalid_status',
      };

      const result = getAttendanceSchema.safeParse({ query: invalidQuery });
      expect(result.success).toBe(false);
    });

    it('should allow empty query (returns all)', () => {
      const result = getAttendanceSchema.safeParse({ query: {} });
      expect(result.success).toBe(true);
    });

    it('should validate date format strings', () => {
      const validQuery = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const result = getAttendanceSchema.safeParse({ query: validQuery });
      expect(result.success).toBe(true);
    });
  });

  describe('getStudentAttendanceSchema', () => {
    it('should validate student id parameter', () => {
      const result = getStudentAttendanceSchema.safeParse({
        params: { id: generateId() },
        query: {},
      });
      expect(result.success).toBe(true);
    });

    it('should validate optional date filters', () => {
      const result = getStudentAttendanceSchema.safeParse({
        params: { id: generateId() },
        query: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid student id', () => {
      const result = getStudentAttendanceSchema.safeParse({
        params: { id: 'invalid' },
        query: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getClassAttendanceSchema', () => {
    it('should validate class id parameter', () => {
      const result = getClassAttendanceSchema.safeParse({
        params: { id: generateId() },
        query: {},
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional sessionId filter', () => {
      const result = getClassAttendanceSchema.safeParse({
        params: { id: generateId() },
        query: {
          sessionId: generateId(),
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getAttendanceStatsSchema', () => {
    it('should accept studentId for student stats', () => {
      const result = getAttendanceStatsSchema.safeParse({
        query: { studentId: generateId() },
      });
      expect(result.success).toBe(true);
    });

    it('should accept classId for class stats', () => {
      const result = getAttendanceStatsSchema.safeParse({
        query: { classId: generateId() },
      });
      expect(result.success).toBe(true);
    });

    it('should accept date range filters', () => {
      const result = getAttendanceStatsSchema.safeParse({
        query: {
          studentId: generateId(),
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createAbsenceReasonSchema', () => {
    it('should validate reason creation', () => {
      const validData = {
        name: 'Custom Reason',
        description: 'A custom absence reason',
      };

      const result = createAbsenceReasonSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });

    it('should require name field', () => {
      const invalidData = {
        description: 'Missing name',
      };

      const result = createAbsenceReasonSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const invalidData = {
        name: 'a'.repeat(101),
      };

      const result = createAbsenceReasonSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should accept optional centerId', () => {
      const validData = {
        name: 'Center Reason',
        centerId: generateId(),
      };

      const result = createAbsenceReasonSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });
  });

  describe('updateAbsenceReasonSchema', () => {
    it('should validate reason update', () => {
      const result = updateAbsenceReasonSchema.safeParse({
        params: { id: generateId() },
        body: { name: 'Updated Name' },
      });
      expect(result.success).toBe(true);
    });

    it('should accept isActive toggle', () => {
      const result = updateAbsenceReasonSchema.safeParse({
        params: { id: generateId() },
        body: { isActive: false },
      });
      expect(result.success).toBe(true);
    });

    it('should accept displayOrder', () => {
      const result = updateAbsenceReasonSchema.safeParse({
        params: { id: generateId() },
        body: { displayOrder: 5 },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid reason id', () => {
      const result = updateAbsenceReasonSchema.safeParse({
        params: { id: 'invalid-id' },
        body: { name: 'Updated' },
      });
      expect(result.success).toBe(false);
    });
  });
});