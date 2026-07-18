import { Stack, Title, Text, Paper, Loader, Center } from '@mantine/core';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import {
  getDaysInWeek,
  getWeekStart,
  monthsCoveringWeek,
  shiftWeek,
} from '@/features/teacher-portal/components/schedule/schedule-utils';
import { StudentMonthlyTimeGrid } from '../components/schedule/StudentMonthlyTimeGrid';
import { SessionHomeworkModal } from '../components/schedule/SessionHomeworkModal';
import type { StudentScheduleSession } from '../components/schedule/types';

export function StudentSchedulePage() {
  const { t } = useTranslation();
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [selected, setSelected] = useState<StudentScheduleSession | null>(null);

  const months = useMemo(() => monthsCoveringWeek(weekStart), [weekStart]);
  const weekDays = useMemo(() => getDaysInWeek(weekStart), [weekStart]);

  const scheduleQueries = useQueries({
    queries: months.map((monthStart) => ({
      queryKey: ['portal-schedule', monthStart],
      queryFn: async () => {
        const res = await api.get(`/portal/schedule?monthStart=${monthStart}`);
        return res.data.data as {
          monthStart: string;
          monthEnd: string;
          sessions: StudentScheduleSession[];
        };
      },
    })),
  });

  const isLoading = scheduleQueries.some((q) => q.isLoading);
  const scheduleDataA = scheduleQueries[0]?.data;
  const scheduleDataB = scheduleQueries[1]?.data;

  const sessions = useMemo(() => {
    const byId = new Map<string, StudentScheduleSession>();
    for (const data of [scheduleDataA, scheduleDataB]) {
      for (const s of data?.sessions ?? []) {
        byId.set(s.id, s);
      }
    }
    return [...byId.values()];
  }, [scheduleDataA, scheduleDataB]);

  const weekSessions = sessions.filter((s) => weekDays.includes(s.sessionDate));

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t('portal.student.schedule.title')}</Title>
        <Text c="dimmed" size="sm">
          {t('portal.student.schedule.subtitle')}
        </Text>
        <Text c="dimmed" size="xs" mt={4}>
          {t('portal.student.schedule.clickHint')}
        </Text>
      </div>

      <Paper withBorder p="md" radius="md">
        {isLoading ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : (
          <StudentMonthlyTimeGrid
            weekStart={weekStart}
            sessions={sessions}
            onSelectSession={setSelected}
            onPrevWeek={() => setWeekStart((w) => shiftWeek(w, -1))}
            onNextWeek={() => setWeekStart((w) => shiftWeek(w, 1))}
            onWeekSelect={setWeekStart}
          />
        )}
        {!isLoading && weekSessions.length === 0 && (
          <Text c="dimmed" size="sm" ta="center" mt="md">
            {t('portal.student.schedule.empty')}
          </Text>
        )}
      </Paper>

      <SessionHomeworkModal
        session={selected}
        opened={!!selected}
        onClose={() => setSelected(null)}
      />
    </Stack>
  );
}
