import api from '@/lib/api';
import type { AttendanceStatus } from '@/types';

const QUEUE_KEY = 'attendance_offline_queue';

export interface PendingAttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  status: AttendanceStatus;
  reason?: string;
  createdAt: string;
}

function readQueue(): PendingAttendanceRecord[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingAttendanceRecord[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getPendingCount(): number {
  return readQueue().length;
}

export function queueAttendanceRecord(
  record: Omit<PendingAttendanceRecord, 'id' | 'createdAt'>
) {
  const queue = readQueue();
  const duplicateIndex = queue.findIndex(
    (q) => q.studentId === record.studentId && q.sessionId === record.sessionId
  );

  const entry: PendingAttendanceRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  if (duplicateIndex >= 0) {
    queue[duplicateIndex] = entry;
  } else {
    queue.push(entry);
  }

  writeQueue(queue);
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export async function syncOfflineQueue(): Promise<{
  synced: number;
  failed: number;
}> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const queue = readQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const response = await api.post('/attendance/sync', {
    records: queue.map(({ studentId, sessionId, status, reason }) => ({
      studentId,
      sessionId,
      status,
      reason,
    })),
  });

  const { synced, failed } = response.data.data;
  if (synced > 0 && failed === 0) {
    clearQueue();
  } else if (synced > 0) {
    writeQueue(queue.slice(synced));
  }

  return { synced, failed };
}
