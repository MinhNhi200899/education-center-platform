import {
  Modal,
  Stack,
  Text,
  Group,
  Badge,
  Paper,
  Button,
  Textarea,
  Anchor,
  ScrollArea,
  Divider,
  Alert,
  ThemeIcon,
  Loader,
} from '@mantine/core';
import { IconBook, IconCheck, IconMessage, IconUser } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import type { TeacherScheduleSession } from './schedule-utils';

interface SubmissionItem {
  studentId: string;
  studentName: string;
  submitted: boolean;
  submission: {
    id: string;
    note: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileType: string | null;
    fileSize: number | null;
    submittedAt: string;
    feedback: string | null;
    feedbackAt: string | null;
  } | null;
}

interface ReviewData {
  sessionId: string;
  className: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  submittedCount: number;
  totalStudents: number;
  items: SubmissionItem[];
}

interface Props {
  session: TeacherScheduleSession | null;
  opened: boolean;
  onClose: () => void;
  initialStudentId?: string | null;
}

export function ReviewHomeworkModal({ session, opened, onClose, initialStudentId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const sessionId = session?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['session-homework-submissions', sessionId],
    queryFn: async () => {
      const res = await api.get(`/sessions/${sessionId}/homework-submissions`);
      return res.data.data as ReviewData;
    },
    enabled: opened && !!sessionId,
  });

  useEffect(() => {
    if (!opened) {
      setSelectedStudentId(null);
      setFeedback('');
      return;
    }
    if (!data?.items.length) return;

    const preferred =
      (initialStudentId && data.items.find((i) => i.studentId === initialStudentId)?.studentId) ||
      data.items.find((i) => i.submitted)?.studentId ||
      data.items[0]?.studentId ||
      null;
    setSelectedStudentId(preferred);
  }, [opened, data, initialStudentId]);

  const selected = data?.items.find((i) => i.studentId === selectedStudentId) ?? null;

  useEffect(() => {
    setFeedback(selected?.submission?.feedback?.trim() || '');
  }, [selected?.studentId, selected?.submission?.feedback]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !selectedStudentId) return;
      const res = await api.put(
        `/sessions/${sessionId}/homework-submissions/${selectedStudentId}/feedback`,
        { feedback: feedback.trim() }
      );
      return res.data.data;
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('portal.teacher.schedule.reviewHomework.feedbackSuccess'),
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['session-homework-submissions', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-portal-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message:
          err.response?.data?.error?.message ||
          t('portal.teacher.schedule.reviewHomework.feedbackFailed'),
        color: 'red',
      });
    },
  });

  if (!session) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size="md" radius="md" variant="light" color="indigo">
            <IconBook size={16} />
          </ThemeIcon>
          <Text fw={600}>{t('portal.teacher.schedule.reviewHomework.title')}</Text>
        </Group>
      }
      centered
      size="xl"
      radius="md"
      padding="lg"
    >
      <Stack gap="md">
        <Paper withBorder radius="md" p="md" bg="gray.0">
          <Text fw={700}>{data?.className ?? session.className}</Text>
          <Text size="sm" c="dimmed" mt={4}>
            {dayjs(data?.sessionDate ?? session.sessionDate).format('DD/MM/YYYY')} ·{' '}
            {data?.startTime ?? session.startTime}–{data?.endTime ?? session.endTime}
          </Text>
          {data && (
            <Badge mt="sm" variant="light" color="indigo">
              {t('portal.teacher.schedule.reviewHomework.submittedSummary', {
                submitted: data.submittedCount,
                total: data.totalStudents,
              })}
            </Badge>
          )}
        </Paper>

        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : !data || data.items.length === 0 ? (
          <Alert color="gray" variant="light">
            {t('portal.teacher.schedule.reviewHomework.noStudents')}
          </Alert>
        ) : (
          <Group align="flex-start" gap="md" wrap="nowrap" grow>
            <Paper withBorder radius="md" p="xs" style={{ width: 220, flexShrink: 0 }}>
              <Text size="xs" fw={600} c="dimmed" px="xs" py={4}>
                {t('portal.teacher.schedule.reviewHomework.students')}
              </Text>
              <ScrollArea.Autosize mah={360}>
                <Stack gap={4}>
                  {data.items.map((item) => {
                    const active = item.studentId === selectedStudentId;
                    return (
                      <Button
                        key={item.studentId}
                        variant={active ? 'light' : 'subtle'}
                        color={item.submitted ? (item.submission?.feedback ? 'teal' : 'blue') : 'gray'}
                        justify="space-between"
                        fullWidth
                        size="compact-sm"
                        onClick={() => setSelectedStudentId(item.studentId)}
                        leftSection={<IconUser size={14} />}
                      >
                        <Text size="xs" truncate style={{ flex: 1, textAlign: 'left' }}>
                          {item.studentName}
                        </Text>
                        {item.submission?.feedback ? (
                          <IconMessage size={12} />
                        ) : item.submitted ? (
                          <IconCheck size={12} />
                        ) : null}
                      </Button>
                    );
                  })}
                </Stack>
              </ScrollArea.Autosize>
            </Paper>

            <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
              {!selected ? (
                <Text c="dimmed" size="sm">
                  {t('portal.teacher.schedule.reviewHomework.selectStudent')}
                </Text>
              ) : !selected.submitted || !selected.submission ? (
                <Alert color="orange" variant="light">
                  {t('portal.teacher.schedule.reviewHomework.notSubmitted', {
                    name: selected.studentName,
                  })}
                </Alert>
              ) : (
                <>
                  <Group justify="space-between">
                    <Text fw={600}>{selected.studentName}</Text>
                    <Badge variant="light" color="green" leftSection={<IconCheck size={10} />}>
                      {dayjs(selected.submission.submittedAt).format('HH:mm DD/MM')}
                    </Badge>
                  </Group>

                  <Paper withBorder radius="md" p="md">
                    <Text size="sm" fw={600} mb="xs">
                      {t('portal.teacher.schedule.reviewHomework.submission')}
                    </Text>
                    {selected.submission.note ? (
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} mb="sm">
                        {selected.submission.note}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed" mb="sm">
                        {t('portal.teacher.schedule.reviewHomework.noNote')}
                      </Text>
                    )}
                    {selected.submission.fileUrl && (
                      <Anchor
                        href={selected.submission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                      >
                        {selected.submission.fileName ||
                          t('portal.teacher.schedule.reviewHomework.openFile')}
                      </Anchor>
                    )}
                  </Paper>

                  <Divider />

                  <Textarea
                    label={t('portal.teacher.schedule.reviewHomework.feedbackLabel')}
                    placeholder={t('portal.teacher.schedule.reviewHomework.feedbackPlaceholder')}
                    minRows={4}
                    maxLength={2000}
                    value={feedback}
                    onChange={(e) => setFeedback(e.currentTarget.value)}
                    radius="md"
                  />
                  {selected.submission.feedbackAt && (
                    <Text size="xs" c="dimmed">
                      {t('portal.teacher.schedule.reviewHomework.lastFeedbackAt', {
                        time: dayjs(selected.submission.feedbackAt).format('HH:mm DD/MM/YYYY'),
                      })}
                    </Text>
                  )}
                  <Group justify="flex-end">
                    <Button
                      onClick={() => saveMutation.mutate()}
                      loading={saveMutation.isPending}
                      disabled={!feedback.trim()}
                      radius="md"
                    >
                      {t('portal.teacher.schedule.reviewHomework.saveFeedback')}
                    </Button>
                  </Group>
                </>
              )}
            </Stack>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
