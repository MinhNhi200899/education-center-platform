import { PrismaClient, Role, Permission, UserRole as PrismaUserRole, RolePermission } from '@prisma/client';
import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import {
  AuthUser,
  AuthRole,
  ScopedPermission,
  PermissionCheck,
  CreateRoleDTO,
  UpdateRoleDTO,
  AssignPermissionsDTO,
} from '../types/rbac.types';
import { PERMISSION_DEFINITIONS } from './permissions';
import { DEFAULT_ROLES } from '../types/rbac.types';
import { NotFoundException, ConflictException, ForbiddenException } from '../../../shared/types/error.types';
import { CenterScopeActor, isSuperAdmin } from '../../../shared/utils/center-scope';

export class RbacService {
  /**
   * Upsert all permission definitions (idempotent).
   */
  async upsertPermissions(): Promise<void> {
    for (const perm of PERMISSION_DEFINITIONS) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        create: {
          name: perm.name,
          module: perm.module,
          level: perm.level,
          description: perm.description,
        },
        update: {
          module: perm.module,
          level: perm.level,
          description: perm.description,
        },
      });
    }
  }

  /**
   * Ensure system roles exist and have default permissions (adds missing links only).
   */
  async syncSystemRolePermissions(): Promise<void> {
    await this.upsertPermissions();

    for (const roleDef of DEFAULT_ROLES) {
      const role = await prisma.role.upsert({
        where: { name: roleDef.name },
        create: {
          name: roleDef.name,
          description: roleDef.description,
          isSystem: roleDef.isSystem,
          isActive: true,
        },
        update: {
          description: roleDef.description,
          isSystem: roleDef.isSystem,
        },
      });

      const permissionNames =
        roleDef.permissions[0] === '*'
          ? (await prisma.permission.findMany({ select: { name: true } })).map((p) => p.name)
          : roleDef.permissions;

      for (const permName of permissionNames) {
        const perm = await prisma.permission.findUnique({ where: { name: permName } });
        if (!perm) {
          logger.warn('Permission missing during role sync', { role: roleDef.name, permName });
          continue;
        }

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId: perm.id },
          },
          create: { roleId: role.id, permissionId: perm.id },
          update: {},
        });
      }
    }

    logger.info('Synced system role permissions');
  }

  /**
   * Seed default permissions
   */
  async seedPermissions(): Promise<void> {
    try {
      await this.upsertPermissions();
      logger.info(`Upserted ${PERMISSION_DEFINITIONS.length} permissions`);
    } catch (error) {
      logger.error('Failed to seed permissions', { error });
      throw error;
    }
  }

  /**
   * Seed default roles
   */
  async seedRoles(): Promise<void> {
    try {
      await this.syncSystemRolePermissions();
      logger.info('Seeded/synced default roles with permissions');
    } catch (error) {
      logger.error('Failed to seed roles', { error });
      throw error;
    }
  }

  /**
   * Get user with roles and permissions
   */
  async getUserWithPermissions(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        center: true,
      },
    });

    if (!user) return null;

    const roles: AuthRole[] = user.userRoles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      centerId: ur.centerId,
      permissions: ur.role.permissions.map((rp) => rp.permission.name),
    }));

    const permissions: ScopedPermission[] = user.userRoles.flatMap(ur =>
      ur.role.permissions.map((rp) => ({
        permission: rp.permission.name,
        centerId: ur.centerId,
      }))
    );

    return {
      id: user.id,
      email: user.email,
      centerId: user.centerId,
      roles,
      permissions,
    };
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    userId: string,
    permission: string,
    centerId?: string | null
  ): Promise<boolean> {
    const user = await this.getUserWithPermissions(userId);
    if (!user) return false;

    return this.checkPermissionInternal(user, permission, centerId);
  }

  /**
   * Check permission internally (no DB call)
   */
  private checkPermissionInternal(
    user: AuthUser,
    permission: string,
    centerId?: string | null
  ): boolean {
    // Super admin (role with null centerId) has all permissions
    const hasSuperAdmin = user.roles.some(
      r => r.name === 'super_admin' && r.centerId === null
    );
    if (hasSuperAdmin) return true;

    // Check if user has the specific permission
    for (const scoped of user.permissions) {
      // Wildcard permission
      if (scoped.permission === '*') return true;

      // Exact match
      if (scoped.permission === permission) {
        // If permission is scoped to all centers (null) or matches user's center
        if (scoped.centerId === null || scoped.centerId === centerId) {
          return true;
        }
      }

      // Module wildcard (e.g., 'students.*')
      const [permModule] = permission.split('.');
      const [scopeModule] = scoped.permission.split('.');
      if (scopeModule === '*' && permModule === scopeModule) {
        if (scoped.centerId === null || scoped.centerId === centerId) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Require a permission - throws if not allowed
   */
  async requirePermission(
    userId: string,
    permission: string,
    centerId?: string | null
  ): Promise<void> {
    const hasPermission = await this.hasPermission(userId, permission, centerId);
    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission: ${permission}`
      );
    }
  }

  /**
   * Check multiple permissions (AND logic - must have ALL)
   */
  async hasAllPermissions(
    userId: string,
    permissions: string[],
    centerId?: string | null
  ): Promise<boolean> {
    for (const perm of permissions) {
      const has = await this.hasPermission(userId, perm, centerId);
      if (!has) return false;
    }
    return true;
  }

  /**
   * Check multiple permissions (OR logic - must have at least ONE)
   */
  async hasAnyPermission(
    userId: string,
    permissions: string[],
    centerId?: string | null
  ): Promise<boolean> {
    for (const perm of permissions) {
      const has = await this.hasPermission(userId, perm, centerId);
      if (has) return true;
    }
    return false;
  }

  /**
   * Get all roles
   */
  async getRoles(includeInactive: boolean = false): Promise<Role[]> {
    const where = includeInactive ? {} : { isActive: true };
    return prisma.role.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<Role | null> {
    return prisma.role.findUnique({ where: { id: roleId } });
  }

  /**
   * Get role with permissions
   */
  async getRoleWithPermissions(roleId: string): Promise<any> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) return null;

    return {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  /**
   * List users (optionally filtered by center)
   */
  async listUsers(filters: {
    centerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const where: any = {};

    if (filters.centerId) {
      where.centerId = filters.centerId;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }

    const total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        centerId: true,
        center: { select: { id: true, name: true, code: true } },
        userRoles: {
          include: {
            role: { select: { id: true, name: true, description: true } },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { email: 'asc' },
    });

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        status: u.status,
        centerId: u.centerId,
        center: u.center,
        roles: u.userRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
          centerId: ur.centerId,
        })),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleDTO): Promise<Role> {
    // Check if role already exists
    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictException('Role already exists', 'ROLE_EXISTS');
    }

    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description || '',
        isSystem: false,
        isActive: true,
      },
    });

    // Assign permissions if provided
    if (data.permissions && data.permissions.length > 0) {
      await this.assignPermissionsToRole(role.id, data.permissions);
    }

    logger.info('Role created', { roleId: role.id, name: role.name });
    return role;
  }

  /**
   * Update role
   */
  async updateRole(roleId: string, data: UpdateRoleDTO): Promise<Role> {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role');
    }

    if (role.isSystem) {
      // System roles can only update description
      if (data.isActive !== undefined) {
        throw new ForbiddenException('Cannot change system role active status');
      }
    }

    return prisma.role.update({
      where: { id: roleId },
      data: {
        description: data.description ?? role.description,
        isActive: data.isActive ?? role.isActive,
      },
    });
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role');
    }

    if (role.isSystem) {
      throw new ForbiddenException('Cannot delete system role');
    }

    // Check if role is assigned to any users
    const userCount = await prisma.userRole.count({
      where: { roleId },
    });
    if (userCount > 0) {
      throw new ConflictException(
        'Role is assigned to users. Remove assignments first.',
        'ROLE_IN_USE'
      );
    }

    await prisma.role.delete({ where: { id: roleId } });
    logger.info('Role deleted', { roleId });
  }

  /**
   * Assign permissions to role
   */
  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[]
  ): Promise<void> {
    // Delete existing permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Add new permissions
    for (const permId of permissionIds) {
      await prisma.rolePermission.create({
        data: { roleId, permissionId: permId },
      });
    }

    logger.info('Permissions assigned to role', { roleId, count: permissionIds.length });
  }

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<Permission[]> {
    return prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get permissions by module
   */
  async getPermissionsByModule(module: string): Promise<Permission[]> {
    return prisma.permission.findMany({
      where: { module },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    centerId: string | undefined,
    actor: CenterScopeActor
  ): Promise<void> {
    const [user, role] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user) throw new NotFoundException('User');
    if (!role) throw new NotFoundException('Role');

    const actorIsSuperAdmin = isSuperAdmin(actor);

    if (role.name === 'super_admin' && !actorIsSuperAdmin) {
      throw new ForbiddenException('Only super_admin can assign the super_admin role');
    }

    if (role.name === 'center_manager' && !actorIsSuperAdmin) {
      throw new ForbiddenException('Only super_admin can assign the center_manager role');
    }

    if (!actorIsSuperAdmin) {
      const actorCenterId = actor.centerId;
      if (!actorCenterId) {
        throw new ForbiddenException('User is not assigned to a center');
      }

      const assignmentCenterId = centerId || actorCenterId;
      if (assignmentCenterId !== actorCenterId) {
        throw new ForbiddenException('Cannot assign roles outside your center');
      }

      if (user.centerId && user.centerId !== actorCenterId) {
        throw new ForbiddenException('Cannot assign roles to users outside your center');
      }
    }

    const existing = await prisma.userRole.findFirst({
      where: { userId, roleId, centerId: centerId || null },
    });

    if (existing) {
      throw new ConflictException('Role already assigned', 'ROLE_ALREADY_ASSIGNED');
    }

    await prisma.userRole.create({
      data: {
        userId,
        roleId,
        centerId: centerId || null,
      },
    });

    logger.info('Role assigned to user', { userId, roleId, centerId, actorId: actor.id });
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(
    userId: string,
    roleId: string,
    centerId: string | undefined,
    actor: CenterScopeActor
  ): Promise<void> {
    const [user, role] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user) throw new NotFoundException('User');
    if (!role) throw new NotFoundException('Role');

    const actorIsSuperAdmin = isSuperAdmin(actor);

    if (role.name === 'super_admin' && !actorIsSuperAdmin) {
      throw new ForbiddenException('Only super_admin can remove the super_admin role');
    }

    if (!actorIsSuperAdmin) {
      const actorCenterId = actor.centerId;
      if (!actorCenterId) {
        throw new ForbiddenException('User is not assigned to a center');
      }

      const assignmentCenterId = centerId || actorCenterId;
      if (assignmentCenterId !== actorCenterId) {
        throw new ForbiddenException('Cannot remove roles outside your center');
      }

      if (user.centerId && user.centerId !== actorCenterId) {
        throw new ForbiddenException('Cannot modify roles for users outside your center');
      }
    }

    await prisma.userRole.deleteMany({
      where: { userId, roleId, centerId: centerId || null },
    });

    logger.info('Role removed from user', { userId, roleId, centerId, actorId: actor.id });
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<any[]> {
    return prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: { permissions: true },
        },
        center: { select: { id: true, name: true, code: true } },
      },
    });
  }

  /**
   * Get permission matrix for a user
   */
  async getUserPermissionMatrix(userId: string): Promise<Record<string, boolean>> {
    const user = await this.getUserWithPermissions(userId);
    if (!user) return {};

    const allPermissions = await this.getPermissions();
    const matrix: Record<string, boolean> = {};

    for (const perm of allPermissions) {
      matrix[perm.name] = this.checkPermissionInternal(user, perm.name);
    }

    return matrix;
  }
}

export const rbacService = new RbacService();
export default rbacService;