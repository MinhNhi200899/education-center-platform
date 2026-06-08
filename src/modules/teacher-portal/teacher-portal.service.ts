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

    // ---- Students with session counts + revenue summary ----
    let students: Array<{
      studentId: string;
      fullName: string;
      avatarUrl: string | null;
      classNames: string[];
      sessionsAttended: number;
      attendanceRate: number;
    }> = [];
    let revenue = {
      totalRevenue: 0,
      paidInvoiceCount: 0,
      unpaidAmount: 0,
      unpaidInvoiceCount: 0,
      studentCount: 0,
    };

    if (classIds.length > 0) {
      const enrollments = await prisma.enrollment.findMany({
        where: { classId: { in: classIds }, status: 'active' },
        select: {
          studentId: true,
          student: { select: { id: true, fullName: true, avatarUrl: true } },
          class: { select: { name: true } },
        },
      });

      // Dedupe students, accumulate class names
      const studentMap = new Map<
        string,
        { studentId: string; fullName: string; avatarUrl: string | null; classNames: string[] }
      >();
      for (const e of enrollments) {
        const existing = studentMap.get(e.studentId);
        if (existing) {
          if (!existing.classNames.includes(e.class.name)) {
            existing.classNames.push(e.class.name);
          }
        } else {
          studentMap.set(e.studentId, {
            studentId: e.student.id,
            fullName: e.student.fullName,
            avatarUrl: e.student.avatarUrl,
            classNames: [e.class.name],
          });
        }
      }

      const studentIds = [...studentMap.keys()];
      const totalSessionsInClasses = await prisma.session.count({
        where: { classId: { in: classIds } },
      });

      if (studentIds.length > 0) {
        const attendanceCounts = await prisma.attendanceRecord.groupBy({
          by: ['studentId'],
          where: {
            studentId: { in: studentIds },
            session: { classId: { in: classIds } },
            status: 'present',
          },
          _count: { _all: true },
        });
        const countMap = new Map(attendanceCounts.map((a) => [a.studentId, a._count._all]));

        students = [...studentMap.values()]
          .map((s) => {
            const sessionsAttended = countMap.get(s.studentId) ?? 0;
            const attendanceRate =
              totalSessionsInClasses > 0
                ? Math.round((sessionsAttended / totalSessionsInClasses) * 100)
                : 0;
            return { ...s, sessionsAttended, attendanceRate };
          })
          .sort((a, b) => b.sessionsAttended - a.sessionsAttended)
          .slice(0, 20);

        // Revenue: sum paid invoices for these students + outstanding
        const [paidAgg, unpaidAgg] = await Promise.all([
          prisma.invoice.aggregate({
            where: { studentId: { in: studentIds }, status: 'paid' },
            _sum: { totalAmount: true },
            _count: { _all: true },
          }),
          prisma.invoice.aggregate({
            where: { studentId: { in: studentIds }, status: { in: ['issued', 'overdue'] } },
            _sum: { totalAmount: true },
            _count: { _all: true },
          }),
        ]);

        revenue = {
          totalRevenue: Number(paidAgg._sum.totalAmount ?? 0),
          paidInvoiceCount: paidAgg._count._all,
          unpaidAmount: Number(unpaidAgg._sum.totalAmount ?? 0),
          unpaidInvoiceCount: unpaidAgg._count._all,
          studentCount: studentIds.length,
        };
      }
    }

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
      students,
      revenue,
    };
  }

  async getSchedule(userId: string, monthStart: string) {
    const teacherId = await this.resolveTeacherId(userId);
    const classIds = await this.getClassIds(teacherId);

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(monthStart);
    if (!match) {
      return { monthStart, monthEnd: monthStart, sessions: [] };
    }
    const y = Number(match[1]);
    const m = Number(match[2]);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0));

    if (classIds.length === 0) {
      return {
        monthStart: start.toISOString().split('T')[0],
        monthEnd: end.toISOString().split('T')[0],
        sessions: [],
      };
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
      monthStart: start.toISOString().split('T')[0],
      monthEnd: end.toISOString().split('T')[0],
      sessions: sessions.map((s) => ({
        id: s.id,
        classId: s.classId,
        className: s.class.name,
        sessionDate: s.sessionDate.toISOString().split('T')[0],
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
