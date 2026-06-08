export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 21;
export const HOUR_HEIGHT_PX = 52;

export interface TeacherScheduleSession {
  id: string;
  classId: string;
  className: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  classroom?: string | null;
  status: string;
  sessionType?: string;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function sessionDurationMinutes(startTime: string, endTime: string): number {
  return Math.max(timeToMinutes(endTime) - timeToMinutes(startTime), 30);
}

export function sessionTopPx(startTime: string): number {
  const minutesFromStart = timeToMinutes(startTime) - GRID_START_HOUR * 60;
  return (minutesFromStart / 60) * HOUR_HEIGHT_PX;
}

export function sessionHeightPx(startTime: string, endTime: string): number {
  return (sessionDurationMinutes(startTime, endTime) / 60) * HOUR_HEIGHT_PX;
}

export function gridTotalHeightPx(): number {
  return (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT_PX;
}

export function hourLabels(): number[] {
  const labels: number[] = [];
  for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) labels.push(h);
  return labels;
}
