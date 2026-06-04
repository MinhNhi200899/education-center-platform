import { prisma } from '../../config/database';
import { NotFoundException } from '../../shared/types/error.types';

export class TeacherPortalService {
  private async resolveTeacherId(userId: string): Promise<string> {
    const teacher = await prisma.teacher.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile');
    }
    return teacher.id;
  }

  private async getClassIds(teacherId: string): Promise<string[]> {
    const assignments = await prisma.classTeacher.findMany({
      where: { teacherId },
      select: { classId: true },
    });
    return assignments.map((a) => a.classId);
  }

  async getDashboard(userId: string) {
    const teacherId = await this.resolveTeacherId(userId);

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        center: { select: { id: true, name: true, code: true } },
        classTeachers: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                classroom: true,
                schedule: true,
                status: true,
                _count: { select: { enrollments: true } },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher');
    }

    const classIds = teacher.classTeachers.map((ct) => ct.classId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const upcomingSessions =
      classIds.length === 0
        ? []
        : await prisma.session.findMany({
            where: {
              classId: { in: classIds },
              sessionDate: { gte: today },
              status: { in: ['scheduled', 'completed'] },
            },
            orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
            take: 8,
            include: {
              class: { select: { id: true, name: true } },
            },
          });

    const todaySessions =
      classIds.length === 0
        ? []
        : await prisma.session.findMany({
            where: {
              classId: { in: classIds },
              sessionDate: { gte: today, lte: endOfToday },
            },
            orderBy: { startTime: 'asc' },
            include: {
              class: { select: { id: true, name: true } },
            },
          });

    return {
      profile: {
        id: teacher.id,
        fullName: teacher.fullName,
        email: teacher.email,
        phone: teacher.phone,
        center: teacher.center,
      },
      classes: teacher.classTeachers.map((ct) => ({
        classId: ct.class.id,
        className: ct.class.name,
        classroom: ct.class.classroom,
        schedule: ct.class.schedule,
        status: ct.class.status,
        studentCount: ct.class._count.enrollments,
        role: ct.role,
      })),
      upcomingSessions: upcomingSessions.map((s) => ({
        id: s.id,
        classId: s.classId,
        className: s.class.name,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        classroom: s.classroom,
        status: s.status,
      })),
      todaySessions: todaySessions.map((s) => ({
        id: s.id,
        classId: s.classId,
        className: s.class.name,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        classroom: s.classroom,
        status: s.status,
      })),
    };
  }

  async getSchedule(userId: string, weekStart: string) {
    const teacherId = await this.resolveTeacherId(userId);
    const classIds = await this.getClassIds(teacherId);

    const start = new Date(`${weekStart}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    if (classIds.length === 0) {
      return { weekStart, sessions: [] };
    }

    const sessions = await prisma.session.findMany({
      where: {
        classId: { in: classIds },
        sessionDate: { gte: start, lte: end },
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
      include: {
        class: { select: { id: true, name: true } },
      },
    });

    return {
      weekStart,
      sessions: sessions.map((s) => ({
        id: s.id,
        classId: s.classId,
        className: s.class.name,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        classroom: s.classroom,
        status: s.status,
        sessionType: s.sessionType,
      })),
    };
  }

  async getClasses(userId: string) {
    const teacherId = await this.resolveTeacherId(userId);

    const assignments = await prisma.classTeacher.findMany({
      where: { teacherId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            classroom: true,
            schedule: true,
            status: true,
            academicLevel: true,
            startDate: true,
            endDate: true,
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map((ct) => ({
      classId: ct.class.id,
      className: ct.class.name,
      classroom: ct.class.classroom,
      schedule: ct.class.schedule,
      status: ct.class.status,
      academicLevel: ct.class.academicLevel,
      startDate: ct.class.startDate,
      endDate: ct.class.endDate,
      studentCount: ct.class._count.enrollments,
      role: ct.role,
    }));
  }
}

export const teacherPortalService = new TeacherPortalService();
