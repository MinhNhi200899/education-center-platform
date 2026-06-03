import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createClassSchema,
  updateClassSchema,
  queryClassSchema,
  assignTeacherSchema,
  bulkAssignTeachersSchema,
  enrollStudentsSchema,
} from '../../../src/modules/classes/validators/class.validators';
import { generateId } from '../../factories/data.factory';

// ============================================================
// UNIT TESTS - CLASS VALIDATORS
// ============================================================

describe('Class Validators', () => {
  describe('createClassSchema', () => {
    it('should validate correct class data', () => {
      const validData = {
        centerId: generateId(),
        name: 'Mathematics 101',
        description: 'Basic mathematics',
        academicLevel: 'beginner',
        capacity: 30,
        classroom: 'Room 101',
        schedule: {
          monday: [{ startTime: '08:00', endTime: '09:30' }],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [{ startTime: '08:00', endTime: '09:30' }],
          saturday: [],
          sunday: [],
        },
        startDate: new Date().toISOString(),
        notes: 'Some notes',
      };

      const result = createClassSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });

    it('should reject invalid centerId format', () => {
      const invalidData = {
        centerId: 'not-a-uuid',
        name: 'Test Class',
        academicLevel: 'beginner',
        capacity: 30,
        schedule: {},
        startDate: new Date().toISOString(),
      };

      const result = createClassSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 2 characters', () => {
      const invalidData = {
        centerId: generateId(),
        name: 'A',
        academicLevel: 'beginner',
        capacity: 30,
        schedule: {},
        startDate: new Date().toISOString(),
      };

      const result = createClassSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject capacity less than 1', () => {
      const invalidData = {
        centerId: generateId(),
        name: 'Test Class',
        academicLevel: 'beginner',
        capacity: 0,
        schedule: {},
        startDate: new Date().toISOString(),
      };

      const result = createClassSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject capacity greater than 100', () => {
      const invalidData = {
        centerId: generateId(),
        name: 'Test Class',
        academicLevel: 'beginner',
        capacity: 150,
        schedule: {},
        startDate: new Date().toISOString(),
      };

      const result = createClassSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject invalid academic level', () => {
      const invalidData = {
        centerId: generateId(),
        name: 'Test Class',
        academicLevel: 'expert', // Invalid
        capacity: 30,
        schedule: {},
        startDate: new Date().toISOString(),
      };

      const result = createClassSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject invalid time format in schedule', () => {
      const invalidData = {
        centerId: generateId(),
        name: 'Test Class',
        academicLevel: 'beginner',
        capacity: 30,
        schedule: {
          monday: [{ startTime: '25:00', endTime: '09:30' }], // Invalid time
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        },
        startDate: new Date().toISOString(),
      };

      const result = createClassSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject start date in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const invalidData = {
        centerId: generateId(),
        name: 'Test Class',
        academicLevel: 'beginner',
        capacity: 30,
        schedule: {},
        startDate: pastDate.toISOString(),
      };

      const result = createClassSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should accept optional endDate', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);

      const validData = {
        centerId: generateId(),
        name: 'Test Class',
        academicLevel: 'beginner',
        capacity: 30,
        schedule: {},
        startDate: new Date().toISOString(),
        endDate: futureDate.toISOString(),
      };

      const result = createClassSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });
  });

  describe('updateClassSchema', () => {
    it('should validate correct update data', () => {
      const validData = {
        params: { id: generateId() },
        body: {
          name: 'Updated Class Name',
          capacity: 35,
          classroom: 'Room 202',
        },
      };

      const result = updateClassSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const validData = {
        params: { id: generateId() },
        body: {
          name: 'Updated Name',
        },
      };

      const result = updateClassSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid class ID', () => {
      const invalidData = {
        params: { id: 'invalid-id' },
        body: { name: 'Updated' },
      };

      const result = updateClassSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject capacity less than 1', () => {
      const invalidData = {
        params: { id: generateId() },
        body: { capacity: 0 },
      };

      const result = updateClassSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid status transition', () => {
      const validData = {
        params: { id: generateId() },
        body: { status: 'completed' },
      };

      const result = updateClassSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidData = {
        params: { id: generateId() },
        body: { status: 'invalid_status' },
      };

      const result = updateClassSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('queryClassSchema', () => {
    it('should validate correct query parameters', () => {
      const validQuery = {
        centerId: generateId(),
        status: 'active',
        academicLevel: 'beginner',
        search: 'Math',
        page: '1',
        limit: '20',
        sort: 'name',
        order: 'asc',
      };

      const result = queryClassSchema.safeParse({ query: validQuery });
      expect(result.success).toBe(true);
    });

    it('should allow empty query', () => {
      const result = queryClassSchema.safeParse({ query: {} });
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const result = queryClassSchema.safeParse({ query: {} });
      if (result.success) {
        expect(result.data.query.page).toBe(1);
        expect(result.data.query.limit).toBe(20);
        expect(result.data.query.sort).toBe('createdAt');
        expect(result.data.query.order).toBe('desc');
      }
    });

    it('should reject invalid sort field', () => {
      const invalidQuery = { sort: 'invalid_field' };

      const result = queryClassSchema.safeParse({ query: invalidQuery });
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const invalidQuery = { limit: '150' };

      const result = queryClassSchema.safeParse({ query: invalidQuery });
      expect(result.success).toBe(false);
    });
  });

  describe('assignTeacherSchema', () => {
    it('should validate correct teacher assignment', () => {
      const validData = {
        params: { id: generateId() },
        body: {
          teacherId: generateId(),
          role: 'primary',
        },
      };

      const result = assignTeacherSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept substitute role', () => {
      const validData = {
        params: { id: generateId() },
        body: {
          teacherId: generateId(),
          role: 'substitute',
        },
      };

      const result = assignTeacherSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const invalidData = {
        params: { id: generateId() },
        body: {
          teacherId: generateId(),
          role: 'assistant', // Invalid
        },
      };

      const result = assignTeacherSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('bulkAssignTeachersSchema', () => {
    it('should validate correct bulk assignment', () => {
      const validData = {
        params: { id: generateId() },
        body: {
          teachers: [
            { teacherId: generateId(), role: 'primary' },
            { teacherId: generateId(), role: 'substitute' },
          ],
        },
      };

      const result = bulkAssignTeachersSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty teachers array', () => {
      const invalidData = {
        params: { id: generateId() },
        body: { teachers: [] },
      };

      const result = bulkAssignTeachersSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid teacher ID', () => {
      const invalidData = {
        params: { id: generateId() },
        body: {
          teachers: [
            { teacherId: 'invalid-uuid', role: 'primary' },
          ],
        },
      };

      const result = bulkAssignTeachersSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('enrollStudentsSchema', () => {
    it('should validate correct enrollment data', () => {
      const validData = {
        params: { id: generateId() },
        body: {
          studentIds: [generateId(), generateId(), generateId()],
          startDate: '2024-01-01',
          notes: 'Some enrollment notes',
        },
      };

      const result = enrollStudentsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty studentIds array', () => {
      const invalidData = {
        params: { id: generateId() },
        body: { studentIds: [] },
      };

      const result = enrollStudentsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid student ID', () => {
      const invalidData = {
        params: { id: generateId() },
        body: {
          studentIds: ['not-a-uuid', generateId()],
        },
      };

      const result = enrollStudentsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional startDate', () => {
      const validData = {
        params: { id: generateId() },
        body: {
          studentIds: [generateId()],
        },
      };

      const result = enrollStudentsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format for startDate', () => {
      const invalidData = {
        params: { id: generateId() },
        body: {
          studentIds: [generateId()],
          startDate: 'not-a-date',
        },
      };

      const result = enrollStudentsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});