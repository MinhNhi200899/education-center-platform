// RBAC module exports
export { default as rbacRoutes } from './rbac.routes';
export * as rbacController from './rbac.controller';
export { rbacService, RbacService } from './services/rbac.service';

// Middleware
export { requirePermission, requireAnyPermission, requireAllPermissions } from './middleware/require-permission';
export { requireRole, requireScopedRole, requireSuperAdmin, requireCenterManager, requireTeacher, optionalAuth } from './middleware/require-role';

// Types
export * from './types/rbac.types';
export { PERMISSION_DEFINITIONS } from './services/permissions';