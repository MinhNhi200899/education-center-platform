import { Paper, Text, Stack, Badge, UnstyledButton, SimpleGrid } from '@mantine/core';
import type { ScheduleSession } from '../types';
import { SessionStatusBadge } from './SessionStatusBadge';

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

interface Props {
  weekStart: string;
  sessions: ScheduleSession[];
  onSelectSession: (id: string) => void;
}

export function WeeklyScheduleGrid({ weekStart, sessions, onSelectSession }: Props) {
  const days = DAY_LABELS.map((label, i) => ({
    label,
    date: addDays(weekStart, i),
  }));

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4, lg: 7 }} spacing="sm">
      {days.map((day) => {
        const daySessions = sessions.filter((s) => s.sessionDate === day.date);
        return (
          <Paper key={day.date} withBorder p="sm" radius="md" mih={140}>
            <GroupHeader label={day.label} date={day.date} count={daySessions.length} />
            <Stack gap={6} mt="xs">
              {daySessions.length === 0 ? (
                <Text size="xs" c="dimmed">
                  Không có buổi
                </Text>
              ) : (
                daySessions.map((s) => (
                  <UnstyledButton
                    key={s.id}
                    onClick={() => onSelectSession(s.id)}
                    style={{
                      border: '1px solid var(--mantine-color-gray-3)',
                      borderRadius: 8,
                      padding: 8,
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    <Text size="xs" fw={600} lineClamp={1}>
                      {s.class?.name ?? 'Lớp'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {s.startTime}–{s.endTime}
                    </Text>
                    <SessionStatusBadge status={s.status} />
                  </UnstyledButton>
                ))
              )}
            </Stack>
          </Paper>
        );
      })}
    </SimpleGrid>
  );
}

function GroupHeader({
  label,
  date,
  count,
}: {
  label: string;
  date: string;
  count: number;
}) {
  return (
    <Stack gap={2}>
      <Text fw={700} size="sm">
        {label}
      </Text>
      <Text size="xs" c="dimmed">
        {date.slice(5).replace('-', '/')}
      </Text>
      {count > 0 && (
        <Badge size="xs" variant="outline">
          {count} buổi
        </Badge>
      )}
    </Stack>
  );
}
