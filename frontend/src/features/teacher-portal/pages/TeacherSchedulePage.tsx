import { Stack, Title, Text, Group, Button, Paper } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import api from '@/lib/api';
import { MonthlyTimeGrid } from '../components/schedule/MonthlyTimeGrid';
import { AssignHomeworkModal } from '../components/schedule/AssignHomeworkModal';
import { MarkAttendanceModal } from '../components/schedule/MarkAttendanceModal';
import { SessionBlock } from '../components/schedule/SessionBlock';
import {
  CreateSessionModal,
  formatSessionDateForApi,
  type CreateSessionFormValues,
  type TeacherClassOption,
} from '../components/schedule/CreateSessionModal';
import { DeleteSessionModal } from '../components/schedule/DeleteSessionModal';
import type { TeacherScheduleSession } from '../components/schedule/schedule-utils';
import {
  computeMoveFromSlot,
  getMonthStart,
  isSameSlot,
  parseSlotId,
  shiftMonth,
} from '../components/schedule/schedule-utils';
import { getSessionPhase, canDragSession } from '../components/schedule/session-phase';

export function TeacherSchedulePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [monthStart, setMonthStart] = useState(() => getMonthStart());
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherScheduleSession | null>(null);
  const [assignTarget, setAssignTarget] = useState<TeacherScheduleSession | null>(null);
  const [attendanceTarget, setAttendanceTarget] = useState<TeacherScheduleSession | null>(null);
  const [localSessions, setLocalSessions] = useState<TeacherScheduleSession[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [activeSession, setActiveSession] = useState<TeacherScheduleSession | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['teacher-portal-schedule', monthStart],
    queryFn: async () => {
      const res = await api.get(`/teacher-portal/schedule?monthStart=${monthStart}`);
      return res.data.data as {
        monthStart: string;
        monthEnd: string;
        sessions: TeacherScheduleSession[];
      };
    },
  });

  useEffect(() => {
    if (scheduleData?.sessions) {
      setLocalSessions(scheduleData.sessions);
    }
  }, [scheduleData]);

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

  const handleAttendanceSuccess = () => {
    if (attendanceTarget) {
      const id = attendanceTarget.id;
      setLocalSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, attendanceMarked: true } : s))
      );
    }
    invalidateSchedule();
  };

  const createMutation = useMutation({
    mutationFn: async (values: CreateSessionFormValues) => {
      await Promise.all(
        values.sessionDates.map((date) =>
          api.post('/sessions', {
            classId: values.classId,
            sessionDate: formatSessionDateForApi(date),
            startTime: values.startTime,
            endTime: values.endTime,
            classroom: values.classroom || undefined,
            notes: values.notes || undefined,
          })
        )
      );
      return values.sessionDates.length;
    },
    onSuccess: (count) => {
      notifications.show({
        title: t('common.success'),
        message:
          count > 1
            ? t('portal.teacher.schedule.create.successMultiple', { count })
            : t('portal.teacher.schedule.create.success'),
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

  const persistMove = useCallback(
    async (
      sessionId: string,
      previous: TeacherScheduleSession[],
      next: TeacherScheduleSession[]
    ) => {
      const moved = next.find((s) => s.id === sessionId);
      if (!moved) return;

      setSavingIds((prev) => new Set(prev).add(sessionId));
      try {
        await api.put(`/sessions/${sessionId}`, {
          sessionDate: moved.sessionDate,
          startTime: moved.startTime,
          endTime: moved.endTime,
        });
        invalidateSchedule();
      } catch (err: unknown) {
        setLocalSessions(previous);
        const message =
          (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
            ?.error?.message ?? t('portal.teacher.schedule.moveFailed');
        notifications.show({
          title: t('common.error'),
          message,
          color: 'red',
        });
      } finally {
        setSavingIds((prev) => {
          const n = new Set(prev);
          n.delete(sessionId);
          return n;
        });
      }
    },
    [queryClient, t]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const session = localSessions.find((s) => s.id === String(event.active.id));
    if (!session || !canDragSession(session)) {
      setActiveSession(null);
      return;
    }
    setActiveSession(session);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveSession(null);
    const { active, over } = event;
    if (!over || typeof over.id !== 'string') return;

    const slot = parseSlotId(over.id);
    if (!slot) return;

    const sessionId = String(active.id);
    const session = localSessions.find((s) => s.id === sessionId);
    if (!session || !canDragSession(session)) return;

    const { sessionDate, startTime, endTime } = computeMoveFromSlot(
      session,
      slot.date,
      slot.startMinutes
    );

    if (isSameSlot(session, sessionDate, startTime, endTime)) return;

    const previous = localSessions;
    const next = localSessions.map((s) =>
      s.id === sessionId ? { ...s, sessionDate, startTime, endTime } : s
    );
    setLocalSessions(next);
    void persistMove(sessionId, previous, next);
  };

  const handleDragCancel = () => setActiveSession(null);

  const handleSelectSession = (session: TeacherScheduleSession) => {
    const phase = getSessionPhase(session);
    if (phase === 'cancelled') return;
    if (phase === 'in_progress' || phase === 'ended') {
      setAttendanceTarget(session);
      return;
    }
    setAssignTarget(session);
  };

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
          <Text size="xs" c="dimmed">
            {t('portal.teacher.schedule.clickHint')}
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

      <Paper withBorder p="md" radius="md">
        {isLoading ? (
          <Text c="dimmed">{t('portal.teacher.schedule.loading')}</Text>
        ) : classes.length === 0 ? (
          <Text c="dimmed">{t('portal.teacher.schedule.noClasses')}</Text>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <MonthlyTimeGrid
              monthStart={monthStart}
              sessions={localSessions}
              savingIds={savingIds}
              onDeleteSession={setDeleteTarget}
              onSelectSession={handleSelectSession}
              onPrevMonth={() => setMonthStart(shiftMonth(monthStart, -1))}
              onNextMonth={() => setMonthStart(shiftMonth(monthStart, 1))}
              onMonthSelect={setMonthStart}
            />
            <DragOverlay dropAnimation={{ duration: 180 }}>
              {activeSession ? (
                <SessionBlock session={activeSession} isOverlay />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
        {!isLoading && localSessions.length === 0 && classes.length > 0 && (
          <Text c="dimmed" size="sm" mt="md" ta="center">
            {t('portal.teacher.schedule.empty')}
          </Text>
        )}
      </Paper>

      <CreateSessionModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        classes={classes}
        defaultDate={monthStart}
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

      <AssignHomeworkModal
        session={assignTarget}
        opened={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        onSuccess={invalidateSchedule}
      />

      <MarkAttendanceModal
        session={attendanceTarget}
        opened={!!attendanceTarget}
        onClose={() => setAttendanceTarget(null)}
        onSuccess={handleAttendanceSuccess}
      />
    </Stack>
  );
}
