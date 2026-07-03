export const GRID_START_HOUR = 9;
export const GRID_END_HOUR = 24;
export const HOUR_HEIGHT_PX = 48;
export const SLOT_MINUTES = 30;

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
  attendanceMarked?: boolean;
}

export function getMonthStart(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

export function shiftMonth(monthStart: string, delta: number): string {
  const [y, m] = monthStart.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return getMonthStart(d);
}

export function getDaysInMonth(monthStart: string): string[] {
  const [y, m] = monthStart.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const days: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

export function formatMonthLabel(monthStart: string): string {
  const [y, m] = monthStart.split('-').map(Number);
  return `${String(m).padStart(2, '0')}/${y}`;
}

export function dayOfWeekKey(date: string): string {
  const day = new Date(`${date}T12:00:00`).getDay();
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return `common.${keys[day]}`;
}

export function isWeekend(date: string): boolean {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 || day === 6;
}

export function getTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isToday(date: string): boolean {
  return date === getTodayIso();
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
  const clamped = Math.max(GRID_START_HOUR * 60, Math.min(minutes, GRID_END_HOUR * 60));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function sessionDurationMinutes(startTime: string, endTime: string): number {
  return Math.max(timeToMinutes(endTime) - timeToMinutes(startTime), SLOT_MINUTES);
}

export function sessionTopPx(startTime: string): number {
  const minutesFromStart = timeToMinutes(startTime) - GRID_START_HOUR * 60;
  return (minutesFromStart / SLOT_MINUTES) * slotHeightPx();
}

export function sessionHeightPx(startTime: string, endTime: string): number {
  return (sessionDurationMinutes(startTime, endTime) / SLOT_MINUTES) * slotHeightPx();
}

export function slotHeightPx(): number {
  return HOUR_HEIGHT_PX / (60 / SLOT_MINUTES);
}

export function gridTotalHeightPx(): number {
  return ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES * slotHeightPx();
}

export function hourLabels(): number[] {
  const labels: number[] = [];
  for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) labels.push(h);
  return labels;
}

export function buildSlotId(date: string, startMinutes: number): string {
  return `slot-${date}-${startMinutes}`;
}

export function parseSlotId(id: string): { date: string; startMinutes: number } | null {
  const match = /^slot-(\d{4}-\d{2}-\d{2})-(\d+)$/.exec(id);
  if (!match) return null;
  return { date: match[1], startMinutes: Number(match[2]) };
}

export function slotMinutesList(): number[] {
  const slots: number[] = [];
  for (let m = GRID_START_HOUR * 60; m < GRID_END_HOUR * 60; m += SLOT_MINUTES) {
    slots.push(m);
  }
  return slots;
}

export function computeMoveFromSlot(
  session: TeacherScheduleSession,
  date: string,
  startMinutes: number
): { sessionDate: string; startTime: string; endTime: string } {
  const duration = sessionDurationMinutes(session.startTime, session.endTime);
  const maxStart = GRID_END_HOUR * 60 - duration;
  const snapped = Math.min(Math.max(startMinutes, GRID_START_HOUR * 60), maxStart);
  const startTime = minutesToTime(snapped);
  const endTime = minutesToTime(snapped + duration);
  return { sessionDate: date, startTime, endTime };
}

export function isSameSlot(
  session: TeacherScheduleSession,
  date: string,
  startTime: string,
  endTime: string
): boolean {
  return (
    session.sessionDate === date &&
    session.startTime === startTime &&
    session.endTime === endTime
  );
}
