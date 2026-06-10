import {
  Stack,
  Title,
  Text,
  Group,
  Button,
  Select,
  SegmentedControl,
  Paper,
  Badge,
  UnstyledButton,
} from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendarPlus,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Class } from '@/types';
import type { MonthlyScheduleData, WeeklyScheduleData } from '../types';
import { WeeklyScheduleGrid } from '../components/WeeklyScheduleGrid';
import { SessionDetailDrawer } from '../components/SessionDetailDrawer';
import { SessionStatusBadge } from '../components/SessionStatusBadge';

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function shiftWeek(weekStart: string, delta: number): string {
  const d = new Date(`${weekStart}T12:00:00`);
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split('T')[0];
}

export function SchedulePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [classId, setClassId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const centerId = user?.center?.id;

  const { data: classes } = useQuery({
    queryKey: ['classes', 'schedule'],
    queryFn: async () => {
      const res = await api.get('/classes?limit=100&status=active');
      return res.data.data as Class[];
    },
  });

  const activeClassId = classId ?? classes?.[0]?.id ?? null;

  const { data: weekly, refetch: refetchWeekly } = useQuery({
    queryKey: ['schedule-weekly', centerId, activeClassId, weekStart],
    queryFn: async () => {
      const params = new URLSearchParams({ weekStart });
      if (centerId) params.set('centerId', centerId);
      if (activeClassId) params.set('classId', activeClassId);
      const res = await api.get(`/schedule/weekly?${params}`);
      return res.data.data as WeeklyScheduleData;
    },
    enabled: view === 'weekly' && !!weekStart,
  });

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth() + 1;

  const { data: monthly, refetch: refetchMonthly } = useQuery({
    queryKey: ['schedule-monthly', activeClassId, year, month],
    queryFn: async () => {
      const res = await api.get(
        `/schedule/monthly?year=${year}&month=${month}&classId=${activeClassId}`
      );
      return res.data.data as MonthlyScheduleData;
    },
    enabled: view === 'monthly' && !!activeClassId,
  });

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, typeof monthly extends undefined ? never : NonNullable<typeof monthly>['sessions']>();
    monthly?.sessions.forEach((s) => {
      const list = map.get(s.sessionDate) ?? [];
      list.push(s);
      map.set(s.sessionDate, list);
    });
    return map;
  }, [monthly]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!activeClassId) return;
      await api.post(`/classes/${activeClassId}/sessions/generate`, { year, month });
    },
    onSuccess: () => {
      notifications.show({
        title: t('schedule.messages.generatedTitle'),
        message: t('schedule.messages.generatedMessage'),
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['schedule-weekly'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-monthly'] });
      refetchWeekly();
      refetchMonthly();
    },
    onError: () => {
      notifications.show({
        title: t('schedule.messages.failedTitle'),
        message: t('schedule.messages.failedMessage'),
        color: 'red',
      });
    },
  });

  const openSession = (id: string) => {
    setSelectedSessionId(id);
    setDrawerOpen(true);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>{t('schedule.title')}</Title>
          <Text c="dimmed" size="sm">
            {t('schedule.subtitle')}
          </Text>
        </div>
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as 'weekly' | 'monthly')}
          data={[
            { label: t('schedule.viewWeekly'), value: 'weekly' },
            { label: t('schedule.viewMonthly'), value: 'monthly' },
          ]}
        />
      </Group>

      <Group>
        <Select
          label={t('schedule.selectClass')}
          placeholder={t('schedule.selectClassPlaceholder')}
          data={(classes ?? []).map((c) => ({ value: c.id, label: c.name }))}
          value={activeClassId}
          onChange={(v) => setClassId(v)}
          w={280}
          searchable
        />
        <Button
          leftSection={<IconCalendarPlus size={16} />}
          variant="light"
          mt={24}
          onClick={() => generateMutation.mutate()}
          loading={generateMutation.isPending}
          disabled={!activeClassId}
        >
          {t('schedule.generateMonth')}
        </Button>
      </Group>

      {view === 'weekly' && (
        <Stack gap="md">
          <Group>
            <Button
              variant="subtle"
              onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
              leftSection={<IconChevronLeft size={16} />}
            >
              {t('schedule.weekPrev')}
            </Button>
            <Text fw={500}>
              {weekly?.weekStart} → {weekly?.weekEnd}
            </Text>
            <Button
              variant="subtle"
              onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
              rightSection={<IconChevronRight size={16} />}
            >
              {t('schedule.weekNext')}
            </Button>
            <Button variant="default" size="xs" onClick={() => setWeekStart(getMonday(new Date()))}>
              {t('schedule.thisWeek')}
            </Button>
          </Group>

          {weekly && (
            <WeeklyScheduleGrid
              weekStart={weekly.weekStart}
              sessions={weekly.sessions}
              onSelectSession={openSession}
            />
          )}
        </Stack>
      )}

      {view === 'monthly' && activeClassId && (
        <Group align="flex-start" grow preventGrowOverflow={false}>
          <Paper withBorder p="md" radius="md">
            <Calendar
              date={calendarMonth}
              onDateChange={setCalendarMonth}
              renderDay={(date) => {
                const key = dayjs(date).format('YYYY-MM-DD');
                const count = sessionsByDate.get(key)?.length ?? 0;
                const day = date.getDate();
                return (
                  <Stack gap={2} align="center" w="100%">
                    <Text size="sm">{day}</Text>
                    {count > 0 && (
                      <Badge size="xs" circle color="teal">
                        {count}
                      </Badge>
                    )}
                  </Stack>
                );
              }}
              getDayProps={(date) => {
                const key = dayjs(date).format('YYYY-MM-DD');
                const first = sessionsByDate.get(key)?.[0];
                const has = !!first;
                return {
                  ...(has ? { style: { backgroundColor: 'var(--mantine-color-teal-0)' } } : {}),
                  onClick: () => {
                    if (first) openSession(first.id);
                  },
                };
              }}
            />
          </Paper>

          <Stack gap="sm" maw={400}>
            <Text fw={600}>
              {monthly?.className ? t('schedule.monthlyClassLabel', { name: monthly.className, month, year }) : ''}
            </Text>
            {!monthly?.sessions.length ? (
              <Text c="dimmed" size="sm">
                {t('schedule.monthlyEmpty')}
              </Text>
            ) : (
              monthly.sessions.map((s) => (
                <UnstyledButton
                  key={s.id}
                  onClick={() => openSession(s.id)}
                  style={{
                    border: '1px solid var(--mantine-color-gray-3)',
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <Group justify="space-between">
                    <div>
                      <Text size="sm" fw={500}>
                        {s.sessionDate} · {s.startTime}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {s.classroom ?? '—'}
                      </Text>
                    </div>
                    <SessionStatusBadge status={s.status} />
                  </Group>
                </UnstyledButton>
              ))
            )}
          </Stack>
        </Group>
      )}

      <SessionDetailDrawer
        sessionId={selectedSessionId}
        opened={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedSessionId(null);
        }}
      />
    </Stack>
  );
}
