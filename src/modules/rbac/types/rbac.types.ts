// RBAC Types for Education Center Platform

// Permission levels
export enum PermissionLevel {
  NONE = 0,
  READ = 1,
  CREATE = 2,
  UPDATE = 3,
  DELETE = 4,
  EXPORT = 5,
}

// Module names
export enum Module {
  CENTERS = 'centers',
  STUDENTS = 'students',
  TEACHERS = 'teachers',
  CLASSES = 'classes',
  ATTENDANCE = 'attendance',
  SCHEDULE = 'schedule',
  SESSIONS = 'sessions',
  EVALUATIONS = 'evaluations',
  TUITION = 'tuition',
  PAYMENTS = 'payments',
  DASHBOARD = 'dashboard',
  REPORTS = 'reports',
  ROLES = 'roles',
  PERMISSIONS = 'permissions',
  USERS = 'users',
  SETTINGS = 'settings',
}

// Permission structure
export interface Permission {
  id: string;
  name: string;
  module: string;
  level: PermissionLevel;
  description: string;
  createdAt: Date;
}

// Role structure
export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Role with permissions
export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

// User role assignment
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  centerId: string | null;
  createdAt: Date;
}

// Scoped permission (with center context)
export interface ScopedPermission {
  permission: string;
  centerId: string | null; // null = all centers
}

// Authenticated user with roles
export interface AuthUser {
  id: string;
  email: string;
  centerId: string | null;
  roles: AuthRole[];
  permissions: ScopedPermission[];
}

export interface AuthRole {
  id: string;
  name: string;
  centerId: string | null;
  permissions: string[];
}

// Permission check result
export interface PermissionCheck {
  allowed: boolean;
  required: string;
  missing?: string;
}

// DTOs
export interface CreateRoleDTO {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRoleDTO {
  description?: string;
  isActive?: boolean;
}

export interface AssignPermissionsDTO {
  permissionIds: string[];
}

export interface AssignRoleDTO {
  roleId: string;
  centerId?: string;
}

export interface RemoveRoleDTO {
  roleId: string;
  centerId?: string;
}

// Permission definition for seeding
export interface PermissionDefinition {
  name: string;
  module: string;
  level: PermissionLevel;
  description: string;
}

// Role definition for seeding
export interface RoleDefinition {
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

// Default roles configuration
export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: 'super_admin',
    description: 'Platform-wide administrator with full access to all resources',
    isSystem: true,
    permissions: ['*'], // Wildcard = all permissions
  },
  {
    name: 'center_manager',
    description: 'Manages a single education center (admin)',
    isSystem: true,
    permissions: [
      'centers.read', 'centers.create', 'centers.update', 'centers.delete',
      'students.read', 'students.create', 'students.update', 'students.delete', 'students.export',
      'teachers.read', 'teachers.create', 'teachers.update', 'teachers.delete', 'teachers.export',
      'classes.read', 'classes.create', 'classes.update', 'classes.delete',
      'attendance.read', 'attendance.create', 'attendance.update',
      'schedule.read', 'schedule.create', 'schedule.update',
      'sessions.read', 'sessions.create', 'sessions.update', 'sessions.delete',
      'evaluations.read', 'evaluations.create', 'evaluations.update',
      'tuition.read', 'tuition.create', 'tuition.update',
      'payments.read', 'payments.create',
      'dashboard.read', 'dashboard.export',
      'reports.read', 'reports.export',
      'roles.read', 'permissions.read',
      'users.read', 'users.update',
      'settings.read', 'settings.update',
    ],
  },
  {
    name: 'teacher',
    description: 'Class teacher with teaching-focused access',
    isSystem: true,
    permissions: [
      'classes.read',
      'attendance.read', 'attendance.create', 'attendance.update',
      'schedule.read', 'schedule.create',
      'sessions.read', 'sessions.create', 'sessions.update', 'sessions.delete',
      'evaluations.read', 'evaluations.create', 'evaluations.update',
    ],
  },
  {
    name: 'student',
    description: 'Student access to own records',
    isSystem: true,
    permissions: [
      'self.read', // Special permission for own records
    ],
  },
  {
    name: 'parent',
    description: 'Parent/guardian access to child records',
    isSystem: true,
    permissions: [
      'self.read', // Access to linked student records
      'payments.create',
    ],
  },
];