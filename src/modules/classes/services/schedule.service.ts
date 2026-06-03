import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import { NotFoundException, BadRequestException } from '../../../shared/types/error.types';
import { WeeklySchedule } from '../types/class.types';

export class ScheduleService {
  /**
   * Validate schedule for conflicts
   */
  async validateSchedule(
    schedule: WeeklySchedule
  ): Promise<{ valid: boolean; conflicts: string[] }> {
    const conflicts: string[] = [];

    // Check for empty schedule
    const hasSlots = Object.values(schedule).some((day) => day.length > 0);
    if (!hasSlots) {
      conflicts.push('Schedule cannot be empty');
    }

    // Validate time slots for each day
    for (const [day, slots] of Object.entries(schedule)) {
      // Validate individual time slots
      for (const slot of slots) {
        if (slot.startTime >= slot.endTime) {
          conflicts.push(`${day}: Start time must be before end time`);
        }

        // Validate time format (HH:MM)
        if (!this.isValidTimeFormat(slot.startTime) || !this.isValidTimeFormat(slot.endTime)) {
          conflicts.push(`${day}: Invalid time format (expected HH:MM)`);
        }
      }

      // Check for overlapping slots in the same day
      const sortedSlots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < sortedSlots.length - 1; i++) {
        const current = sortedSlots[i];
        const next = sortedSlots[i + 1];
        if (current.endTime > next.startTime) {
          conflicts.push(`${day}: Overlapping time slots detected`);
        }
      }
    }

