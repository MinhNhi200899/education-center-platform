import {
  Stack,
  Title,
  Paper,
  Group,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Modal,
  Select,
  Textarea,
  ActionIcon,
} from '@mantine/core';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCheck, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import {
  queueAttendanceRecord,
  syncOfflineQueue,
  getPendingCount,
} from '@/lib/attendance-offline';
import type { AttendanceStatus } from '@/types';

interface StudentRow {
  studentId: string;
  studentName: string;
  status: AttendanceStatus | null;
  reason: string | null;
}

export function AttendancePage() {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [reasonModal, setReasonModal] = useState<{
    studentId: string;
    studentName: string;
    status: AttendanceStatus;
  } | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}`);
      return response.data.data;
    },
    enabled: !!sessionId,
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ['attendance-session', sessionId],
    queryFn: async () => {
      const response = await api.get(`/attendance/session/${sessionId}`);
      return response.data.data as StudentRow[];
    },
    enabled: !!sessionId,
  });

  const { data: absenceReasons } = useQuery({
    queryKey: ['absence-reasons'],
    queryFn: async () => {
      const res = await api.get('/attendance/reasons');
      return res.data.data as Array<{ id: string; name: string }>;
    },
  });

  useEffect(() => {
    if (!students) return;
    const initial: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      if (s.status) initial[s.studentId] = s.status;
    });
    setRecords(initial);
  }, [students]);

  const markMutation = useMutation({
    mutationFn: async (payload: {
      sessionId: string;
      records: { studentId: string; status: AttendanceStatus; reason?: string }[];
    }) => {
      if (!navigator.onLine) {
        payload.records.forEach((r) => {
          queueAttendanceRecord({
            studentId: r.studentId,
            sessionId: payload.sessionId,
            status: r.status,
            reason: r.reason,
          });
        });
        return { offline: true };
      }
      const response = await api.post('/attendance/session', payload);
      return response.data.data;
    },
    onSuccess: async (data) => {
      if (data?.offline) {
        notifications.show({
          title: t('attendance.mark.savedOfflineTitle'),
          message: t('attendance.mark.savedOfflineMessage', { count: getPendingCount() }),
          color: 'orange',
        });
      } else {
        await syncOfflineQueue();
        notifications.show({
          title: t('attendance.mark.savedTitle'),
          message: t('attendance.mark.savedMessage'),
          color: 'green',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['attendance-session', sessionId] });
      navigate(classId ? '/attendance' : '/attendance');
    },
    onError: () => {
      notifications.show({ title: t('attendance.mark.failedTitle'), message: t('attendance.mark.failedMessage'), color: 'red' });
    },
  });

  const applyStatus = (studentId: string, status: AttendanceStatus, studentName: string) => {
    if (status === 'absent' || status === 'late' || status === 'excused') {
      setReasonModal({ studentId, studentName, status });
      return;
    }
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const confirmReason = () => {
    if (!reasonModal) return;
    const reason =
      selectedReason === 'other'
        ? customReason
        : absenceReasons?.find((r) => r.id === selectedReason)?.name || customReason;

    setRecords((prev) => ({ ...prev, [reasonModal.studentId]: reasonModal.status }));
    if (reason) {
      setReasons((prev) => ({ ...prev, [reasonModal.studentId]: reason }));
    }
    setReasonModal(null);
    setSelectedReason(null);
    setCustomReason('');
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (!students) return;
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      next[s.studentId] = status;
    });
    setRecords(next);
    if (status === 'present') setReasons({});
  };

  const handleSubmit = () => {
    if (!sessionId) return;
    const recordList = Object.entries(records).map(([studentId, status]) => ({
      studentId,
      status,
      reason: reasons[studentId],
    }));
    markMutation.mutate({ sessionId, records: recordList });
  };

  const statusColor = useMemo(
    () => ({ present: 'green', absent: 'red', late: 'yellow', excused: 'blue' }),
    []
  );

  const statusLabel = (s: AttendanceStatus) => t(`attendance.status.${s}` as any);

  return (
    <Stack gap="lg">
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/attendance')}>
          <IconArrowLeft size={20} />
        </ActionIcon>
        <div style={{ flex: 1 }}>
          <Title order={2}>{t('attendance.mark.title')}</Title>
          <Text c="dimmed">
            {session?.class?.name} —{' '}
            {session?.sessionDate ? formatDate(session.sessionDate) : ''}
          </Text>
        </div>
      </Group>

      <Group>
        <Button
          size="md"
          color="green"
          leftSection={<IconCheck size={18} />}
          onClick={() => handleMarkAll('present')}
        >
          {t('attendance.mark.markAllPresent')}
        </Button>
        <Button
          size="md"
          color="red"
          variant="light"
          leftSection={<IconX size={18} />}
          onClick={() => handleMarkAll('absent')}
        >
          {t('attendance.mark.markAllAbsent')}
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {isLoading && <Text>{t('attendance.mark.loading')}</Text>}
        {students?.map((student) => {
          const current = records[student.studentId];
          return (
            <Paper key={student.studentId} p="md" radius="md" withBorder>
              <Text fw={600} mb="sm" lineClamp={1}>
                {student.studentName}
              </Text>
              <Group grow>
                <Button
                  size="lg"
                  color={current === 'present' ? 'green' : 'gray'}
                  variant={current === 'present' ? 'filled' : 'light'}
                  onClick={() =>
                    applyStatus(student.studentId, 'present', student.studentName)
                  }
                >
                  {t('attendance.mark.present')}
                </Button>
                <Button
                  size="lg"
                  color={current === 'absent' ? 'red' : 'gray'}
                  variant={current === 'absent' ? 'filled' : 'light'}
                  onClick={() =>
                    applyStatus(student.studentId, 'absent', student.studentName)
                  }
                >
                  {t('attendance.mark.absent')}
                </Button>
              </Group>
              {current && (
                <Badge mt="sm" color={statusColor[current]}>
                  {statusLabel(current)}
                  {reasons[student.studentId] ? ` — ${reasons[student.studentId]}` : ''}
                </Badge>
              )}
            </Paper>
          );
        })}
      </SimpleGrid>

      <Group justify="flex-end">
        <Button
          size="lg"
          onClick={handleSubmit}
          loading={markMutation.isPending}
          disabled={Object.keys(records).length === 0}
        >
          {t('attendance.mark.save')}
        </Button>
      </Group>

      <Modal
        opened={!!reasonModal}
        onClose={() => setReasonModal(null)}
        title={reasonModal ? t('attendance.mark.reasonTitle', {
          status: t(reasonModal.status === 'absent' ? 'attendance.mark.reasonAbsent' : 'attendance.mark.reasonLate'),
          name: reasonModal.studentName,
        }) : ''}
      >
        <Stack>
          <Select
            label={t('attendance.mark.reasonPreset')}
            placeholder={t('attendance.mark.reasonSelect')}
            data={[
              ...(absenceReasons?.map((r) => ({ value: r.id, label: r.name })) || []),
              { value: 'other', label: t('attendance.mark.reasonOther') },
            ]}
            value={selectedReason}
            onChange={setSelectedReason}
          />
          {selectedReason === 'other' && (
            <Textarea
              label={t('attendance.mark.description')}
              value={customReason}
              onChange={(e) => setCustomReason(e.currentTarget.value)}
            />
          )}
          <Button onClick={confirmReason}>{t('common.confirm')}</Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
