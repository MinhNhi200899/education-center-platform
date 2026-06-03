import { Request, Response, NextFunction } from 'express';
import { rbacService } from '../services/rbac.service';
import { logger } from '../../../shared/services/logger.service';
import { ForbiddenException, UnauthorizedException } from '../../../shared/types/error.types';

/**
 * Require specific role(s)
 * Usage: requireRole('admin')
 *        requireRole('admin', 'center_manager')
 */
export const requireRole = (...roles: string[]) => {
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

      // Check if user has any of the required roles
      const userRoleNames = user.roles.map(r => r.name);
      const hasRole = roles.some(role => userRoleNames.includes(role));

      if (!hasRole) {
        logger.warn('Role requirement not met', {
          userId: user.id,
          userRoles: userRoleNames,
          required: roles,
        });

        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Requires one of roles: ${roles.join(', ')}`,
            required: roles,
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
 * Require specific role with center scope validation
 * Usage: requireScopedRole('center_manager', 'center_id')
 */
export const requireScopedRole = (
  role: string,
  centerIdParam: string = 'centerId'
) => {
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

      // Super admin has access to all
      const hasSuperAdmin = user.roles.some(
        r => r.name === 'super_admin' && r.centerId === null
      );
      if (hasSuperAdmin) {
        next();
        return;
      }

      // Check if user has the required role
      const hasRole = user.roles.some(r => r.name === role);
      if (!hasRole) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Requires role: ${role}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // If accessing another center's data, check scope
      const requestedCenterId = req.params[centerIdParam] || req.body?.[centerIdParam];

      if (requestedCenterId && user.centerId !== requestedCenterId) {
        // Check if user has cross-center access
        const hasCrossAccess = user.roles.some(
          r => r.centerId === null && r.name === role
        );

        if (!hasCrossAccess) {
          logger.warn('Center scope violation', {
            userId: user.id,
            userCenter: user.centerId,
            requestedCenter: requestedCenterId,
          });

          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied for this center',
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
 * Require super admin role
 */
export const requireSuperAdmin = () => {
  return requireRole('super_admin');
};

/**
 * Require center manager role
 */
export const requireCenterManager = () => {
  return requireRole('center_manager');
};

/**
 * Require teacher role
 */
export const requireTeacher = () => {
  return requireRole('teacher', 'center_manager', 'super_admin');
};

/**
 * Optional authentication - attaches user if token present
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const { authService } = await import('../../auth/services/auth.service');
    const user = await authService.verifyAccessToken(token);
    req.user = user;
    next();
  } catch {
    // Token invalid - continue without user
    next();
  }
};

export default requireRole;