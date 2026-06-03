import { AttendanceStatus, SessionStatus, EnrollmentStatus, SessionType, ClassStatus } from '@prisma/client';

// ============================================================
// TEST DATA FACTORIES
// Education Center Management Platform
// ============================================================

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Create a mock student
 */
export const createMockStudent = (overrides = {}) => ({
  id: generateId(),
  userId: null,
  centerId: generateId(),
  fullName: 'Test Student',
  dateOfBirth: new Date('2010-05-15'),
  gender: 'male' as const,
  phone: '0123456789',
  email: 'student@test.com',
  address: '123 Test Street',
  avatarUrl: null,
  enrollmentDate: new Date('2024-01-01'),
  status: 'active' as const,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock session
 */
export const createMockSession = (overrides = {}) => ({
  id: generateId(),
  classId: generateId(),
  teacherId: generateId(),
  sessionDate: new Date('2024-06-03'),
  startTime: '08:00',
  endTime: '09:30',
  classroom: 'Room 101',
  sessionType: 'regular' as SessionType,
  status: 'scheduled' as SessionStatus,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  class: createMockClass(),
  ...overrides,
});

/**
 * Create a mock class
 */
export const createMockClass = (overrides = {}) => ({
  id: generateId(),
  centerId: generateId(),
  name: 'Test Class',
  description: 'A test class',
  academicLevel: 'beginner' as const,
  capacity: 30,
  status: 'active' as ClassStatus,
  classroom: 'Room 101',
  schedule: {},
  startDate: new Date('2024-01-01'),
  endDate: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock enrollment
 */
export const createMockEnrollment = (overrides = {}) => ({
  id: generateId(),
  studentId: generateId(),
  classId: generateId(),
  enrolledAt: new Date(),
  startDate: new Date('2024-01-01'),
  endDate: null,
  status: 'active' as EnrollmentStatus,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  student: createMockStudent(),
  class: createMockClass(),
  ...overrides,
});

/**
 * Create a mock attendance record
 */
export const createMockAttendanceRecord = (overrides = {}) => ({
  id: generateId(),
  studentId: generateId(),
  sessionId: generateId(),
  status: 'present' as AttendanceStatus,
  reason: null,
  recordedBy: generateId(),
  recordedAt: new Date(),
  approvedBy: null,
  approvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  student: createMockStudent(),
  session: createMockSession(),
  ...overrides,
});

/**
 * Create a mock absence reason
 */
export const createMockAbsenceReason = (overrides = {}) => ({
  id: generateId(),
  centerId: generateId(),
  name: 'Sick',
  description: 'Student illness',
  displayOrder: 1,
  isSystem: true,
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

/**
 * Create mock center
 */
export const createMockCenter = (overrides = {}) => ({
  id: generateId(),
  name: 'Test Center',
  code: 'TC001',
  address: '123 Center Street',
  phone: '0123456789',
  email: 'center@test.com',
  logoUrl: null,
  timezone: 'Asia/Ho_Chi_Minh',
  settings: {},
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create mock user
 */
export const createMockUser = (overrides = {}) => ({
  id: generateId(),
  centerId: generateId(),
  email: 'user@test.com',
  passwordHash: '$2b$12$hashedpassword',
  phone: '0123456789',
  status: 'active' as const,
  lastLoginAt: null,
  lastLoginIp: null,
  failedLoginCount: 0,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create bulk mock students for a class
 */
export const createMockStudentsForClass = (count: number, classId: string) => {
  return Array.from({ length: count }, (_, i) =>
    createMockStudent({
      id: generateId(),
      centerId: generateId(),
      fullName: `Student ${i + 1}`,
    })
  );
};

/**
 * Create attendance records for a session
 */
export const createMockAttendanceRecordsForSession = (
  sessionId: string,
  students: any[],
  statusDistribution: { present?: number; absent?: number; late?: number; excused?: number } = {}
) => {
  const { present = 0.7, absent = 0.1, late = 0.1, excused = 0.1 } = statusDistribution;
  const total = students.length;

  return students.map((student, index) => {
    const rand = Math.random();
    let status: AttendanceStatus;

    if (rand < present) {
      status = AttendanceStatus.present;
    } else if (rand < present + absent) {
      status = AttendanceStatus.absent;
    } else if (rand < present + absent + late) {
      status = AttendanceStatus.late;
    } else {
      status = AttendanceStatus.excused;
    }

    return createMockAttendanceRecord({
      id: generateId(),
      studentId: student.id,
      sessionId,
      status,
      reason: status === AttendanceStatus.excused ? 'Approved absence' : null,
      recordedBy: generateId(),
      recordedAt: new Date(),
    });
  });
};

// Export all factories
export const factories = {
  student: createMockStudent,
  session: createMockSession,
  class: createMockClass,
  enrollment: createMockEnrollment,
  attendanceRecord: createMockAttendanceRecord,
  absenceReason: createMockAbsenceReason,
  center: createMockCenter,
  user: createMockUser,
  studentsForClass: createMockStudentsForClass,
  attendanceRecordsForSession: createMockAttendanceRecordsForSession,
};

export default factories;