    return { valid: conflicts.length === 0, conflicts };
  }

  /**
   * Check for schedule conflicts with existing classes for a teacher
   */
  async checkTeacherScheduleConflicts(
    teacherId: string,
    schedule: WeeklySchedule,
    excludeClassId?: string
  ): Promise<{ hasConflicts: boolean; conflicts: Array<{ day: string; time: string; classId: string; className: string }> }> {
    const conflicts: Array<{ day: string; time: string; classId: string; className: string }> = [];

    // Get all classes for this teacher (excluding the current class if updating)
    const teacherAssignments = await prisma.classTeacher.findMany({
      where: {
        teacherId,
        ...(excludeClassId ? { classId: { not: excludeClassId } } : {}),
      },
      include: {
        class: {
          select: { id: true, name: true, schedule: true, status: true },
        },
      },
    });

    // Check each day of the week
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

    for (const day of days) {
      const newSlots = schedule[day] || [];

      for (const newSlot of newSlots) {
        // Check against each class the teacher is assigned to
        for (const assignment of teacherAssignments) {
          const classSchedule = assignment.class.schedule as WeeklySchedule;
          const existingSlots = classSchedule[day] || [];

          for (const existingSlot of existingSlots) {
            // Check for time overlap
            if (
              newSlot.startTime < existingSlot.endTime &&
              existingSlot.startTime < newSlot.endTime
            ) {
              conflicts.push({
                day,
                time: `${newSlot.startTime}-${newSlot.endTime}`,
                classId: assignment.class.id,
                className: assignment.class.name,
              });
            }
          }
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Check for classroom conflicts
   */
  async checkClassroomConflicts(
    classroom: string,
    schedule: WeeklySchedule,
    centerId: string,
    excludeClassId?: string
  ): Promise<{ hasConflicts: boolean; conflicts: Array<{ day: string; time: string; classId: string; className: string }> }> {
    const conflicts: Array<{ day: string; time: string; classId: string; className: string }> = [];

    // Find all classes in the same center using the same classroom
    const classesInRoom = await prisma.class.findMany({
      where: {
        centerId,
        classroom,
        ...(excludeClassId ? { id: { not: excludeClassId } } : {}),
        status: { in: ['active', 'inactive'] },
      },
      select: { id: true, name: true, schedule: true },
    });

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

    for (const day of days) {
      const newSlots = schedule[day] || [];

      for (const newSlot of newSlots) {
        for (const classRecord of classesInRoom) {
          const classSchedule = classRecord.schedule as WeeklySchedule;
          const existingSlots = classSchedule[day] || [];

          for (const existingSlot of existingSlots) {
            if (
              newSlot.startTime < existingSlot.endTime &&
              existingSlot.startTime < newSlot.endTime
            ) {
              conflicts.push({
                day,
                time: `${newSlot.startTime}-${newSlot.endTime}`,
                classId: classRecord.id,
                className: classRecord.name,
              });
            }
          }
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Detect all schedule conflicts (teacher and classroom)
   */
  async detectConflicts(
    schedule: WeeklySchedule,
    centerId: string,
    teacherId: string,
    classroom: string | null,
    excludeClassId?: string
  ): Promise<{
    valid: boolean;
    teacherConflicts: Array<{ day: string; time: string; classId: string; className: string }>;
    classroomConflicts: Array<{ day: string; time: string; classId: string; className: string }>;
  }> {
    const teacherCheck = await this.checkTeacherScheduleConflicts(teacherId, schedule, excludeClassId);

    let classroomCheck = { hasConflicts: false, conflicts: [] as any[] };
    if (classroom) {
      classroomCheck = await this.checkClassroomConflicts(classroom, schedule, centerId, excludeClassId);
    }

    return {
      valid: !teacherCheck.hasConflicts && !classroomCheck.hasConflicts,
      teacherConflicts: teacherCheck.conflicts,
      classroomConflicts: classroomCheck.conflicts,
    };
  }

  /**
   * Update class schedule
   */
  async updateSchedule(classId: string, schedule: WeeklySchedule): Promise<void> {
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    await prisma.class.update({
      where: { id: classId },
      data: { schedule: schedule as any },
    });

    logger.info('Class schedule updated', { classId });
  }

  /**
   * Generate sessions from schedule for a date range
   */
  async generateSessions(
    classId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ generated: number; sessionDates: Date[] }> {
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const schedule = classRecord.schedule as WeeklySchedule;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const sessionDates: Date[] = [];
    const currentDate = new Date(startDate);

    // Find all dates that match the schedule days
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dayName = days.find((d) => dayMap[d] === dayOfWeek);

      if (dayName && schedule[dayName] && schedule[dayName].length > 0) {
        sessionDates.push(new Date(currentDate));
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get existing sessions to avoid duplicates
    const existingSessions = await prisma.session.findMany({
      where: {
        classId,
        sessionDate: { gte: startDate, lte: endDate },
      },
      select: { sessionDate: true },
    });

    const existingDates = new Set(existingSessions.map((s) => s.sessionDate.toISOString().split('T')[0]));
    const newDates = sessionDates.filter((d) => !existingDates.has(d.toISOString().split('T')[0]));

    let createdCount = 0;

    if (newDates.length > 0) {
      const primaryTeacher = await prisma.classTeacher.findFirst({
        where: { classId, role: 'primary' },
        include: { teacher: true },
      });

      if (!primaryTeacher?.teacher?.userId) {
        throw new BadRequestException(
          'Assign a primary teacher with a linked user account before generating sessions'
        );
      }

      const teacherUserId = primaryTeacher.teacher.userId;

      const sessionData = newDates.flatMap((date) => {
        const dayName = days.find((d) => dayMap[d] === date.getDay())!;
        const slots = schedule[dayName] || [];

        return slots.map((slot) => ({
          classId,
          teacherId: teacherUserId,
          sessionDate: date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          classroom: slot.room || classRecord.classroom,
          sessionType: 'regular' as const,
          status: 'scheduled' as const,
        }));
      });

      if (sessionData.length > 0) {
        await prisma.session.createMany({ data: sessionData as any });
        createdCount = sessionData.length;
      }
    }

    logger.info('Sessions generated', { classId, generated: createdCount });

    return { generated: createdCount, sessionDates: newDates };
  }

  /**
   * Check capacity availability
   */
  async checkCapacity(classId: string, additionalStudents: number = 0): Promise<{
    available: boolean;
    currentEnrollment: number;
    capacity: number;
    availableSlots: number;
  }> {
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { enrollments: { where: { status: 'active' } } } } },
    });

    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const currentEnrollment = classRecord._count.enrollments;
    const availableSlots = classRecord.capacity - currentEnrollment;

    return {
      available: availableSlots >= additionalStudents,
      currentEnrollment,
      capacity: classRecord.capacity,
      availableSlots,
    };
  }

  /**
   * Validate time format (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
  }
}

export const scheduleService = new ScheduleService();
export default scheduleService;