import { Request, Response, NextFunction } from 'express';
import { rbacService } from '../services/rbac.service';
import { logger } from '../../../shared/services/logger.service';
import { ForbiddenException, UnauthorizedException } from '../../../shared/types/error.types';

/**
 * Require specific permission(s)
 * Usage: requirePermission('students.read')
 *        requirePermission('students.create', 'students.update')
 */
export const requirePermission = (...permissions: string[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedException('Authentication required');
      }

      // Get user's center from request context
      const centerId = req.params.centerId || req.body?.centerId || user.centerId;

      // Check all required permissions (AND logic)
      for (const permission of permissions) {
        const hasPermission = await rbacService.hasPermission(
          user.id,
          permission,
          centerId
        );

        if (!hasPermission) {
          logger.warn('Permission denied', {
            userId: user.id,
            required: permission,
            centerId,
          });

          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: `Missing required permission: ${permission}`,
              required: permission,
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require any of the specified permissions (OR logic)
 * Usage: requireAnyPermission('students.delete', 'students.update')
 */
export const requireAnyPermission = (...permissions: string[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedException('Authentication required');
      }

      const centerId = req.params.centerId || req.body?.centerId || user.centerId;

      // Check if user has ANY of the permissions
      const hasPermission = await rbacService.hasAnyPermission(
        user.id,
        permissions,
        centerId
      );

      if (!hasPermission) {
        logger.warn('No matching permission found', {
          userId: user.id,
          required: permissions,
          centerId,
        });

        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
            required: permissions,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require all specified permissions (AND logic)
 * Usage: requireAllPermissions('students.read', 'students.update')
 */
export const requireAllPermissions = (...permissions: string[]) => {
  return requirePermission(...permissions);
};

export default requirePermission;