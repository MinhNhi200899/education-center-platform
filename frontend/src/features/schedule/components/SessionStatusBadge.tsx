import { Badge } from '@mantine/core';
import type { SessionStatus } from '../types';

const config: Record<SessionStatus, { label: string; color: string }> = {
  scheduled: { label: 'Đã lên lịch', color: 'blue' },
  completed: { label: 'Đã dạy', color: 'green' },
  cancelled: { label: 'Đã hủy', color: 'red' },
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const c = config[status] ?? config.scheduled;
  return (
    <Badge color={c.color} variant="light" size="sm">
      {c.label}
    </Badge>
  );
}
