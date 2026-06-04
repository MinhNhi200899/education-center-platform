import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../config/database';
import { UnauthorizedException, ForbiddenException } from '../../../shared/types/error.types';

export async function requireTeacherRole(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const isTeacher = user.roles.some((r) => r.name === 'teacher');
    if (!isTeacher) {
      throw new ForbiddenException('Teacher portal access only');
    }

    const teacher = await prisma.teacher.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!teacher) {
      throw new ForbiddenException('No teacher profile linked to this account');
    }

    (req as Request & { teacherId: string }).teacherId = teacher.id;
    next();
  } catch (error) {
    next(error);
  }
}
