import { prisma } from '../../../config/database';
import { NotFoundException } from '../../../shared/types/error.types';
import {
  MonthlyScheduleResponse,
  ScheduleSessionItem,
  TeacherScheduleResponse,
  WeeklyScheduleResponse,
} from '../types/schedule.types';

function formatSession(session: {
  id: string;
  classId: string;
  teacherId: string;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  classroom: string | null;
  sessionType: string;
  status: string;
  notes: string | null;
  class?: { id: string; name: string; centerId?: string } | null;
  teacher?: { id: string; email: string; teacher?: { fullName: string } | null } | null;
  _count?: { materials: number };
}): ScheduleSessionItem {
  return {
    id: session.id,
    classId: session.classId,
    teacherId: session.teacherId,
    sessionDate: session.sessionDate.toISOString().split('T')[0],
    startTime: session.startTime,
    endTime: session.endTime,
    classroom: session.classroom,
    sessionType: session.sessionType as ScheduleSessionItem['sessionType'],
    status: session.status as ScheduleSessionItem['status'],
    notes: session.notes,
    class: session.class
      ? { id: session.class.id, name: session.class.name, centerId: session.class.centerId }
      : undefined,
    teacher: session.teacher
      ? {
          id: session.teacher.id,
          fullName: session.teacher.teacher?.fullName ?? session.teacher.email,
          email: session.teacher.email,
        }
      : undefined,
    materialsCount: session._count?.materials,
  };
}

function parseWeekRange(weekStart: string): { start: Date; end: Date } {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function parseMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
}

export class ScheduleQueryService {
  async getWeekly(filters: {
    centerId?: string;
    teacherId?: string;
    classId?: string;
    weekStart: string;
  }): Promise<WeeklyScheduleResponse> {
    const { start, end } = parseWeekRange(filters.weekStart);

    const where: Record<string, unknown> = {
      sessionDate: { gte: start, lte: end },
    };

    if (filters.classId) {
      where.classId = filters.classId;
    }

    if (filters.teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: filters.teacherId },
        select: { userId: true },
      });
      if (!teacher?.userId) {
        throw new NotFoundException('Teacher');
      }
      where.teacherId = teacher.userId;
    }

    if (filters.centerId) {
      where.class = { centerId: filters.centerId };
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, centerId: true } },
        teacher: {
          select: {
            id: true,
            email: true,
            teacher: { select: { fullName: true } },
          },
        },
        _count: { select: { materials: true } },
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
    });

    return {
      weekStart: start.toISOString().split('T')[0],
      weekEnd: end.toISOString().split('T')[0],
      sessions: sessions.map(formatSession),
    };
  }

  async getMonthly(year: number, month: number, classId: string): Promise<MonthlyScheduleResponse> {
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true },
    });

    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const { start, end } = parseMonthRange(year, month);

    const sessions = await prisma.session.findMany({
      where: {
        classId,
        sessionDate: { gte: start, lte: end },
      },
      include: {
        class: { select: { id: true, name: true, centerId: true } },
        teacher: {
          select: {
            id: true,
            email: true,
            teacher: { select: { fullName: true } },
          },
        },
        _count: { select: { materials: true } },
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
    });

    return {
      year,
      month,
      classId: classRecord.id,
      className: classRecord.name,
      sessions: sessions.map(formatSession),
    };
  }

  async getTeacherSchedule(teacherId: string): Promise<TeacherScheduleResponse> {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, fullName: true, userId: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher');
    }

    if (!teacher.userId) {
      return { teacherId: teacher.id, teacherName: teacher.fullName, sessions: [] };
    }

    const sessions = await prisma.session.findMany({
      where: { teacherId: teacher.userId },
      include: {
        class: { select: { id: true, name: true, centerId: true } },
        teacher: {
          select: {
            id: true,
            email: true,
            teacher: { select: { fullName: true } },
          },
        },
        _count: { select: { materials: true } },
      },
      orderBy: [{ sessionDate: 'desc' }, { startTime: 'asc' }],
      take: 200,
    });

    return {
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      sessions: sessions.map(formatSession),
    };
  }
}

export const scheduleQueryService = new ScheduleQueryService();
export default scheduleQueryService;
