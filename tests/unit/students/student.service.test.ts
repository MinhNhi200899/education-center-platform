import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StudentService } from '../../../src/modules/students/services/student.service';
import { mockPrismaClient, resetPrismaMocks } from '../../mocks/prisma.mock';
import { mockLogger, resetLoggerMocks } from '../../mocks/logger.mock';
import {
  createMockStudent,
  createMockCenter,
  createMockEnrollment,
  generateId,
} from '../../factories/data.factory';
import { StudentStatus, Gender } from '@prisma/client';
import { NotFoundException, ConflictException, BadRequestException } from '../../../src/shared/types/error.types';

// ============================================================
// UNIT TESTS - STUDENT SERVICE
// ============================================================

describe('StudentService', () => {
  let service: StudentService;

  beforeEach(() => {
    resetPrismaMocks();
    resetLoggerMocks();
    service = new StudentService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // create Tests
  // ============================================================

  describe('create', () => {
    it('should create a new student successfully', async () => {
      const centerId = generateId();
      const center = createMockCenter({ id: centerId });

      const studentData = {
        centerId,
        fullName: 'John Doe',
        dateOfBirth: new Date('2010-05-15'),
        gender: 'male' as Gender,
        phone: '0123456789',
        email: 'john@test.com',
        enrollmentDate: new Date('2024-01-01'),
      };

      const createdStudent = createMockStudent({
        ...studentData,
        status: StudentStatus.active,
      });

      mockPrismaClient.center.findUnique.mockResolvedValue(center);
      mockPrismaClient.student.findFirst.mockResolvedValue(null);
      mockPrismaClient.student.create.mockResolvedValue(createdStudent);

      const result = await service.create(studentData);

      expect(result.fullName).toBe('John Doe');
      expect(mockPrismaClient.student.create).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when center does not exist', async () => {
      mockPrismaClient.center.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          centerId: generateId(),
          fullName: 'Test',
          dateOfBirth: new Date(),
          gender: 'male',
          enrollmentDate: new Date(),
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate student', async () => {
      const centerId = generateId();
      const existingStudent = createMockStudent({ centerId, fullName: 'Existing' });

      mockPrismaClient.center.findUnique.mockResolvedValue(createMockCenter({ id: centerId }));
      mockPrismaClient.student.findFirst.mockResolvedValue(existingStudent);

      await expect(
        service.create({
          centerId,
          fullName: 'Existing',
          dateOfBirth: new Date('2010-05-15'),
          gender: 'male',
          enrollmentDate: new Date('2024-01-01'),
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  // ============================================================
  // getById Tests
  // ============================================================

  describe('getById', () => {
    it('should return student with relations', async () => {
      const studentId = generateId();
      const student = createMockStudent({ id: studentId });

      mockPrismaClient.student.findUnique.mockResolvedValue({
        ...student,
        center: { id: student.centerId, name: 'Test Center', code: 'TC001' },
        parents: [],
        enrollments: [],
      });

      const result = await service.getById(studentId);

      expect(result.id).toBe(studentId);
      expect(mockPrismaClient.student.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: studentId } })
      );
    });

    it('should throw NotFoundException when student not found', async () => {
      mockPrismaClient.student.findUnique.mockResolvedValue(null);

      await expect(service.getById(generateId())).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // getAll Tests
  // ============================================================

  describe('getAll', () => {
    it('should return paginated students', async () => {
      const students = [createMockStudent(), createMockStudent()];
      const center = createMockCenter({ id: generateId() });

      mockPrismaClient.student.count.mockResolvedValue(50);
      mockPrismaClient.student.findMany.mockResolvedValue(
        students.map((s) => ({
          ...s,
          center: { id: center.id, name: center.name, code: center.code },
          enrollments: [],
        }))
      );

      const result = await service.getAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(50);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should filter by centerId', async () => {
      const centerId = generateId();

      mockPrismaClient.student.count.mockResolvedValue(0);
      mockPrismaClient.student.findMany.mockResolvedValue([]);

      await service.getAll({ centerId, page: 1, limit: 20 });

      expect(mockPrismaClient.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ centerId }),
        })
      );
    });

    it('should filter by status', async () => {
      mockPrismaClient.student.count.mockResolvedValue(0);
      mockPrismaClient.student.findMany.mockResolvedValue([]);

      await service.getAll({ status: StudentStatus.active, page: 1, limit: 20 });

      expect(mockPrismaClient.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: StudentStatus.active }),
        })
      );
    });

    it('should filter by gender', async () => {
      mockPrismaClient.student.count.mockResolvedValue(0);
      mockPrismaClient.student.findMany.mockResolvedValue([]);

      await service.getAll({ gender: 'female', page: 1, limit: 20 });

      expect(mockPrismaClient.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ gender: 'female' }),
        })
      );
    });

    it('should search by name, email, phone', async () => {
      mockPrismaClient.student.count.mockResolvedValue(0);
      mockPrismaClient.student.findMany.mockResolvedValue([]);

      await service.getAll({ search: 'John', page: 1, limit: 20 });

      expect(mockPrismaClient.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ fullName: expect.any(Object) }),
              expect.objectContaining({ email: expect.any(Object) }),
              expect.objectContaining({ phone: expect.any(Object) }),
            ]),
          }),
        })
      );
    });
  });

  // ============================================================
  // update Tests
  // ============================================================

  describe('update', () => {
    it('should update student successfully', async () => {
      const studentId = generateId();
      const student = createMockStudent({ id: studentId });

      const updatedStudent = { ...student, fullName: 'Updated Name' };

      mockPrismaClient.student.findUnique.mockResolvedValue(student);
      mockPrismaClient.student.update.mockResolvedValue(updatedStudent);

      const result = await service.update(studentId, { fullName: 'Updated Name' });

      expect(result.fullName).toBe('Updated Name');
    });

    it('should throw NotFoundException when student not found', async () => {
      mockPrismaClient.student.findUnique.mockResolvedValue(null);

      await expect(
        service.update(generateId(), { fullName: 'Test' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // archive Tests
  // ============================================================

  describe('archive', () => {
    it('should archive student successfully', async () => {
      const studentId = generateId();
      const student = createMockStudent({ id: studentId, status: StudentStatus.active });

      const archivedStudent = { ...student, status: StudentStatus.archived };

      mockPrismaClient.student.findUnique.mockResolvedValue(student);
      mockPrismaClient.student.update.mockResolvedValue(archivedStudent);

      const result = await service.archive(studentId);

      expect(result.status).toBe(StudentStatus.archived);
    });

    it('should throw NotFoundException when student not found', async () => {
      mockPrismaClient.student.findUnique.mockResolvedValue(null);

      await expect(service.archive(generateId())).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // bulkArchive Tests
  // ============================================================

  describe('bulkArchive', () => {
    it('should archive multiple students', async () => {
      const ids = [generateId(), generateId(), generateId()];

      mockPrismaClient.student.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkArchive(ids);

      expect(result.archived).toBe(3);
      expect(mockPrismaClient.student.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ids } },
        data: { status: StudentStatus.archived },
      });
    });
  });

  // ============================================================
  // addParent Tests
  // ============================================================

  describe('addParent', () => {
    it('should add parent to student', async () => {
      const studentId = generateId();
      const student = createMockStudent({ id: studentId });

      mockPrismaClient.student.findUnique.mockResolvedValue(student);
      mockPrismaClient.parent.create.mockResolvedValue({
        id: generateId(),
        studentId,
        fullName: 'Parent Name',
        relationship: 'father',
        phone: '0123456789',
      });

      await service.addParent(studentId, {
        fullName: 'Parent Name',
        relationship: 'father',
        phone: '0123456789',
      });

      expect(mockPrismaClient.parent.create).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when student not found', async () => {
      mockPrismaClient.student.findUnique.mockResolvedValue(null);

      await expect(
        service.addParent(generateId(), {
          fullName: 'Parent',
          relationship: 'father',
          phone: '0123456789',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // importFromExcel Tests
  // ============================================================

  describe('importFromExcel', () => {
    it('should import students from Excel data', async () => {
      const centerId = generateId();
      const rows = [
        {
          fullName: 'Student 1',
          dateOfBirth: '2010-05-15',
          gender: 'male',
          phone: '0123456789',
          email: 'student1@test.com',
          enrollmentDate: '2024-01-01',
        },
        {
          fullName: 'Student 2',
          dateOfBirth: '2011-06-20',
          gender: 'female',
          phone: '0123456790',
          email: 'student2@test.com',
          enrollmentDate: '2024-01-01',
        },
      ];

      mockPrismaClient.student.findFirst.mockResolvedValue(null);
      mockPrismaClient.student.create.mockResolvedValue(createMockStudent());

      const result = await service.importFromExcel(centerId, rows);

      expect(result.totalRows).toBe(2);
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle duplicate students', async () => {
      const centerId = generateId();
      const existingStudent = createMockStudent({ centerId, fullName: 'Existing' });

      const rows = [
        {
          fullName: 'Existing',
          dateOfBirth: '2010-05-15',
          gender: 'male',
          enrollmentDate: '2024-01-01',
        },
      ];

      mockPrismaClient.student.findFirst.mockResolvedValue(existingStudent);

      const result = await service.importFromExcel(centerId, rows);

      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toBe('Duplicate student');
    });

    it('should handle invalid dates', async () => {
      const rows = [
        {
          fullName: 'Student',
          dateOfBirth: 'invalid-date',
          gender: 'male',
          enrollmentDate: '2024-01-01',
        },
      ];

      const result = await service.importFromExcel(generateId(), rows);

      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toBe('Invalid date format');
    });

    it('should handle missing required fields', async () => {
      const rows = [
        {
          fullName: 'Missing Fields',
          // missing dateOfBirth, gender, enrollmentDate
        },
      ];

      const result = await service.importFromExcel(generateId(), rows);

      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toBe('Missing required fields');
    });
  });

  // ============================================================
  // exportToExcel Tests
  // ============================================================

  describe('exportToExcel', () => {
    it('should export students to Excel format', async () => {
      const student = createMockStudent();
      const center = createMockCenter({ id: student.centerId });

      mockPrismaClient.student.count.mockResolvedValue(1);
      mockPrismaClient.student.findMany.mockResolvedValue([
        {
          ...student,
          center: { id: center.id, name: center.name, code: center.code },
          enrollments: [],
        },
      ]);

      const result = await service.exportToExcel({ page: 1, limit: 100 });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('fullName');
      expect(result[0]).toHaveProperty('dateOfBirth');
      expect(result[0]).toHaveProperty('gender');
      expect(result[0]).toHaveProperty('status');
    });
  });
});