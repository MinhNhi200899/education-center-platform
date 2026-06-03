import { SessionStatus, SessionType } from '@prisma/client';

export interface ScheduleSessionItem {
  id: string;
  classId: string;
  teacherId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  classroom?: string | null;
  sessionType: SessionType;
  status: SessionStatus;
  notes?: string | null;
  class?: { id: string; name: string; centerId?: string };
  teacher?: { id: string; fullName: string; email?: string };
  materialsCount?: number;
}

export interface WeeklyScheduleResponse {
  weekStart: string;
  weekEnd: string;
  sessions: ScheduleSessionItem[];
}

export interface MonthlyScheduleResponse {
  year: number;
  month: number;
  classId: string;
  className: string;
  sessions: ScheduleSessionItem[];
}

export interface TeacherScheduleResponse {
  teacherId: string;
  teacherName: string;
  sessions: ScheduleSessionItem[];
}
