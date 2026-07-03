import { BadRequestException, ConflictException } from '../types/error.types';

export type SessionPhase = 'upcoming' | 'in_progress' | 'ended' | 'cancelled';

export function sessionLocalDateTime(sessionDate: Date | string, time: string): Date {
  const iso =
    sessionDate instanceof Date
      ? `${sessionDate.getUTCFullYear()}-${String(sessionDate.getUTCMonth() + 1).padStart(2, '0')}-${String(sessionDate.getUTCDate()).padStart(2, '0')}`
      : String(sessionDate).slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export function getSessionPhase(
  session: {
    sessionDate: Date | string;
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

export function assertSessionAllowsHomework(
  session: { sessionDate: Date | string; startTime: string; endTime: string; status?: string },
  now: Date = new Date()
): void {
  const phase = getSessionPhase(session, now);
  if (phase === 'cancelled') {
    throw new BadRequestException('Cannot assign homework to a cancelled session');
  }
  if (phase !== 'upcoming') {
    throw new BadRequestException(
      'Homework can only be assigned before the session starts'
    );
  }
}

export function assertSessionAllowsAttendance(
  session: { sessionDate: Date | string; startTime: string; endTime: string; status?: string },
  now: Date = new Date()
): void {
  const phase = getSessionPhase(session, now);
  if (phase === 'cancelled') {
    throw new BadRequestException('Cannot mark attendance for a cancelled session');
  }
  if (phase === 'upcoming') {
    throw new BadRequestException(
      'Attendance can only be marked after the session has started'
    );
  }
}

export function assertSessionAllowsReschedule(
  session: { sessionDate: Date | string; startTime: string; endTime: string; status?: string },
  attendanceCount: number,
  now: Date = new Date()
): void {
  if (session.status === 'cancelled') {
    throw new BadRequestException('Cannot reschedule a cancelled session');
  }
  if (attendanceCount > 0) {
    throw new ConflictException(
      'Cannot reschedule session with attendance records.',
      'SESSION_HAS_ATTENDANCE'
    );
  }
  const phase = getSessionPhase(session, now);
  if (phase !== 'upcoming') {
    throw new ConflictException('Only upcoming sessions can be rescheduled.', 'SESSION_NOT_UPCOMING');
  }
}
