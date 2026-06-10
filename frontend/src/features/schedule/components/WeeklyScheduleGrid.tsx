import { Paper, Text, Stack, Badge, UnstyledButton, SimpleGrid } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ScheduleSession } from '../types';
import { SessionStatusBadge } from './SessionStatusBadge';

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
  const { t } = useTranslation();
  const dayKeys: Array<{ i18n: string; date: Date }> = [
    { i18n: 'common.monday', date: new Date(`${addDays(weekStart, 0)}T12:00:00`) },
    { i18n: 'common.tuesday', date: new Date(`${addDays(weekStart, 1)}T12:00:00`) },
    { i18n: 'common.wednesday', date: new Date(`${addDays(weekStart, 2)}T12:00:00`) },
    { i18n: 'common.thursday', date: new Date(`${addDays(weekStart, 3)}T12:00:00`) },
    { i18n: 'common.friday', date: new Date(`${addDays(weekStart, 4)}T12:00:00`) },
    { i18n: 'common.saturday', date: new Date(`${addDays(weekStart, 5)}T12:00:00`) },
    { i18n: 'common.sunday', date: new Date(`${addDays(weekStart, 6)}T12:00:00`) },
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4, lg: 7 }} spacing="sm">
      {dayKeys.map((d, i) => {
        const dayDate = d.date.toISOString().split('T')[0];
        const daySessions = sessions.filter((s) => s.sessionDate === dayDate);
        return (
          <Paper key={i} withBorder p="sm" radius="md" mih={140}>
            <GroupHeader label={t(d.i18n)} date={dayDate} count={daySessions.length} />
            <Stack gap={6} mt="xs">
              {daySessions.length === 0 ? (
                <Text size="xs" c="dimmed">
                  {t('schedule.weeklyGrid.noSession')}
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
                      {s.class?.name ?? t('classes.list.title')}
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
  const { t } = useTranslation();
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
          {t('schedule.weeklyGrid.sessions', { count })}
        </Badge>
      )}
    </Stack>
  );
}
