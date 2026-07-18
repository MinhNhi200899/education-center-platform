import { Stack, Title, Text, Paper, Loader, Center } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import {
  getMonthStart,
  shiftMonth,
} from '@/features/teacher-portal/components/schedule/schedule-utils';
import { StudentMonthlyTimeGrid } from '../components/schedule/StudentMonthlyTimeGrid';
import { SessionHomeworkModal } from '../components/schedule/SessionHomeworkModal';
import type { StudentScheduleSession } from '../components/schedule/types';

export function StudentSchedulePage() {
  const { t } = useTranslation();
  const [monthStart, setMonthStart] = useState(() => getMonthStart());
  const [selected, setSelected] = useState<StudentScheduleSession | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['portal-schedule', monthStart],
    queryFn: async () => {
      const res = await api.get(`/portal/schedule?monthStart=${monthStart}`);
      return res.data.data as {
        monthStart: string;
        monthEnd: string;
        sessions: StudentScheduleSession[];
      };
    },
  });

  const sessions = data?.sessions ?? [];

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
            monthStart={monthStart}
            sessions={sessions}
            onSelectSession={setSelected}
            onPrevMonth={() => setMonthStart((m) => shiftMonth(m, -1))}
            onNextMonth={() => setMonthStart((m) => shiftMonth(m, 1))}
            onMonthSelect={setMonthStart}
          />
        )}
        {!isLoading && sessions.length === 0 && (
          <Text c="dimmed" size="sm" ta="center" mt="md">
            {t('portal.student.schedule.emptyMonth')}
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
