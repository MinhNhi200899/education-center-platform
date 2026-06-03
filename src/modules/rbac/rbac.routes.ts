import { Router } from 'express';
import { z } from 'zod';
import { rbacController } from './rbac.controller';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from './middleware/require-permission';
import { requireRole } from './middleware/require-role';
import { validateRequest } from '../../shared/middleware/validate-request';

const router = Router();

// Validation schemas
const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Role name is required'),
    description: z.string().optional(),
    permissions: z.array(z.string().uuid()).optional(),
  }),
});

const updateRoleSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const assignPermissionsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    permissionIds: z.array(z.string().uuid()),
  }),
});

const assignRoleSchema = z.object({
  params: z.object({ userId: z.string().uuid() }),
  body: z.object({
    roleId: z.string().uuid(),
    centerId: z.string().uuid().optional(),
  }),
});

/**
 * @route GET /api/v1/rbac/users
 * @description List users (for role assignment)
 * @access Authenticated (requires users.read)
 */
router.get(
  '/users',
  authenticate,
  requirePermission('users.read'),
  rbacController.listUsers
);

/**
 * @route GET /api/v1/roles
 * @description Get all roles
 * @access Authenticated (requires roles.read)
 */
router.get(
  '/roles',
  authenticate,
  requirePermission('roles.read'),
  rbacController.getRoles
);

/**
 * @route GET /api/v1/roles/:id
 * @description Get role by ID
 * @access Authenticated (requires roles.read)
 */
router.get(
  '/roles/:id',
  authenticate,
  requirePermission('roles.read'),
  rbacController.getRoleById
);

/**
 * @route POST /api/v1/roles
 * @description Create new role
 * @access Authenticated (requires roles.create)
 */
router.post(
  '/roles',
  authenticate,
  requirePermission('roles.create'),
  validateRequest({ body: createRoleSchema.shape.body }),
  rbacController.createRole
);

/**
 * @route PUT /api/v1/roles/:id
 * @description Update role
 * @access Authenticated (requires roles.update)
 */
router.put(
  '/roles/:id',
  authenticate,
  requirePermission('roles.update'),
  validateRequest({
    params: updateRoleSchema.shape.params,
    body: updateRoleSchema.shape.body,
  }),
  rbacController.updateRole
);

/**
 * @route DELETE /api/v1/roles/:id
 * @description Delete role
 * @access Authenticated (requires roles.delete)
 */
router.delete(
  '/roles/:id',
  authenticate,
  requirePermission('roles.delete'),
  rbacController.deleteRole
);

/**
 * @route PUT /api/v1/roles/:id/permissions
 * @description Assign permissions to role
 * @access Authenticated (requires roles.update)
 */
router.put(
  '/roles/:id/permissions',
  authenticate,
  requirePermission('roles.update'),
  validateRequest({
    params: assignPermissionsSchema.shape.params,
    body: assignPermissionsSchema.shape.body,
  }),
  rbacController.assignPermissions
);

/**
 * @route GET /api/v1/permissions
 * @description Get all permissions
 * @access Authenticated (requires permissions.read)
 */
router.get(
  '/permissions',
  authenticate,
  requirePermission('permissions.read'),
  rbacController.getPermissions
);

/**
 * @route GET /api/v1/permissions/:module
 * @description Get permissions by module
 * @access Authenticated (requires permissions.read)
 */
router.get(
  '/permissions/:module',
  authenticate,
  requirePermission('permissions.read'),
  rbacController.getPermissionsByModule
);

/**
 * @route POST /api/v1/users/:userId/roles
 * @description Assign role to user
 * @access Authenticated (requires users.update)
 */
router.post(
  '/users/:userId/roles',
  authenticate,
  requirePermission('users.update'),
  validateRequest({
    params: assignRoleSchema.shape.params,
    body: assignRoleSchema.shape.body,
  }),
  rbacController.assignRoleToUser
);

/**
 * @route DELETE /api/v1/users/:userId/roles/:roleId
 * @description Remove role from user
 * @access Authenticated (requires users.update)
 */
router.delete(
  '/users/:userId/roles/:roleId',
  authenticate,
  requirePermission('users.update'),
  rbacController.removeRoleFromUser
);

/**
 * @route GET /api/v1/users/:userId/roles
 * @description Get user roles
 * @access Authenticated (requires users.read)
 */
router.get(
  '/users/:userId/roles',
  authenticate,
  requirePermission('users.read'),
  rbacController.getUserRoles
);

/**
 * @route GET /api/v1/users/:userId/permissions
 * @description Get user permission matrix
 * @access Authenticated (requires users.read)
 */
router.get(
  '/users/:userId/permissions',
  authenticate,
  requirePermission('users.read'),
  rbacController.getUserPermissionMatrix
);

/**
 * @route POST /api/v1/rbac/seed
 * @description Seed RBAC data (development only)
 * @access Super Admin only
 */
router.post(
  '/rbac/seed',
  authenticate,
  requireRole('super_admin'),
  rbacController.seedRbac
);

export default router;