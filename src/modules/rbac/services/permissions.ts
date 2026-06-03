import { PermissionDefinition, PermissionLevel, Module } from '../types/rbac.types';

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Centers
  { name: 'centers.read', module: Module.CENTERS, level: PermissionLevel.READ, description: 'View centers' },
  { name: 'centers.create', module: Module.CENTERS, level: PermissionLevel.CREATE, description: 'Create centers' },
  { name: 'centers.update', module: Module.CENTERS, level: PermissionLevel.UPDATE, description: 'Update centers' },
  { name: 'centers.delete', module: Module.CENTERS, level: PermissionLevel.DELETE, description: 'Delete centers' },

  // Students
  { name: 'students.read', module: Module.STUDENTS, level: PermissionLevel.READ, description: 'View student records' },
  { name: 'students.create', module: Module.STUDENTS, level: PermissionLevel.CREATE, description: 'Create student records' },
  { name: 'students.update', module: Module.STUDENTS, level: PermissionLevel.UPDATE, description: 'Update student records' },
  { name: 'students.delete', module: Module.STUDENTS, level: PermissionLevel.DELETE, description: 'Delete student records' },
  { name: 'students.export', module: Module.STUDENTS, level: PermissionLevel.EXPORT, description: 'Export student data' },

  // Teachers
  { name: 'teachers.read', module: Module.TEACHERS, level: PermissionLevel.READ, description: 'View teacher records' },
  { name: 'teachers.create', module: Module.TEACHERS, level: PermissionLevel.CREATE, description: 'Create teacher records' },
  { name: 'teachers.update', module: Module.TEACHERS, level: PermissionLevel.UPDATE, description: 'Update teacher records' },
  { name: 'teachers.delete', module: Module.TEACHERS, level: PermissionLevel.DELETE, description: 'Delete teacher records' },
  { name: 'teachers.export', module: Module.TEACHERS, level: PermissionLevel.EXPORT, description: 'Export teacher data' },

  // Classes
  { name: 'classes.read', module: Module.CLASSES, level: PermissionLevel.READ, description: 'View class information' },
  { name: 'classes.create', module: Module.CLASSES, level: PermissionLevel.CREATE, description: 'Create classes' },
  { name: 'classes.update', module: Module.CLASSES, level: PermissionLevel.UPDATE, description: 'Update class information' },
  { name: 'classes.delete', module: Module.CLASSES, level: PermissionLevel.DELETE, description: 'Delete classes' },

  // Attendance
  { name: 'attendance.read', module: Module.ATTENDANCE, level: PermissionLevel.READ, description: 'View attendance records' },
  { name: 'attendance.create', module: Module.ATTENDANCE, level: PermissionLevel.CREATE, description: 'Mark attendance' },
  { name: 'attendance.update', module: Module.ATTENDANCE, level: PermissionLevel.UPDATE, description: 'Update attendance records' },

  // Schedule (teaching calendar)
  { name: 'schedule.read', module: Module.SCHEDULE, level: PermissionLevel.READ, description: 'View teaching schedule calendar' },
  { name: 'schedule.create', module: Module.SCHEDULE, level: PermissionLevel.CREATE, description: 'Generate sessions from class schedule' },
  { name: 'schedule.update', module: Module.SCHEDULE, level: PermissionLevel.UPDATE, description: 'Update teaching schedule' },

  // Sessions
  { name: 'sessions.read', module: Module.SESSIONS, level: PermissionLevel.READ, description: 'View session schedule' },
  { name: 'sessions.create', module: Module.SESSIONS, level: PermissionLevel.CREATE, description: 'Create sessions' },
  { name: 'sessions.update', module: Module.SESSIONS, level: PermissionLevel.UPDATE, description: 'Update sessions' },
  { name: 'sessions.delete', module: Module.SESSIONS, level: PermissionLevel.DELETE, description: 'Delete sessions' },

  // Evaluations
  { name: 'evaluations.read', module: Module.EVALUATIONS, level: PermissionLevel.READ, description: 'View evaluations' },
  { name: 'evaluations.create', module: Module.EVALUATIONS, level: PermissionLevel.CREATE, description: 'Create evaluations' },
  { name: 'evaluations.update', module: Module.EVALUATIONS, level: PermissionLevel.UPDATE, description: 'Update evaluations' },
  { name: 'evaluations.delete', module: Module.EVALUATIONS, level: PermissionLevel.DELETE, description: 'Delete evaluations' },

  // Tuition
  { name: 'tuition.read', module: Module.TUITION, level: PermissionLevel.READ, description: 'View tuition plans and invoices' },
  { name: 'tuition.create', module: Module.TUITION, level: PermissionLevel.CREATE, description: 'Create tuition plans and invoices' },
  { name: 'tuition.update', module: Module.TUITION, level: PermissionLevel.UPDATE, description: 'Update tuition plans and invoices' },
  { name: 'tuition.delete', module: Module.TUITION, level: PermissionLevel.DELETE, description: 'Delete tuition records' },

  // Payments
  { name: 'payments.read', module: Module.PAYMENTS, level: PermissionLevel.READ, description: 'View payment records' },
  { name: 'payments.create', module: Module.PAYMENTS, level: PermissionLevel.CREATE, description: 'Record payments' },
  { name: 'payments.update', module: Module.PAYMENTS, level: PermissionLevel.UPDATE, description: 'Update payment records' },

  // Dashboard
  { name: 'dashboard.read', module: Module.DASHBOARD, level: PermissionLevel.READ, description: 'View dashboard' },
  { name: 'dashboard.export', module: Module.DASHBOARD, level: PermissionLevel.EXPORT, description: 'Export dashboard data' },

  // Reports
  { name: 'reports.read', module: Module.REPORTS, level: PermissionLevel.READ, description: 'View reports' },
  { name: 'reports.export', module: Module.REPORTS, level: PermissionLevel.EXPORT, description: 'Export reports' },

  // Roles
  { name: 'roles.read', module: Module.ROLES, level: PermissionLevel.READ, description: 'View roles' },
  { name: 'roles.create', module: Module.ROLES, level: PermissionLevel.CREATE, description: 'Create roles' },
  { name: 'roles.update', module: Module.ROLES, level: PermissionLevel.UPDATE, description: 'Update roles' },
  { name: 'roles.delete', module: Module.ROLES, level: PermissionLevel.DELETE, description: 'Delete roles' },

  // Permissions
  { name: 'permissions.read', module: Module.PERMISSIONS, level: PermissionLevel.READ, description: 'View permissions' },

  // Users
  { name: 'users.read', module: Module.USERS, level: PermissionLevel.READ, description: 'View users' },
  { name: 'users.create', module: Module.USERS, level: PermissionLevel.CREATE, description: 'Create users' },
  { name: 'users.update', module: Module.USERS, level: PermissionLevel.UPDATE, description: 'Update users' },
  { name: 'users.delete', module: Module.USERS, level: PermissionLevel.DELETE, description: 'Delete users' },

  // Settings
  { name: 'settings.read', module: Module.SETTINGS, level: PermissionLevel.READ, description: 'View settings' },
  { name: 'settings.update', module: Module.SETTINGS, level: PermissionLevel.UPDATE, description: 'Update settings' },

  // Self access (for students/parents to access own records)
  { name: 'self.read', module: 'self', level: PermissionLevel.READ, description: 'Access own records' },
];

export default PERMISSION_DEFINITIONS;