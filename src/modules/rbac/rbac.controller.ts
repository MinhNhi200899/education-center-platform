import { Request, Response } from 'express';
import { rbacService } from './services/rbac.service';
import { asyncHandler } from '../../shared/utils/async-handler';
import { logger } from '../../shared/services/logger.service';

/**
 * List users for role assignment
 * GET /api/v1/rbac/users
 */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await rbacService.listUsers({
    centerId: req.query.centerId as string | undefined,
    search: req.query.search as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
  });

  res.json({
    success: true,
    data: result.data,
    meta: {
      ...result.meta,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get all roles
 * GET /api/v1/roles
 */
export const getRoles = asyncHandler(async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === 'true';
  const roles = await rbacService.getRoles(includeInactive);

  res.json({
    success: true,
    data: roles,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Get role by ID
 * GET /api/v1/roles/:id
 */
export const getRoleById = asyncHandler(async (req: Request, res: Response) => {
  const role = await rbacService.getRoleWithPermissions(req.params.id);

  if (!role) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Role not found',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  res.json({
    success: true,
    data: role,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Create role
 * POST /api/v1/roles
 */
export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, permissions } = req.body;

  const role = await rbacService.createRole({
    name,
    description,
    permissions,
  });

  res.status(201).json({
    success: true,
    data: role,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Update role
 * PUT /api/v1/roles/:id
 */
export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const { description, isActive } = req.body;

  const role = await rbacService.updateRole(req.params.id, {
    description,
    isActive,
  });

  res.json({
    success: true,
    data: role,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Delete role
 * DELETE /api/v1/roles/:id
 */
export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  await rbacService.deleteRole(req.params.id);

  res.json({
    success: true,
    data: { message: 'Role deleted successfully' },
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Assign permissions to role
 * PUT /api/v1/roles/:id/permissions
 */
export const assignPermissions = asyncHandler(async (req: Request, res: Response) => {
  const { permissionIds } = req.body;

  await rbacService.assignPermissionsToRole(req.params.id, permissionIds);
  const role = await rbacService.getRoleWithPermissions(req.params.id);

  res.json({
    success: true,
    data: role,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Get all permissions
 * GET /api/v1/permissions
 */
export const getPermissions = asyncHandler(async (req: Request, res: Response) => {
  const permissions = await rbacService.getPermissions();

  res.json({
    success: true,
    data: permissions,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Get permissions by module
 * GET /api/v1/permissions/:module
 */
export const getPermissionsByModule = asyncHandler(async (req: Request, res: Response) => {
  const permissions = await rbacService.getPermissionsByModule(req.params.module);

  res.json({
    success: true,
    data: permissions,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Assign role to user
 * POST /api/v1/users/:userId/roles
 */
export const assignRoleToUser = asyncHandler(async (req: Request, res: Response) => {
  const { roleId, centerId } = req.body;
  const userId = req.params.userId;

  await rbacService.assignRoleToUser(userId, roleId, centerId);

  res.json({
    success: true,
    data: { message: 'Role assigned successfully' },
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Remove role from user
 * DELETE /api/v1/users/:userId/roles/:roleId
 */
export const removeRoleFromUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId, roleId } = req.params;
  const centerId = req.query.centerId as string | undefined;

  await rbacService.removeRoleFromUser(userId, roleId, centerId);

  res.json({
    success: true,
    data: { message: 'Role removed successfully' },
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Get user roles
 * GET /api/v1/users/:userId/roles
 */
export const getUserRoles = asyncHandler(async (req: Request, res: Response) => {
  const roles = await rbacService.getUserRoles(req.params.userId);

  res.json({
    success: true,
    data: roles,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Get user permission matrix
 * GET /api/v1/users/:userId/permissions
 */
export const getUserPermissionMatrix = asyncHandler(async (req: Request, res: Response) => {
  const matrix = await rbacService.getUserPermissionMatrix(req.params.userId);

  res.json({
    success: true,
    data: matrix,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Seed permissions and roles (admin only)
 * POST /api/v1/rbac/seed
 */
export const seedRbac = asyncHandler(async (req: Request, res: Response) => {
  await rbacService.seedPermissions();
  await rbacService.seedRoles();

  logger.info('RBAC seeded successfully');

  res.json({
    success: true,
    data: { message: 'RBAC seeded successfully' },
    meta: { timestamp: new Date().toISOString() },
  });
});

export const rbacController = {
  listUsers,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions,
  getPermissions,
  getPermissionsByModule,
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  getUserPermissionMatrix,
  seedRbac,
};