import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AttendanceService } from '../../../src/modules/attendance/services/attendance.service';
import { mockPrismaClient, resetPrismaMocks } from '../../mocks/prisma.mock';
import { mockLogger, resetLoggerMocks } from '../../mocks/logger.mock';
import {
  createMockSession,
  createMockStudent,
  createMockEnrollment,
  createMockAttendanceRecord,
  createMockAbsenceReason,
  createMockClass,
  generateId,
} from '../../factories/data.factory';
import { AttendanceStatus, SessionStatus, EnrollmentStatus } from '@prisma/client';
import { NotFoundException, BadRequestException } from '../../../src/shared/types/error.types';

// ============================================================
// UNIT TESTS - ATTENDANCE SERVICE
// ============================================================

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(() => {
    // Reset all mocks before each test
    resetPrismaMocks();
    resetLoggerMocks();

    // Create new service instance
    service = new AttendanceService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // markAttendance Tests
  // ============================================================

  describe('markAttendance', () => {
    it('should create a new attendance record when none exists', async () => {
      const studentId = generateId();
      const sessionId = generateId();
      const recordedBy = generateId();
      const classId = generateId();

      const mockSession = createMockSession({
        id: sessionId,
        classId,
        status: SessionStatus.scheduled,
      });

      const mockEnrollment = createMockEnrollment({
        studentId,
        classId,
        status: EnrollmentStatus.active,
      });

      const mockStudent = createMockStudent({ id: studentId });

      const createdRecord = createMockAttendanceRecord({
        id: generateId(),
        studentId,
        sessionId,
        status: AttendanceStatus.present,
        student: mockStudent,
        session: mockSession,
      });

      // Setup mocks
      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaClient.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrismaClient.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrismaClient.attendanceRecord.create.mockResolvedValue(createdRecord);

      const result = await service.markAttendance(
        { studentId, sessionId, status: AttendanceStatus.present },
        recordedBy
      );

      expect(result).toBeDefined();
      expect(result.studentId).toBe(studentId);
      expect(result.sessionId).toBe(sessionId);
      expect(mockPrismaClient.attendanceRecord.create).toHaveBeenCalledTimes(1);
    });

    it('should update existing attendance record when one exists', async () => {
      const studentId = generateId();
      const sessionId = generateId();
      const recordedBy = generateId();
      const classId = generateId();
      const existingRecordId = generateId();

      const mockSession = createMockSession({
        id: sessionId,
        classId,
        status: SessionStatus.scheduled,
      });

      const mockEnrollment = createMockEnrollment({
        studentId,
        classId,
        status: EnrollmentStatus.active,
      });

      const existingRecord = createMockAttendanceRecord({
        id: existingRecordId,
        studentId,
        sessionId,
        status: AttendanceStatus.present,
      });

      const updatedRecord = {
        ...existingRecord,
        status: AttendanceStatus.late,
      };

      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaClient.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrismaClient.attendanceRecord.findUnique.mockResolvedValue(existingRecord);
      mockPrismaClient.attendanceRecord.update.mockResolvedValue(updatedRecord);

      const result = await service.markAttendance(
        { studentId, sessionId, status: AttendanceStatus.late },
        recordedBy
      );

      expect(result.status).toBe(AttendanceStatus.late);
      expect(mockPrismaClient.attendanceRecord.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.attendanceRecord.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(null);

      await expect(
        service.markAttendance(
          { studentId: generateId(), sessionId: generateId(), status: AttendanceStatus.present },
          generateId()
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when student is not enrolled', async () => {
      const studentId = generateId();
      const sessionId = generateId();
      const classId = generateId();

      const mockSession = createMockSession({ id: sessionId, classId });

      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaClient.enrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.markAttendance({ studentId, sessionId, status: AttendanceStatus.present }, generateId())
      ).rejects.toThrow(BadRequestException);
    });

    it('should set reason when status is excused', async () => {
      const studentId = generateId();
      const sessionId = generateId();
      const recordedBy = generateId();
      const classId = generateId();
      const reason = 'Doctor appointment';

      const mockSession = createMockSession({
        id: sessionId,
        classId,
        status: SessionStatus.scheduled,
      });

      const mockEnrollment = createMockEnrollment({
        studentId,
        classId,
        status: EnrollmentStatus.active,
      });

      const createdRecord = createMockAttendanceRecord({
        studentId,
        sessionId,
        status: AttendanceStatus.excused,
        reason,
      });

      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaClient.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrismaClient.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrismaClient.attendanceRecord.create.mockResolvedValue(createdRecord);

      const result = await service.markAttendance(
        { studentId, sessionId, status: AttendanceStatus.excused, reason },
        recordedBy
      );

      expect(result.reason).toBe(reason);
      expect(mockPrismaClient.attendanceRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason,
          }),
        })
      );
    });
  });

  // ============================================================
  // bulkMarkAttendance Tests
  // ============================================================

  describe('bulkMarkAttendance', () => {
    it('should process multiple attendance records', async () => {
      const sessionId = generateId();
      const classId = generateId();
      const recordedBy = generateId();

      const mockSession = createMockSession({
        id: sessionId,
        classId,
        status: SessionStatus.scheduled,
      });

      const records = [
        { studentId: generateId(), status: AttendanceStatus.present },
        { studentId: generateId(), status: AttendanceStatus.present },
        { studentId: generateId(), status: AttendanceStatus.late },
      ];

      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaClient.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrismaClient.attendanceRecord.create.mockResolvedValue(createMockAttendanceRecord());
      mockPrismaClient.session.update.mockResolvedValue(mockSession);
      mockPrismaClient.parent.findMany.mockResolvedValue([]);

      const result = await service.bulkMarkAttendance({ sessionId, records }, recordedBy);

      expect(result.marked).toBe(3);
      expect(result.absentStudents).toContain(records[2].studentId);
    });

    it('should update existing records when found', async () => {
      const sessionId = generateId();
      const classId = generateId();
      const recordedBy = generateId();
      const existingRecordId = generateId();

      const mockSession = createMockSession({
        id: sessionId,
        classId,
        status: SessionStatus.scheduled,
      });

      const existingRecord = createMockAttendanceRecord({
        id: existingRecordId,
        status: AttendanceStatus.present,
      });

      const records = [{ studentId: generateId(), status: AttendanceStatus.late }];

      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaClient.attendanceRecord.findUnique.mockResolvedValue(existingRecord);
      mockPrismaClient.attendanceRecord.update.mockResolvedValue({
        ...existingRecord,
        status: AttendanceStatus.late,
      });
      mockPrismaClient.session.update.mockResolvedValue(mockSession);
      mockPrismaClient.parent.findMany.mockResolvedValue([]);

      const result = await service.bulkMarkAttendance({ sessionId, records }, recordedBy);

      expect(result.updated).toBe(1);
      expect(result.marked).toBe(0);
    });

    it('should update session status to completed', async () => {
      const sessionId = generateId();
      const classId = generateId();
      const recordedBy = generateId();

      const mockSession = createMockSession({
        id: sessionId,
        classId,
        status: SessionStatus.scheduled,
      });

      const updatedSession = { ...mockSession, status: SessionStatus.completed };

      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaClient.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrismaClient.attendanceRecord.create.mockResolvedValue(createMockAttendanceRecord());
      mockPrismaClient.session.update.mockResolvedValue(updatedSession);

      const result = await service.bulkMarkAttendance(
        { sessionId, records: [{ studentId: generateId(), status: AttendanceStatus.present }] },
        recordedBy
      );

      expect(mockPrismaClient.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { status: SessionStatus.completed },
      });
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(null);

      await expect(
        service.bulkMarkAttendance(
          { sessionId: generateId(), records: [{ studentId: generateId(), status: AttendanceStatus.present }] },
          generateId()
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // getStudentStats Tests
  // ============================================================

  describe('getStudentStats', () => {
    it('should calculate correct statistics for a student', async () => {
      const studentId = generateId();

      mockPrismaClient.student.findUnique.mockResolvedValue(createMockStudent({ id: studentId }));
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue([
        { status: AttendanceStatus.present },
        { status: AttendanceStatus.present },
        { status: AttendanceStatus.present },
        { status: AttendanceStatus.absent },
        { status: AttendanceStatus.late },
        { status: AttendanceStatus.excused },
        { status: AttendanceStatus.present },
        { status: AttendanceStatus.present },
        { status: AttendanceStatus.present },
        { status: AttendanceStatus.present },
      ]);

      const stats = await service.getStudentStats(studentId);

      expect(stats.studentId).toBe(studentId);
      expect(stats.totalSessions).toBe(10);
      expect(stats.presentCount).toBe(7);
      expect(stats.absentCount).toBe(1);
      expect(stats.lateCount).toBe(1);
      expect(stats.excusedCount).toBe(1);
      expect(stats.presentRate).toBe(70);
      expect(stats.absenceRate).toBe(10);
    });

    it('should return zeros when no attendance records exist', async () => {
      const studentId = generateId();

      mockPrismaClient.student.findUnique.mockResolvedValue(createMockStudent({ id: studentId }));
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue([]);

      const stats = await service.getStudentStats(studentId);

      expect(stats.totalSessions).toBe(0);
      expect(stats.presentCount).toBe(0);
      expect(stats.presentRate).toBe(0);
    });

    it('should throw NotFoundException when student does not exist', async () => {
      mockPrismaClient.student.findUnique.mockResolvedValue(null);

      await expect(service.getStudentStats(generateId())).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // getClassStats Tests
  // ============================================================

  describe('getClassStats', () => {
    it('should calculate correct statistics for a class', async () => {
      const classId = generateId();

      mockPrismaClient.class.findUnique.mockResolvedValue(createMockClass({ id: classId }));
      mockPrismaClient.enrollment.count.mockResolvedValue(25);
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue([
        { status: AttendanceStatus.present },
        { status: AttendanceStatus.present },
        { status: AttendanceStatus.absent },
        { status: AttendanceStatus.late },
        { status: AttendanceStatus.present },
      ]);

      const stats = await service.getClassStats(classId);

      expect(stats.classId).toBe(classId);
      expect(stats.totalStudents).toBe(25);
      expect(stats.presentCount).toBe(3);
      expect(stats.absentCount).toBe(1);
      expect(stats.lateCount).toBe(1);
    });

    it('should throw NotFoundException when class does not exist', async () => {
      mockPrismaClient.class.findUnique.mockResolvedValue(null);

      await expect(service.getClassStats(generateId())).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // approveAbsence Tests
  // ============================================================

  describe('approveAbsence', () => {
    it('should approve an absent record as excused', async () => {
      const recordId = generateId();
      const approverId = generateId();

      const existingRecord = createMockAttendanceRecord({
        id: recordId,
        status: AttendanceStatus.absent,
        reason: 'Sick',
      });

      const approvedRecord = {
        ...existingRecord,
        status: AttendanceStatus.excused,
        approvedBy: approverId,
        approvedAt: new Date(),
      };

      mockPrismaClient.attendanceRecord.findUnique.mockResolvedValue(existingRecord);
      mockPrismaClient.attendanceRecord.update.mockResolvedValue(approvedRecord);

      const result = await service.approveAbsence(recordId, { approvedBy: approverId });

      expect(result.status).toBe(AttendanceStatus.excused);
      expect(result.approvedBy).toBe(approverId);
    });

    it('should throw NotFoundException when record does not exist', async () => {
      mockPrismaClient.attendanceRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.approveAbsence(generateId(), { approvedBy: generateId() })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when record is not absent', async () => {
      const existingRecord = createMockAttendanceRecord({
        status: AttendanceStatus.present,
      });

      mockPrismaClient.attendanceRecord.findUnique.mockResolvedValue(existingRecord);

      await expect(
        service.approveAbsence(existingRecord.id, { approvedBy: generateId() })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // getAbsenceReasons Tests
  // ============================================================

  describe('getAbsenceReasons', () => {
    it('should return system and center-specific reasons', async () => {
      const centerId = generateId();
      const mockReasons = [
        createMockAbsenceReason({ name: 'Sick', isSystem: true }),
        createMockAbsenceReason({ name: 'Family Emergency', isSystem: true }),
        createMockAbsenceReason({ name: 'Custom Reason', isSystem: false, centerId }),
      ];

      mockPrismaClient.absenceReason.findMany.mockResolvedValue(mockReasons);

      const reasons = await service.getAbsenceReasons(centerId);

      expect(reasons).toHaveLength(3);
      expect(mockPrismaClient.absenceReason.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
            isActive: true,
          }),
        })
      );
    });
  });

  // ============================================================
  // createAbsenceReason Tests
  // ============================================================

  describe('createAbsenceReason', () => {
    it('should create a new absence reason', async () => {
      const centerId = generateId();
      const mockReason = createMockAbsenceReason({
        name: 'Custom Reason',
        description: 'A custom reason',
        isSystem: false,
        centerId,
      });

      mockPrismaClient.absenceReason.create.mockResolvedValue(mockReason);

      const result = await service.createAbsenceReason(centerId, {
        name: 'Custom Reason',
        description: 'A custom reason',
      });

      expect(result.name).toBe('Custom Reason');
      expect(result.isSystem).toBe(false);
    });
  });

  // ============================================================
  // updateAbsenceReason Tests
  // ============================================================

  describe('updateAbsenceReason', () => {
    it('should update a non-system absence reason', async () => {
      const reasonId = generateId();
      const mockReason = createMockAbsenceReason({
        id: reasonId,
        name: 'Old Name',
        isSystem: false,
      });

      const updatedReason = { ...mockReason, name: 'New Name' };

      mockPrismaClient.absenceReason.findUnique.mockResolvedValue(mockReason);
      mockPrismaClient.absenceReason.update.mockResolvedValue(updatedReason);

      const result = await service.updateAbsenceReason(reasonId, { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('should throw BadRequestException when trying to modify system reason', async () => {
      const mockReason = createMockAbsenceReason({ isSystem: true });

      mockPrismaClient.absenceReason.findUnique.mockResolvedValue(mockReason);

      await expect(
        service.updateAbsenceReason(mockReason.id, { name: 'New Name' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when reason does not exist', async () => {
      mockPrismaClient.absenceReason.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAbsenceReason(generateId(), { name: 'New Name' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // deleteAbsenceReason Tests
  // ============================================================

  describe('deleteAbsenceReason', () => {
    it('should deactivate a non-system absence reason', async () => {
      const reasonId = generateId();
      const mockReason = createMockAbsenceReason({ id: reasonId, isSystem: false });

      mockPrismaClient.absenceReason.findUnique.mockResolvedValue(mockReason);
      mockPrismaClient.absenceReason.update.mockResolvedValue({
        ...mockReason,
        isActive: false,
      });

      await service.deleteAbsenceReason(reasonId);

      expect(mockPrismaClient.absenceReason.update).toHaveBeenCalledWith({
        where: { id: reasonId },
        data: { isActive: false },
      });
    });

    it('should throw BadRequestException when trying to delete system reason', async () => {
      const mockReason = createMockAbsenceReason({ isSystem: true });

      mockPrismaClient.absenceReason.findUnique.mockResolvedValue(mockReason);

      await expect(service.deleteAbsenceReason(mockReason.id)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // getAttendance Tests
  // ============================================================

  describe('getAttendance', () => {
    it('should return paginated attendance records', async () => {
      const mockRecords = [
        createMockAttendanceRecord(),
        createMockAttendanceRecord(),
      ];

      mockPrismaClient.attendanceRecord.count.mockResolvedValue(50);
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue(mockRecords);

      const result = await service.getAttendance({
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(50);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should filter by studentId', async () => {
      const studentId = generateId();

      mockPrismaClient.attendanceRecord.count.mockResolvedValue(0);
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue([]);

      await service.getAttendance({ studentId, page: 1, limit: 20 });

      expect(mockPrismaClient.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId,
          }),
        })
      );
    });

    it('should filter by status', async () => {
      mockPrismaClient.attendanceRecord.count.mockResolvedValue(0);
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue([]);

      await service.getAttendance({ status: AttendanceStatus.absent, page: 1, limit: 20 });

      expect(mockPrismaClient.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AttendanceStatus.absent,
          }),
        })
      );
    });
  });

  // ============================================================
  // getSessionWithEnrollments Tests
  // ============================================================

  describe('getSessionWithEnrollments', () => {
    it('should return session with enrolled students and attendance status', async () => {
      const sessionId = generateId();
      const classId = generateId();
      const studentId = generateId();

      const mockSession = createMockSession({
        id: sessionId,
        classId,
        class: createMockClass({
          id: classId,
          enrollments: [
            {
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
              student: createMockStudent({ id: studentId, fullName: 'Test Student' }),
            },
          ],
        }),
      });

      const mockAttendance = createMockAttendanceRecord({
        studentId,
        sessionId,
        status: AttendanceStatus.present,
      });

      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue([mockAttendance]);

      const result = await service.getSessionWithEnrollments(sessionId);

      expect(result).toHaveLength(1);
      expect(result[0].studentName).toBe('Test Student');
      expect(result[0].status).toBe(AttendanceStatus.present);
      expect(result[0].isRecorded).toBe(true);
    });

    it('should return students with isRecorded false when no attendance', async () => {
      const sessionId = generateId();
      const classId = generateId();

      const mockSession = createMockSession({
        id: sessionId,
        classId,
        class: createMockClass({
          id: classId,
          enrollments: [
            {
              id: generateId(),
              studentId: generateId(),
              classId,
              enrolledAt: new Date(),
              startDate: new Date(),
              endDate: null,
              status: EnrollmentStatus.active,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              student: createMockStudent({ fullName: 'Unrecorded Student' }),
            },
          ],
        }),
      });

      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue([]);

      const result = await service.getSessionWithEnrollments(sessionId);

      expect(result).toHaveLength(1);
      expect(result[0].isRecorded).toBe(false);
      expect(result[0].status).toBeNull();
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(null);

      await expect(service.getSessionWithEnrollments(generateId())).rejects.toThrow(
        NotFoundException
      );
    });
  });
});