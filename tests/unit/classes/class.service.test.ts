import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClassService } from '../../../src/modules/classes/services/class.service';
import { mockPrismaClient, resetPrismaMocks } from '../../mocks/prisma.mock';
import { mockLogger, resetLoggerMocks } from '../../mocks/logger.mock';
import {
  createMockClass,
  createMockCenter,
  createMockTeacher,
  createMockEnrollment,
  createMockSession,
  createMockStudent,
  generateId,
} from '../../factories/data.factory';
import { ClassStatus, AcademicLevel, EnrollmentStatus, TeacherRole, SessionStatus } from '@prisma/client';
import { NotFoundException, ConflictException, BadRequestException } from '../../../src/shared/types/error.types';

// ============================================================
// UNIT TESTS - CLASS SERVICE
// ============================================================

describe('ClassService', () => {
  let service: ClassService;

  beforeEach(() => {
    resetPrismaMocks();
    resetLoggerMocks();
    service = new ClassService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // create Tests
  // ============================================================

  describe('create', () => {
    it('should create a new class successfully', async () => {
      const centerId = generateId();
      const center = createMockCenter({ id: centerId });

      const classData = {
        centerId,
        name: 'Mathematics 101',
        description: 'Basic math class',
        academicLevel: 'beginner' as const,
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
        startDate: '2024-01-01',
        endDate: '2024-06-30',
      };

      const createdClass = createMockClass({ ...classData, centerId });

      mockPrismaClient.center.findUnique.mockResolvedValue(center);
      mockPrismaClient.class.findFirst.mockResolvedValue(null);
      mockPrismaClient.class.create.mockResolvedValue(createdClass);

      const result = await service.create(classData);

      expect(result.name).toBe('Mathematics 101');
      expect(mockPrismaClient.class.create).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when center does not exist', async () => {
      mockPrismaClient.center.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          centerId: generateId(),
          name: 'Test Class',
          academicLevel: 'beginner',
          capacity: 30,
          schedule: {},
          startDate: '2024-01-01',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate class name', async () => {
      const centerId = generateId();
      const existingClass = createMockClass({ centerId, name: 'Existing Class' });

      mockPrismaClient.center.findUnique.mockResolvedValue(createMockCenter({ id: centerId }));
      mockPrismaClient.class.findFirst.mockResolvedValue(existingClass);

      await expect(
        service.create({
          centerId,
          name: 'Existing Class',
          academicLevel: 'beginner',
          capacity: 30,
          schedule: {},
          startDate: '2024-01-01',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when endDate is before startDate', async () => {
      const centerId = generateId();

      mockPrismaClient.center.findUnique.mockResolvedValue(createMockCenter({ id: centerId }));
      mockPrismaClient.class.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          centerId,
          name: 'Test Class',
          academicLevel: 'beginner',
          capacity: 30,
          schedule: {},
          startDate: '2024-06-01',
          endDate: '2024-01-01',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // getById Tests
  // ============================================================

  describe('getById', () => {
    it('should return class with relations', async () => {
      const classId = generateId();
      const classRecord = createMockClass({ id: classId });

      mockPrismaClient.class.findUnique.mockResolvedValue({
        ...classRecord,
        center: { id: classRecord.centerId, name: 'Test Center', code: 'TC001' },
        classTeachers: [],
        enrollments: [],
      });

      const result = await service.getById(classId);

      expect(result.id).toBe(classId);
    });

    it('should throw NotFoundException when class not found', async () => {
      mockPrismaClient.class.findUnique.mockResolvedValue(null);

      await expect(service.getById(generateId())).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // getAll Tests
  // ============================================================

  describe('getAll', () => {
    it('should return paginated classes', async () => {
      const classes = [createMockClass(), createMockClass()];
      const center = createMockCenter({ id: generateId() });

      mockPrismaClient.class.count.mockResolvedValue(50);
      mockPrismaClient.class.findMany.mockResolvedValue(
        classes.map((c) => ({
          ...c,
          center: { id: center.id, name: center.name, code: center.code },
          classTeachers: [],
          _count: { enrollments: 0 },
        }))
      );

      const result = await service.getAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(50);
    });

    it('should filter by centerId', async () => {
      const centerId = generateId();

      mockPrismaClient.class.count.mockResolvedValue(0);
      mockPrismaClient.class.findMany.mockResolvedValue([]);

      await service.getAll({ centerId, page: 1, limit: 20 });

      expect(mockPrismaClient.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ centerId }),
        })
      );
    });

    it('should filter by status', async () => {
      mockPrismaClient.class.count.mockResolvedValue(0);
      mockPrismaClient.class.findMany.mockResolvedValue([]);

      await service.getAll({ status: 'active', page: 1, limit: 20 });

      expect(mockPrismaClient.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        })
      );
    });

    it('should filter by academicLevel', async () => {
      mockPrismaClient.class.count.mockResolvedValue(0);
      mockPrismaClient.class.findMany.mockResolvedValue([]);

      await service.getAll({ academicLevel: 'beginner', page: 1, limit: 20 });

      expect(mockPrismaClient.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ academicLevel: 'beginner' }),
        })
      );
    });

    it('should search by name, description, classroom', async () => {
      mockPrismaClient.class.count.mockResolvedValue(0);
      mockPrismaClient.class.findMany.mockResolvedValue([]);

      await service.getAll({ search: 'Math', page: 1, limit: 20 });

      expect(mockPrismaClient.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ description: expect.any(Object) }),
              expect.objectContaining({ classroom: expect.any(Object) }),
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
    it('should update class successfully', async () => {
      const classId = generateId();
      const classRecord = createMockClass({ id: classId, capacity: 30 });

      const updatedClass = { ...classRecord, capacity: 35 };

      mockPrismaClient.class.findUnique.mockResolvedValue(classRecord);
      mockPrismaClient.class.findFirst.mockResolvedValue(null);
      mockPrismaClient.class.update.mockResolvedValue(updatedClass);

      const result = await service.update(classId, { capacity: 35 });

      expect(result.capacity).toBe(35);
    });

    it('should throw ConflictException when updating to duplicate name', async () => {
      const classId = generateId();
      const classRecord = createMockClass({ id: classId, name: 'Class A' });
      const existingClass = createMockClass({ name: 'Class A' });

      mockPrismaClient.class.findUnique.mockResolvedValue(classRecord);
      mockPrismaClient.class.findFirst.mockResolvedValue(existingClass);

      await expect(
        service.update(classId, { name: 'Class B' })
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when reducing capacity below enrollment', async () => {
      const classId = generateId();
      const classRecord = createMockClass({ id: classId, capacity: 20 });

      mockPrismaClient.class.findUnique.mockResolvedValue(classRecord);
      mockPrismaClient.enrollment.count.mockResolvedValue(25);

      await expect(
        service.update(classId, { capacity: 15 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when class not found', async () => {
      mockPrismaClient.class.findUnique.mockResolvedValue(null);

      await expect(
        service.update(generateId(), { name: 'New Name' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // archive Tests
  // ============================================================

  describe('archive', () => {
    it('should archive class successfully', async () => {
      const classId = generateId();
      const classRecord = createMockClass({ id: classId, status: ClassStatus.active });

      const archivedClass = { ...classRecord, status: ClassStatus.archived };

      mockPrismaClient.class.findUnique.mockResolvedValue(classRecord);
      mockPrismaClient.class.update.mockResolvedValue(archivedClass);

      const result = await service.archive(classId);

      expect(result.status).toBe(ClassStatus.archived);
    });

    it('should throw NotFoundException when class not found', async () => {
      mockPrismaClient.class.findUnique.mockResolvedValue(null);

      await expect(service.archive(generateId())).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // assignTeacher Tests
  // ============================================================

  describe('assignTeacher', () => {
    it('should assign teacher to class', async () => {
      const classId = generateId();
      const teacherId = generateId();
      const classRecord = createMockClass({ id: classId });
      const teacher = createMockTeacher({ id: teacherId, centerId: classRecord.centerId });

      const classTeacher = {
        id: generateId(),
        classId,
        teacherId,
        role: 'primary' as TeacherRole,
        assignedAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaClient.class.findUnique.mockResolvedValue(classRecord);
      mockPrismaClient.teacher.findUnique.mockResolvedValue(teacher);
      mockPrismaClient.classTeacher.findFirst.mockResolvedValue(null);
      mockPrismaClient.classTeacher.create.mockResolvedValue(classTeacher);
      mockPrismaClient.classTeacher.findMany.mockResolvedValue([
        { ...classTeacher, teacher: { id: teacherId, fullName: teacher.fullName } },
      ]);

      const result = await service.assignTeacher(classId, teacherId, 'primary');

      expect(result.teachers).toBeDefined();
    });

    it('should throw NotFoundException when class not found', async () => {
      mockPrismaClient.class.findUnique.mockResolvedValue(null);

      await expect(
        service.assignTeacher(generateId(), generateId(), 'primary')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when teacher not found', async () => {
      const classRecord = createMockClass({ id: generateId() });

      mockPrismaClient.class.findUnique.mockResolvedValue(classRecord);
      mockPrismaClient.teacher.findUnique.mockResolvedValue(null);

      await expect(
        service.assignTeacher(classRecord.id, generateId(), 'primary')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when teacher is from different center', async () => {
      const classRecord = createMockClass({ id: generateId(), centerId: generateId() });
      const teacher = createMockTeacher({ id: generateId(), centerId: generateId() }); // Different center

      mockPrismaClient.class.findUnique.mockResolvedValue(classRecord);
      mockPrismaClient.teacher.findUnique.mockResolvedValue(teacher);

      await expect(
        service.assignTeacher(classRecord.id, teacher.id, 'primary')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when teacher already assigned', async () => {
      const classId = generateId();
      const teacherId = generateId();
      const classRecord = createMockClass({ id: classId });
      const teacher = createMockTeacher({ id: teacherId, centerId: classRecord.centerId });
      const existingAssignment = { id: generateId(), classId, teacherId, role: 'primary' };

      mockPrismaClient.class.findUnique.mockResolvedValue(classRecord);
      mockPrismaClient.teacher.findUnique.mockResolvedValue(teacher);
      mockPrismaClient.classTeacher.findFirst.mockResolvedValue(existingAssignment);

      await expect(
        service.assignTeacher(classId, teacherId, 'primary')
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when multiple primary teachers assigned', async () => {
      const classId = generateId();
      const teacherId = generateId();
      const classRecord = createMockClass({ id: classId });
      const teacher = createMockTeacher({ id: teacherId, centerId: classRecord.centerId });
      const existingPrimary = { id: generateId(), classId, teacherId: generateId(), role: 'primary' };

      mockPrismaClient.class.findUnique.mockResolvedValue(classRecord);
      mockPrismaClient.teacher.findUnique.mockResolvedValue(teacher);
      mockPrismaClient.classTeacher.findFirst
        .mockResolvedValueOnce(null) // No existing assignment for this teacher
        .mockResolvedValueOnce(existingPrimary); // Existing primary teacher

      await expect(
        service.assignTeacher(classId, teacherId, 'primary')
      ).rejects.toThrow(ConflictException);
    });
  });

  // ============================================================
  // enrollStudents Tests
  // ============================================================

  describe('enrollStudents', () => {
    it('should enroll students in class', async () => {
      const classId = generateId();
      const studentIds = [generateId(), generateId()];
      const classRecord = createMockClass({ id: classId, capacity: 30, currentEnrollment: 0 });
      const students = studentIds.map((id) => createMockStudent({ id, centerId: classRecord.centerId }));

      mockPrismaClient.class.findUnique.mockResolvedValue({
        ...classRecord,
        _count: { enrollments: 0 },
      });
      mockPrismaClient.student.findMany.mockResolvedValue(students);
      mockPrismaClient.enrollment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(
          studentIds.map((studentId) => ({ id: generateId(), studentId, status: 'active' }))
        );
      mockPrismaClient.enrollment.createMany.mockResolvedValue({ count: 2 });

      const result = await service.enrollStudents(classId, {
        studentIds,
        startDate: '2024-01-01',
      });

      expect(result.enrollments).toHaveLength(2);
    });

    it('should throw BadRequestException when capacity exceeded', async () => {
      const classId = generateId();
      const studentIds = [generateId(), generateId()];
      const classRecord = createMockClass({ id: classId, capacity: 1, currentEnrollment: 0 });

      mockPrismaClient.class.findUnique.mockResolvedValue({
        ...classRecord,
        _count: { enrollments: 0 },
      });

      await expect(
        service.enrollStudents(classId, { studentIds })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when students from different center', async () => {
      const classId = generateId();
      const classRecord = createMockClass({ id: classId, capacity: 30, centerId: generateId() });
      const students = [
        createMockStudent({ centerId: classRecord.centerId }),
        createMockStudent({ centerId: generateId() }), // Different center
      ];

      mockPrismaClient.class.findUnique.mockResolvedValue({
        ...classRecord,
        _count: { enrollments: 0 },
      });
      mockPrismaClient.student.findMany.mockResolvedValue(students);

      await expect(
        service.enrollStudents(classId, { studentIds: students.map((s) => s.id) })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when students already enrolled', async () => {
      const classId = generateId();
      const studentIds = [generateId()];
      const classRecord = createMockClass({ id: classId, capacity: 30, currentEnrollment: 0 });
      const students = studentIds.map((id) => createMockStudent({ id, centerId: classRecord.centerId }));
      const existingEnrollment = { id: generateId(), studentId: studentIds[0], classId };

      mockPrismaClient.class.findUnique.mockResolvedValue({
        ...classRecord,
        _count: { enrollments: 0 },
      });
      mockPrismaClient.student.findMany.mockResolvedValue(students);
      mockPrismaClient.enrollment.findMany.mockResolvedValue([existingEnrollment]);

      await expect(
        service.enrollStudents(classId, { studentIds })
      ).rejects.toThrow(ConflictException);
    });
  });

  // ============================================================
  // withdrawStudent Tests
  // ============================================================

  describe('withdrawStudent', () => {
    it('should withdraw student from class', async () => {
      const classId = generateId();
      const studentId = generateId();
      const enrollment = createMockEnrollment({ classId, studentId, status: 'active' });

      mockPrismaClient.enrollment.findFirst.mockResolvedValue(enrollment);
      mockPrismaClient.enrollment.update.mockResolvedValue({ ...enrollment, status: 'withdrawn' });
      mockPrismaClient.class.update.mockResolvedValue(createMockClass({ id: classId }));

      await service.withdrawStudent(classId, studentId);

      expect(mockPrismaClient.enrollment.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when enrollment not found', async () => {
      mockPrismaClient.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.withdrawStudent(generateId(), generateId())
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // validateSchedule Tests
  // ============================================================

  describe('validateSchedule', () => {
    it('should return valid for correct schedule', async () => {
      const schedule = {
        monday: [{ startTime: '08:00', endTime: '09:30' }],
        tuesday: [],
        wednesday: [{ startTime: '10:00', endTime: '11:30' }],
        thursday: [],
        friday: [{ startTime: '08:00', endTime: '09:30' }],
        saturday: [],
        sunday: [],
      };

      const result = await service.validateSchedule(generateId(), schedule);

      expect(result.valid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should return invalid for empty schedule', async () => {
      const schedule = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };

      const result = await service.validateSchedule(generateId(), schedule);

      expect(result.valid).toBe(false);
      expect(result.conflicts).toContain('Schedule cannot be empty');
    });

    it('should detect invalid time slots', async () => {
      const schedule = {
        monday: [{ startTime: '10:00', endTime: '09:00' }], // end before start
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };

      const result = await service.validateSchedule(generateId(), schedule);

      expect(result.valid).toBe(false);
      expect(result.conflicts).toContain('monday: Start time must be before end time');
    });

    it('should detect overlapping time slots', async () => {
      const schedule = {
        monday: [
          { startTime: '08:00', endTime: '09:30' },
          { startTime: '09:00', endTime: '10:30' }, // Overlaps with first
        ],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };

      const result = await service.validateSchedule(generateId(), schedule);

      expect(result.valid).toBe(false);
      expect(result.conflicts).toContain('monday: Overlapping time slots detected');
    });
  });

  // ============================================================
  // getClassSessions Tests
  // ============================================================

  describe('getClassSessions', () => {
    it('should return class sessions', async () => {
      const classId = generateId();
      const classRecord = createMockClass({ id: classId });
      const sessions = [
        createMockSession({ classId }),
        createMockSession({ classId }),
      ];

      mockPrismaClient.class.findUnique.mockResolvedValue(classRecord);
      mockPrismaClient.session.findMany.mockResolvedValue(
        sessions.map((s) => ({
          ...s,
          teacher: { id: generateId(), fullName: 'Teacher' },
          _count: { attendanceRecords: 0 },
        }))
      );

      const result = await service.getClassSessions(classId, {});

      expect(result).toHaveLength(2);
    });

    it('should filter sessions by date range', async () => {
      const classId = generateId();
      const classRecord = createMockClass({ id: classId });

      mockPrismaClient.class.findUnique.mockResolvedValue(classRecord);
      mockPrismaClient.session.findMany.mockResolvedValue([]);

      await service.getClassSessions(classId, {
        startDate: '2024-01-01',
        endDate: '2024-06-30',
      });

      expect(mockPrismaClient.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            classId,
            sessionDate: expect.any(Object),
          }),
        })
      );
    });

    it('should throw NotFoundException when class not found', async () => {
      mockPrismaClient.class.findUnique.mockResolvedValue(null);

      await expect(
        service.getClassSessions(generateId(), {})
      ).rejects.toThrow(NotFoundException);
    });
  });
});