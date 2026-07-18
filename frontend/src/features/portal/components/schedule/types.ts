export interface StudentScheduleMaterial {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
}

export interface StudentScheduleSession {
  id: string;
  classId: string;
  className: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  classroom?: string | null;
  status: string;
  sessionType?: string;
  notes?: string | null;
  materials?: StudentScheduleMaterial[];
  hasHomework?: boolean;
}
