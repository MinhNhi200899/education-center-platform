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
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  type CreateSessionDefaults,
  type CreateSessionFormValues,
  type TeacherClassOption,
} from '../components/schedule/CreateSessionModal';
import { DeleteSessionModal } from '../components/schedule/DeleteSessionModal';
import type { CreateSlotDraft, TeacherScheduleSession } from '../components/schedule/schedule-utils';
import {
  computeMoveFromSlot,
  getDaysInWeek,
  getTodayIso,
  getWeekStart,
  isSameSlot,
  monthsCoveringWeek,
  parseSlotId,
  shiftWeek,
} from '../components/schedule/schedule-utils';
import { getSessionPhase, canDragSession } from '../components/schedule/session-phase';

export function TeacherSchedulePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<CreateSessionDefaults | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<TeacherScheduleSession | null>(null);
  const [assignTarget, setAssignTarget] = useState<TeacherScheduleSession | null>(null);
  const [attendanceTarget, setAttendanceTarget] = useState<TeacherScheduleSession | null>(null);
  const [localSessions, setLocalSessions] = useState<TeacherScheduleSession[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [activeSession, setActiveSession] = useState<TeacherScheduleSession | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const months = useMemo(() => monthsCoveringWeek(weekStart), [weekStart]);
  const weekDays = useMemo(() => getDaysInWeek(weekStart), [weekStart]);

  const scheduleQueries = useQueries({
    queries: months.map((monthStart) => ({
      queryKey: ['teacher-portal-schedule', monthStart],
      queryFn: async () => {
        const res = await api.get(`/teacher-portal/schedule?monthStart=${monthStart}`);
        return res.data.data as {
          monthStart: string;
          monthEnd: string;
          sessions: TeacherScheduleSession[];
        };
      },
    })),
  });

  const isLoading = scheduleQueries.some((q) => q.isLoading);
  const scheduleDataA = scheduleQueries[0]?.data;
  const scheduleDataB = scheduleQueries[1]?.data;

  const sessionsFromApi = useMemo(() => {
    const byId = new Map<string, TeacherScheduleSession>();
    for (const data of [scheduleDataA, scheduleDataB]) {
      for (const s of data?.sessions ?? []) {
        byId.set(s.id, s);
      }
    }
    return [...byId.values()];
  }, [scheduleDataA, scheduleDataB]);

  useEffect(() => {
    setLocalSessions(sessionsFromApi);
  }, [sessionsFromApi]);

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
      setCreateDefaults(undefined);
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

  const openCreateModal = (defaults?: CreateSessionDefaults) => {
    setCreateDefaults(defaults);
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreateDefaults(undefined);
  };

  const handleCreateSlot = (draft: CreateSlotDraft) => {
    openCreateModal({
      sessionDate: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
    });
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
          onClick={() => openCreateModal()}
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
              weekStart={weekStart}
              sessions={localSessions}
              savingIds={savingIds}
              isDraggingSession={!!activeSession}
              onDeleteSession={setDeleteTarget}
              onSelectSession={handleSelectSession}
              onCreateSlot={handleCreateSlot}
              onPrevWeek={() => setWeekStart(shiftWeek(weekStart, -1))}
              onNextWeek={() => setWeekStart(shiftWeek(weekStart, 1))}
              onWeekSelect={setWeekStart}
            />
            <DragOverlay dropAnimation={{ duration: 180 }}>
              {activeSession ? (
                <SessionBlock session={activeSession} isOverlay />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
        {!isLoading &&
          !localSessions.some((s) => weekDays.includes(s.sessionDate)) &&
          classes.length > 0 && (
          <Text c="dimmed" size="sm" mt="md" ta="center">
            {t('portal.teacher.schedule.empty')}
          </Text>
        )}
      </Paper>

      <CreateSessionModal
        opened={createOpen}
        onClose={closeCreateModal}
        classes={classes}
        defaultDate={createDefaults?.sessionDate ?? getTodayIso()}
        defaults={createDefaults}
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
