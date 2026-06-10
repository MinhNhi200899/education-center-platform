import { Stack, Title, Text, Paper, Group, Button, Badge } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function shiftWeek(weekStart: string, delta: number): string {
  return dayjs(`${weekStart}T12:00:00`).add(delta * 7, 'day').format('YYYY-MM-DD');
}

export function StudentSchedulePage() {
  const { t } = useTranslation();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const { data, isLoading } = useQuery({
    queryKey: ['portal-schedule', weekStart],
    queryFn: async () => {
      const res = await api.get(`/portal/schedule?weekStart=${weekStart}`);
      return res.data.data;
    },
  });

  const weekLabel = `${dayjs(weekStart).format('DD/MM')} – ${dayjs(weekStart).add(6, 'day').format('DD/MM/YYYY')}`;

  return (
    <Stack gap="lg">
      <Title order={2}>{t('portal.student.schedule.title')}</Title>
      <Text c="dimmed" size="sm">
        {t('portal.student.schedule.subtitle')}
      </Text>

      <Group>
        <Button
          variant="default"
          leftSection={<IconChevronLeft size={16} />}
          onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
        >
          {t('portal.student.schedule.prev')}
        </Button>
        <Text fw={500}>{weekLabel}</Text>
        <Button
          variant="default"
          rightSection={<IconChevronRight size={16} />}
          onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
        >
          {t('portal.student.schedule.next')}
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md">
        {isLoading ? (
          <Text c="dimmed">{t('portal.student.schedule.loading')}</Text>
        ) : (data?.sessions?.length ?? 0) === 0 ? (
          <Text c="dimmed">{t('portal.student.schedule.empty')}</Text>
        ) : (
          <Stack gap="sm">
            {data.sessions.map((s: {
              id: string;
              className: string;
              sessionDate: string;
              startTime: string;
              endTime: string;
              classroom?: string;
              status: string;
            }) => (
              <Group key={s.id} justify="space-between" align="flex-start">
                <div>
                  <Text fw={600}>{s.className}</Text>
                  <Text size="sm" c="dimmed">
                    {dayjs(s.sessionDate).format('dddd, DD/MM/YYYY')} · {s.startTime}–{s.endTime}
                  </Text>
                  {s.classroom && (
                    <Text size="sm" c="dimmed">
                      {t('portal.student.schedule.room', { room: s.classroom })}
                    </Text>
                  )}
                </div>
                <Badge variant="light">{s.status}</Badge>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
