export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

export interface ScheduleSession {
  id: string;
  classId: string;
  teacherId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  classroom?: string | null;
  sessionType: string;
  status: SessionStatus;
  notes?: string | null;
  class?: { id: string; name: string; centerId?: string };
  teacher?: { id: string; fullName: string; email?: string };
  materialsCount?: number;
}

export interface WeeklyScheduleData {
  weekStart: string;
  weekEnd: string;
  sessions: ScheduleSession[];
}

export interface MonthlyScheduleData {
  year: number;
  month: number;
  classId: string;
  className: string;
  sessions: ScheduleSession[];
}

export interface SessionDetail {
  id: string;
  classId: string;
  teacherId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  classroom?: string | null;
  sessionType: string;
  status: SessionStatus;
  notes?: string | null;
  class?: { id: string; name: string };
  teacher?: { id: string; fullName: string; email?: string };
  materials: Array<{
    id: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    isGoogleDrive?: boolean;
  }>;
  googleDriveFolderId?: string | null;
}
