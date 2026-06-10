import { Stack, Title, Text, Paper, Group, Badge, Button, SimpleGrid, Alert } from '@mantine/core';
import { IconCalendar, IconSchool, IconReceipt, IconBell } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

export function StudentHomePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: async () => {
      const res = await api.get('/portal/dashboard');
      return res.data.data;
    },
  });

  if (isLoading) {
    return <Text c="dimmed">{t('portal.student.home.loading')}</Text>;
  }

  const pendingCount = data?.pendingInvoices?.length ?? 0;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t('portal.student.home.welcome', { name: data?.profile?.fullName ?? t('portal.student.home.fallbackName') })}</Title>
        <Text c="dimmed" size="sm">
          {data?.profile?.center?.name ?? t('header.appName')}
        </Text>
      </div>

      {pendingCount > 0 && (
        <Alert icon={<IconBell size={18} />} color="orange" title={t('portal.student.home.tuitionAlertTitle')}>
          {t('portal.student.home.tuitionAlertMessage', { count: pendingCount })}{' '}
          <Button component={Link} to="/portal/tuition" variant="white" size="xs" ml="xs">
            {t('portal.student.home.tuitionAlertCta')}
          </Button>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('portal.student.home.currentClasses')}
            </Text>
            <IconSchool size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs">
            {data?.classes?.length ?? 0}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('portal.student.home.upcomingSessions')}
            </Text>
            <IconCalendar size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs">
            {data?.upcomingSessions?.length ?? 0}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('portal.student.home.pendingInvoices')}
            </Text>
            <IconReceipt size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs" c={pendingCount > 0 ? 'orange' : undefined}>
            {pendingCount}
          </Text>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>{t('portal.student.home.upcomingSchedule')}</Title>
          <Button component={Link} to="/portal/schedule" variant="light" size="xs">
            {t('portal.student.home.viewFullSchedule')}
          </Button>
        </Group>
        {(data?.upcomingSessions?.length ?? 0) === 0 ? (
          <Text c="dimmed" size="sm">
            {t('portal.student.home.noUpcoming')}
          </Text>
        ) : (
          <Stack gap="xs">
            {data.upcomingSessions.map((s: {
              id: string;
              className: string;
              sessionDate: string;
              startTime: string;
              endTime: string;
              classroom?: string;
            }) => (
              <Group key={s.id} justify="space-between" wrap="nowrap">
                <div>
                  <Text fw={500}>{s.className}</Text>
                  <Text size="xs" c="dimmed">
                    {dayjs(s.sessionDate).format('DD/MM/YYYY')} · {s.startTime}–{s.endTime}
                    {s.classroom ? ` · ${s.classroom}` : ''}
                  </Text>
                </div>
                <Badge variant="light">{t('portal.student.home.badgeUpcoming')}</Badge>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="md">
          {t('portal.student.home.myClasses')}
        </Title>
        {(data?.classes?.length ?? 0) === 0 ? (
          <Text c="dimmed" size="sm">
            {t('portal.student.home.noClassAssigned')}
          </Text>
        ) : (
          <Stack gap="xs">
            {data.classes.map((c: { classId: string; className: string; classroom?: string }) => (
              <Group key={c.classId} justify="space-between">
                <Text fw={500}>{c.className}</Text>
                {c.classroom && (
                  <Text size="sm" c="dimmed">
                    {c.classroom}
                  </Text>
                )}
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
