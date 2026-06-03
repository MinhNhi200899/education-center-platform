import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../config/database';
import { UnauthorizedException, ForbiddenException } from '../../../shared/types/error.types';

export async function requireStudentRole(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const isStudent = user.roles.some((r) => r.name === 'student');
    if (!isStudent) {
      throw new ForbiddenException('Student portal access only');
    }

    const student = await prisma.student.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!student) {
      throw new ForbiddenException('No student profile linked to this account');
    }

    (req as Request & { studentId: string }).studentId = student.id;
    next();
  } catch (error) {
    next(error);
  }
}
