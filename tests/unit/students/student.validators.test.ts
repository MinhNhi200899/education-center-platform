import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createStudentSchema,
  updateStudentSchema,
  queryStudentSchema,
  bulkDeleteSchema,
  parentSchema,
  importSchema,
} from '../../../src/modules/students/validators/student.validators';
import { generateId } from '../../factories/data.factory';
import { Gender } from '@prisma/client';

// ============================================================
// UNIT TESTS - STUDENT VALIDATORS
// ============================================================

describe('Student Validators', () => {
  describe('createStudentSchema', () => {
    it('should validate correct student data', () => {
      const validData = {
        centerId: generateId(),
        fullName: 'John Doe',
        dateOfBirth: '2010-05-15',
        gender: 'male',
        phone: '0123456789',
        email: 'john@example.com',
        enrollmentDate: '2024-01-01',
      };

      const result = createStudentSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });

    it('should reject invalid centerId format', () => {
      const invalidData = {
        centerId: 'not-a-uuid',
        fullName: 'John Doe',
        dateOfBirth: '2010-05-15',
        gender: 'male',
        enrollmentDate: '2024-01-01',
      };

      const result = createStudentSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 2 characters', () => {
      const invalidData = {
        centerId: generateId(),
        fullName: 'J',
        dateOfBirth: '2010-05-15',
        gender: 'male',
        enrollmentDate: '2024-01-01',
      };

      const result = createStudentSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const invalidData = {
        centerId: generateId(),
        fullName: 'J'.repeat(101),
        dateOfBirth: '2010-05-15',
        gender: 'male',
        enrollmentDate: '2024-01-01',
      };

      const result = createStudentSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject invalid gender', () => {
      const invalidData = {
        centerId: generateId(),
        fullName: 'John Doe',
        dateOfBirth: '2010-05-15',
        gender: 'invalid',
        enrollmentDate: '2024-01-01',
      };

      const result = createStudentSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject future date of birth', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const invalidData = {
        centerId: generateId(),
        fullName: 'John Doe',
        dateOfBirth: futureDate.toISOString().split('T')[0],
        gender: 'male',
        enrollmentDate: '2024-01-01',
      };

      const result = createStudentSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject invalid phone format', () => {
      const invalidData = {
        centerId: generateId(),
        fullName: 'John Doe',
        dateOfBirth: '2010-05-15',
        gender: 'male',
        phone: '12345', // Too short
        enrollmentDate: '2024-01-01',
      };

      const result = createStudentSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        centerId: generateId(),
        fullName: 'John Doe',
        dateOfBirth: '2010-05-15',
        gender: 'male',
        email: 'not-an-email',
        enrollmentDate: '2024-01-01',
      };

      const result = createStudentSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should accept optional fields when not provided', () => {
      const validData = {
        centerId: generateId(),
        fullName: 'John Doe',
        dateOfBirth: '2010-05-15',
        gender: 'male',
        enrollmentDate: '2024-01-01',
      };

      const result = createStudentSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });

    it('should reject enrollment date in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const invalidData = {
        centerId: generateId(),
        fullName: 'John Doe',
        dateOfBirth: '2010-05-15',
        gender: 'male',
        enrollmentDate: futureDate.toISOString().split('T')[0],
      };

      const result = createStudentSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });
  });

  describe('updateStudentSchema', () => {
    it('should validate correct update data', () => {
      const validData = {
        params: { id: generateId() },
        body: {
          fullName: 'Updated Name',
          phone: '0123456789',
        },
      };

      const result = updateStudentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates (empty body)', () => {
      const validData = {
        params: { id: generateId() },
        body: {},
      };

      const result = updateStudentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid student ID', () => {
      const invalidData = {
        params: { id: 'invalid-id' },
        body: { fullName: 'Updated' },
      };

      const result = updateStudentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL for avatar', () => {
      const invalidData = {
        params: { id: generateId() },
        body: { avatarUrl: 'not-a-url' },
      };

      const result = updateStudentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid URL for avatar', () => {
      const validData = {
        params: { id: generateId() },
        body: { avatarUrl: 'https://example.com/avatar.jpg' },
      };

      const result = updateStudentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('queryStudentSchema', () => {
    it('should validate correct query parameters', () => {
      const validQuery = {
        centerId: generateId(),
        status: 'active',
        gender: 'male',
        search: 'John',
        page: '1',
        limit: '20',
      };

      const result = queryStudentSchema.safeParse({ query: validQuery });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.page).toBe(1);
        expect(result.data.query.limit).toBe(20);
      }
    });

    it('should allow empty query', () => {
      const result = queryStudentSchema.safeParse({ query: {} });
      expect(result.success).toBe(true);
    });

    it('should use default values for page and limit', () => {
      const result = queryStudentSchema.safeParse({ query: {} });
      if (result.success) {
        expect(result.data.query.page).toBe(1);
        expect(result.data.query.limit).toBe(20);
      }
    });

    it('should reject invalid status', () => {
      const invalidQuery = { status: 'invalid' };

      const result = queryStudentSchema.safeParse({ query: invalidQuery });
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const invalidQuery = { limit: '150' };

      const result = queryStudentSchema.safeParse({ query: invalidQuery });
      expect(result.success).toBe(false);
    });

    it('should accept valid sort options', () => {
      const validQuery = { sort: 'fullName', order: 'asc' };

      const result = queryStudentSchema.safeParse({ query: validQuery });
      expect(result.success).toBe(true);
    });
  });

  describe('bulkDeleteSchema', () => {
    it('should validate correct IDs', () => {
      const validData = {
        body: {
          ids: [generateId(), generateId(), generateId()],
        },
      };

      const result = bulkDeleteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty IDs array', () => {
      const invalidData = {
        body: { ids: [] },
      };

      const result = bulkDeleteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID in IDs', () => {
      const invalidData = {
        body: { ids: ['not-a-uuid', generateId()] },
      };

      const result = bulkDeleteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('parentSchema', () => {
    it('should validate correct parent data', () => {
      const validData = {
        body: {
          fullName: 'Parent Name',
          relationship: 'father',
          phone: '0123456789',
          email: 'parent@example.com',
        },
      };

      const result = parentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid relationship', () => {
      const invalidData = {
        body: {
          fullName: 'Parent Name',
          relationship: 'uncle', // Invalid
          phone: '0123456789',
        },
      };

      const result = parentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid phone', () => {
      const invalidData = {
        body: {
          fullName: 'Parent Name',
          relationship: 'father',
          phone: '123', // Too short
        },
      };

      const result = parentSchema.safeParse(validData);
      expect(result.success).toBe(false);
    });

    it('should default isPrimary to true', () => {
      const validData = {
        body: {
          fullName: 'Parent Name',
          relationship: 'mother',
          phone: '0123456789',
        },
      };

      const result = parentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('importSchema', () => {
    it('should validate correct import data', () => {
      const validData = {
        body: {
          centerId: generateId(),
          rows: [
            { fullName: 'Student 1', dateOfBirth: '2010-05-15', gender: 'male' },
            { fullName: 'Student 2', dateOfBirth: '2011-06-20', gender: 'female' },
          ],
        },
      };

      const result = importSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing centerId', () => {
      const invalidData = {
        body: {
          rows: [{ fullName: 'Student 1' }],
        },
      };

      const result = importSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty rows array', () => {
      const invalidData = {
        body: {
          centerId: generateId(),
          rows: [],
        },
      };

      const result = importSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});