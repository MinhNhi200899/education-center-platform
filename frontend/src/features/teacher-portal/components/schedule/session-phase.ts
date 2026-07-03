export type SessionPhase = 'upcoming' | 'in_progress' | 'ended' | 'cancelled';

export function sessionLocalDateTime(sessionDate: string, time: string): Date {
  const [y, m, d] = sessionDate.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export function getSessionPhase(
  session: {
    sessionDate: string;
    startTime: string;
    endTime: string;
    status?: string;
  },
  now: Date = new Date()
): SessionPhase {
  if (session.status === 'cancelled') return 'cancelled';
  const start = sessionLocalDateTime(session.sessionDate, session.startTime);
  const end = sessionLocalDateTime(session.sessionDate, session.endTime);
  if (now < start) return 'upcoming';
  if (now < end) return 'in_progress';
  return 'ended';
}

export function sessionPhaseColor(phase: SessionPhase): string {
  switch (phase) {
    case 'upcoming':
      return 'blue';
    case 'in_progress':
      return 'orange';
    case 'ended':
      return 'green';
    case 'cancelled':
      return 'gray';
  }
}

/** Distinct from phase colors (blue/orange/green) once attendance is saved */
export const ATTENDANCE_MARKED_COLOR = 'grape';

export function canDragSession(
  session: {
    sessionDate: string;
    startTime: string;
    endTime: string;
    status?: string;
  },
  now: Date = new Date()
): boolean {
  return getSessionPhase(session, now) === 'upcoming';
}
