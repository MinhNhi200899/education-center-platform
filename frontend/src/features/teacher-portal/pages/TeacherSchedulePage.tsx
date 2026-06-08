import { Stack, Title, Text, Group, Button, Paper } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import api from '@/lib/api';
import { WeeklyTimeGrid } from '../components/schedule/WeeklyTimeGrid';
import {
  CreateSessionModal,
  formatSessionDateForApi,
  type CreateSessionFormValues,
  type TeacherClassOption,
} from '../components/schedule/CreateSessionModal';
import { DeleteSessionModal } from '../components/schedule/DeleteSessionModal';
import type { TeacherScheduleSession } from '../components/schedule/schedule-utils';

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

export function TeacherSchedulePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherScheduleSession | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['teacher-portal-schedule', weekStart],
    queryFn: async () => {
      const res = await api.get(`/teacher-portal/schedule?weekStart=${weekStart}`);
      return res.data.data as { weekStart: string; sessions: TeacherScheduleSession[] };
    },
  });

  const { data: classesData } = useQuery({
    queryKey: ['teacher-portal-classes'],
    queryFn: async () => {
      const res = await api.get('/teacher-portal/classes');
      return res.data.data as TeacherClassOption[];
    },
  });

  const invalidateSchedule = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher-portal-schedule'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-portal-dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: async (values: CreateSessionFormValues) => {
      await api.post('/sessions', {
        classId: values.classId,
        sessionDate: formatSessionDateForApi(values.sessionDate),
        startTime: values.startTime,
        endTime: values.endTime,
        classroom: values.classroom || undefined,
        notes: values.notes || undefined,
      });
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('portal.teacher.schedule.create.success'),
        color: 'green',
      });
      setCreateOpen(false);
      invalidateSchedule();
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message: err.response?.data?.error?.message ?? t('portal.teacher.schedule.create.failed'),
        color: 'red',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; sessionDate: string }) => {
      await api.put(`/sessions/${payload.id}`, { sessionDate: payload.sessionDate });
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('portal.teacher.schedule.moveSuccess'),
        color: 'green',
      });
      invalidateSchedule();
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message: err.response?.data?.error?.message ?? t('portal.teacher.schedule.moveFailed'),
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sessions/${id}`);
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('portal.teacher.schedule.delete.success'),
        color: 'green',
      });
      setDeleteTarget(null);
      invalidateSchedule();
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message: err.response?.data?.error?.message ?? t('portal.teacher.schedule.delete.failed'),
        color: 'red',
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || typeof over.id !== 'string' || !over.id.startsWith('day-')) return;

    const newDate = over.id.replace('day-', '');
    const sessionId = String(active.id);
    const session = scheduleData?.sessions.find((s) => s.id === sessionId);
    if (!session || session.sessionDate === newDate) return;

    updateMutation.mutate({ id: sessionId, sessionDate: newDate });
  };

  const weekLabel = `${dayjs(weekStart).format('DD/MM')} – ${dayjs(weekStart).add(6, 'day').format('DD/MM/YYYY')}`;
  const sessions = scheduleData?.sessions ?? [];
  const classes = classesData ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>{t('portal.teacher.schedule.title')}</Title>
          <Text c="dimmed" size="sm">
            {t('portal.teacher.schedule.subtitle')}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {t('portal.teacher.schedule.dragHint')}
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateOpen(true)}
          disabled={classes.length === 0}
        >
          {t('portal.teacher.schedule.addSession')}
        </Button>
      </Group>

      <Group>
        <Button
          variant="default"
          leftSection={<IconChevronLeft size={16} />}
          onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
        >
          {t('portal.teacher.schedule.prev')}
        </Button>
        <Text fw={500}>{weekLabel}</Text>
        <Button
          variant="default"
          rightSection={<IconChevronRight size={16} />}
          onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
        >
          {t('portal.teacher.schedule.next')}
        </Button>
        <Button variant="light" onClick={() => setWeekStart(getMonday(new Date()))}>
          {t('portal.teacher.schedule.thisWeek')}
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md">
        {isLoading ? (
          <Text c="dimmed">{t('portal.teacher.schedule.loading')}</Text>
        ) : sessions.length === 0 && classes.length === 0 ? (
          <Text c="dimmed">{t('portal.teacher.schedule.noClasses')}</Text>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <WeeklyTimeGrid
              weekStart={weekStart}
              sessions={sessions}
              onDeleteSession={setDeleteTarget}
            />
          </DndContext>
        )}
        {!isLoading && sessions.length === 0 && classes.length > 0 && (
          <Text c="dimmed" size="sm" mt="md">
            {t('portal.teacher.schedule.empty')}
          </Text>
        )}
      </Paper>

      <CreateSessionModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        classes={classes}
        defaultDate={weekStart}
        loading={createMutation.isPending}
        onSubmit={(values) => createMutation.mutate(values)}
      />

      <DeleteSessionModal
        opened={!!deleteTarget}
        session={deleteTarget}
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </Stack>
  );
}
