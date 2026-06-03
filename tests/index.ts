// ============================================================
// TEST SUITE INDEX
// Test organization and exports
// ============================================================

// Re-export all test helpers and utilities
export * from './factories/data.factory';
export * from './setup';
export * from './mocks';

// Import all test modules to ensure they're registered
import './unit/attendance/attendance.service.test';
import './unit/attendance/attendance.validators.test';
import './unit/students/student.service.test';
import './unit/students/student.validators.test';
import './unit/classes/class.service.test';
import './unit/classes/class.validators.test';
import './unit/auth/auth.service.test';
import './unit/auth/auth.validators.test';
import './integration/validators.integration.test';
import './api/attendance.api.test';

// Test categorization helper
export const testCategories = {
  unit: {
    attendanceService: 'Unit tests for AttendanceService',
    attendanceValidators: 'Unit tests for Attendance Validators',
    studentService: 'Unit tests for StudentService',
    studentValidators: 'Unit tests for Student Validators',
    classService: 'Unit tests for ClassService',
    classValidators: 'Unit tests for Class Validators',
    authService: 'Unit tests for AuthService',
    authValidators: 'Unit tests for Auth Validators',
  },
  integration: {
    validators: 'Integration tests for validators via HTTP',
  },
  api: {
    attendance: 'API tests for Attendance endpoints',
  },
};

// Coverage targets
export const coverageTargets = {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80,
};

export default {
  testCategories,
  coverageTargets,
};