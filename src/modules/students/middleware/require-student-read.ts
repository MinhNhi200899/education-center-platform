import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../config/database';
import { rbacService } from '../../rbac/services/rbac.service';
import { UnauthorizedException } from '../../../shared/types/error.types';

/**
 * Allow students.read OR self.read when accessing own Student record
 */
export async function requireStudentRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const centerId = user.centerId ?? undefined;

    if (await rbacService.hasPermission(user.id, 'students.read', centerId)) {
      next();
      return;
    }

    if (await rbacService.hasPermission(user.id, 'self.read', centerId)) {
      const record = await prisma.student.findUnique({
        where: { id: req.params.id },
        select: { userId: true },
      });

      if (record?.userId === user.id) {
        next();
        return;
      }
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to view this student',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
