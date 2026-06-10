import { useMemo } from 'react';
import { Stack, Title, Paper, Grid, Text, Badge, Group, Button, Breadcrumbs, Anchor, Progress, Divider, ThemeIcon } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft, IconEdit, IconUsers, IconUser } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import type { Class, ScheduleSlot } from '@/types';

const DAY_KEYS: Array<{ key: string; i18nKey: string }> = [
  { key: 'monday', i18nKey: 'common.monday' },
  { key: 'tuesday', i18nKey: 'common.tuesday' },
  { key: 'wednesday', i18nKey: 'common.wednesday' },
  { key: 'thursday', i18nKey: 'common.thursday' },
  { key: 'friday', i18nKey: 'common.friday' },
  { key: 'saturday', i18nKey: 'common.saturday' },
  { key: 'sunday', i18nKey: 'common.sunday' },
];

export function ClassDetailPage() {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: async () => {
      const response = await api.get(`/classes/${id}`);
      return response.data.data as Class;
    },
    enabled: !!id,
  });

  const STATUS_COLORS = useMemo(
    () => ({
      active: 'green',
      inactive: 'yellow',
      completed: 'blue',
      archived: 'gray',
    }),
    []
  );

  const LEVEL_LABELS = useMemo(
    () => ({
      beginner: t('classes.levels.beginner'),
      intermediate: t('classes.levels.intermediate'),
      advanced: t('classes.levels.advanced'),
    }),
    [t]
  );

  if (isLoading) return <Stack gap="md"><Title>{t('common.loading')}</Title></Stack>;
  if (!cls) return <Stack gap="md"><Title>{t('classes.detail.notFound')}</Title></Stack>;

  const getStatusColor = (status: string) => STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'gray';

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/classes">{t('classes.list.title')}</Anchor>
        <Text>{cls.name}</Text>
      </Breadcrumbs>

      <Stack gap="lg">
        <Group justify="space-between">
          <Group gap="md">
            <Title order={2}>{cls.name}</Title>
            <Badge color={getStatusColor(cls.status)} size="lg">{t(`classes.status.${cls.status}` as any)}</Badge>
          </Group>
          <Group gap="sm">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/classes')}>{t('common.back')}</Button>
            <Button leftSection={<IconEdit size={16} />} onClick={() => navigate(`/classes/${id}/edit`)}>{t('common.edit')}</Button>
          </Group>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Stack gap="md">
              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">{t('classes.detail.info')}</Title>
                <Grid>
                  <Grid.Col span={6}><Text size="sm" c="dimmed">{t('classes.detail.academicLevel')}</Text><Text fw={500} tt="capitalize">{LEVEL_LABELS[cls.academicLevel as keyof typeof LEVEL_LABELS] || cls.academicLevel}</Text></Grid.Col>
                  <Grid.Col span={6}><Text size="sm" c="dimmed">{t('classes.detail.classroom')}</Text><Text fw={500}>{cls.classroom || '-'}</Text></Grid.Col>
                  <Grid.Col span={6}><Text size="sm" c="dimmed">{t('classes.detail.startDate')}</Text><Text fw={500}>{formatDate(cls.startDate)}</Text></Grid.Col>
                  <Grid.Col span={6}><Text size="sm" c="dimmed">{t('classes.detail.endDate')}</Text><Text fw={500}>{cls.endDate ? formatDate(cls.endDate) : '-'}</Text></Grid.Col>
                  <Grid.Col span={12}><Text size="sm" c="dimmed">{t('classes.detail.description')}</Text><Text fw={500}>{cls.description || '-'}</Text></Grid.Col>
                </Grid>
              </Paper>

              <Paper shadow="sm" p="lg" radius="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>{t('classes.detail.schedule')}</Title>
                </Group>
                {DAY_KEYS.map(({ key, i18nKey }) => {
                  const slots = (cls.schedule?.[key as keyof typeof cls.schedule] || []) as ScheduleSlot[];
                  if (slots.length === 0) return null;
                  return (
                    <div key={key}>
                      <Text fw={500} tt="capitalize" mb="xs">{t(i18nKey)}</Text>
                      {slots.map((slot: ScheduleSlot, i: number) => (
                        <Text key={i} size="sm" c="dimmed">{slot.startTime} - {slot.endTime} {slot.room && `(${t('classes.detail.room')} ${slot.room})`}</Text>
                      ))}
                      <Divider my="sm" />
                    </div>
                  );
                })}
              </Paper>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="md">
              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">{t('classes.detail.enrollment')}</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm">{t('classes.detail.current')}</Text>
                    <Text fw={600}>{cls.currentEnrollment}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">{t('classes.detail.capacity')}</Text>
                    <Text fw={600}>{cls.capacity}</Text>
                  </Group>
                  <Progress value={(cls.currentEnrollment / cls.capacity) * 100} size="lg" mt="sm" />
                  <Text size="xs" c="dimmed" ta="center">{t('classes.detail.slotsAvailable', { count: cls.capacity - cls.currentEnrollment })}</Text>
                </Stack>
              </Paper>

              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">{t('classes.detail.teachers')}</Title>
                {cls.teachers?.map((t) => (
                  <Group key={t.id} gap="sm" mb="sm">
                    <ThemeIcon color="blue" variant="light" size="lg" radius="md"><IconUser size={16} /></ThemeIcon>
                    <div>
                      <Text size="sm" fw={500}>{t.fullName}</Text>
                      <Badge size="xs" variant="light">{t.role}</Badge>
                    </div>
                  </Group>
                )) || <Text c="dimmed">{t('classes.detail.noTeachers')}</Text>}
              </Paper>

              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">{t('classes.detail.students')}</Title>
                {cls.students?.map((s) => (
                  <Group key={s.id} gap="sm" mb="sm">
                    <ThemeIcon color="green" variant="light" size="md" radius="md"><IconUsers size={14} /></ThemeIcon>
                    <Text size="sm">{s.fullName}</Text>
                  </Group>
                )) || <Text c="dimmed">{t('classes.detail.noStudents')}</Text>}
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </>
  );
}
