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
  studentNames?: string[];
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

/** Sunday-start week containing the given date (local). */
export function getWeekStart(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return toIsoLocal(d);
}

export function getDaysInWeek(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function shiftWeek(weekStart: string, deltaWeeks: number): string {
  return addDays(weekStart, deltaWeeks * 7);
}

export function formatWeekLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const [y1, m1, d1] = weekStart.split('-');
  const [y2, m2, d2] = end.split('-');
  if (y1 === y2 && m1 === m2) {
    return `${d1}/${m1} – ${d2}/${m2}/${y2}`;
  }
  if (y1 === y2) {
    return `${d1}/${m1} – ${d2}/${m2}/${y2}`;
  }
  return `${d1}/${m1}/${y1} – ${d2}/${m2}/${y2}`;
}

/** Months that cover a week (1 or 2 values) for schedule API fetches. */
export function monthsCoveringWeek(weekStart: string): string[] {
  const startMonth = getMonthStart(new Date(`${weekStart}T12:00:00`));
  const endMonth = getMonthStart(new Date(`${addDays(weekStart, 6)}T12:00:00`));
  return startMonth === endMonth ? [startMonth] : [startMonth, endMonth];
}

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  return toIsoLocal(new Date());
}

export function isToday(date: string): boolean {
  return date === getTodayIso();
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoLocal(d);
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

/** Default duration when clicking a single empty slot (matches form default 09:00–10:30). */
export const DEFAULT_CREATE_DURATION_MINUTES = 90;

export interface CreateSlotDraft {
  date: string;
  startTime: string;
  endTime: string;
}

/** Map Y offset within a day column's time grid to a snapped slot start (minutes from midnight). */
export function yOffsetToSlotMinutes(offsetY: number): number {
  const slotH = slotHeightPx();
  const slotIndex = Math.floor(Math.max(0, offsetY) / slotH);
  const minutes = GRID_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  const maxStart = GRID_END_HOUR * 60 - SLOT_MINUTES;
  return Math.min(Math.max(minutes, GRID_START_HOUR * 60), maxStart);
}

/**
 * Resolve create range from pointer selection.
 * Same slot (click) → default 90 minutes; drag across slots → inclusive range (min 30 min).
 */
export function resolveCreateSlotRange(
  anchorMinutes: number,
  currentMinutes: number
): { startTime: string; endTime: string } {
  if (anchorMinutes === currentMinutes) {
    const start = anchorMinutes;
    const end = Math.min(start + DEFAULT_CREATE_DURATION_MINUTES, GRID_END_HOUR * 60);
    return { startTime: minutesToTime(start), endTime: minutesToTime(end) };
  }
  const start = Math.min(anchorMinutes, currentMinutes);
  const end = Math.min(
    Math.max(anchorMinutes, currentMinutes) + SLOT_MINUTES,
    GRID_END_HOUR * 60
  );
  return { startTime: minutesToTime(start), endTime: minutesToTime(end) };
}
