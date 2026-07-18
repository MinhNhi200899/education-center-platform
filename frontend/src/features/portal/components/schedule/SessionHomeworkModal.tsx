import {
  Modal,
  Stack,
  Text,
  List,
  Anchor,
  Alert,
  Paper,
  Group,
  Badge,
  Divider,
  Textarea,
  FileInput,
  Button,
  ThemeIcon,
} from '@mantine/core';
import {
  IconFile,
  IconInfoCircle,
  IconBook,
  IconUpload,
  IconLock,
  IconCheck,
  IconClock,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import type { StudentScheduleSession } from './types';

interface Props {
  session: StudentScheduleSession | null;
  opened: boolean;
  onClose: () => void;
}

function cleanAssignmentNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  const cleaned = notes
    .split('\n')
    .map((l) => l.trim())
    .filter((line) => {
      if (!line) return false;
      if (/drive\.google\.com/i.test(line)) return false;
      if (/Tệp đính kèm|Attachment \(PDF|fileLabel/i.test(line)) return false;
      if (/^(Link|Liên kết)\s*:/i.test(line)) return false;
      return true;
    })
    .join('\n')
    .trim();
  return cleaned || null;
}

export function SessionHomeworkModal({ session, opened, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const sessionId = session?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['portal-session-homework', sessionId],
    queryFn: async () => {
      const res = await api.get(`/portal/sessions/${sessionId}/homework`);
      return res.data.data as {
        sessionId: string;
        className: string;
        sessionDate: string;
        startTime: string;
        endTime: string;
        classroom?: string | null;
        notes: string | null;
        materials: Array<{
          id: string;
          fileUrl: string;
          fileName: string;
          fileType: string;
          fileSize: number | null;
        }>;
        submissionDeadline: string;
        canSubmit: boolean;
        submission: {
          id: string;
          fileUrl: string | null;
          fileName: string | null;
          note: string | null;
          submittedAt: string;
          feedback: string | null;
          feedbackAt: string | null;
        } | null;
      };
    },
    enabled: opened && !!sessionId,
  });

  useEffect(() => {
    if (!opened) {
      setNote('');
      setFile(null);
      return;
    }
    if (data?.submission?.note) setNote(data.submission.note);
  }, [opened, data?.submission?.note]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (note.trim()) formData.append('note', note.trim());
      if (file) formData.append('file', file);
      const res = await api.post(`/portal/sessions/${sessionId}/homework/submit`, formData);
      return res.data.data;
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('portal.student.schedule.homeworkModal.submitSuccess'),
        color: 'green',
      });
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['portal-session-homework', sessionId] });
    },
    onError: (err: { response?: { data?: { error?: { message?: string; code?: string } } } }) => {
      const code = err.response?.data?.error?.code;
      notifications.show({
        title: t('common.error'),
        message:
          code === 'SUBMISSION_LOCKED'
            ? t('portal.student.schedule.homeworkModal.locked')
            : err.response?.data?.error?.message ||
              t('portal.student.schedule.homeworkModal.submitFailed'),
        color: 'red',
      });
    },
  });

  const assignmentNotes = useMemo(
    () => cleanAssignmentNotes(data?.notes ?? session?.notes),
    [data?.notes, session?.notes]
  );

  const materials = data?.materials ?? session?.materials ?? [];
  const hasAssignment = Boolean(assignmentNotes) || materials.length > 0;
  const canSubmit = data?.canSubmit ?? false;
  const submission = data?.submission;

  if (!session) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size="md" radius="md" variant="light" color="teal">
            <IconBook size={16} />
          </ThemeIcon>
          <Text fw={600}>{t('portal.student.schedule.homeworkModal.title')}</Text>
        </Group>
      }
      centered
      size="lg"
      radius="md"
      padding="lg"
    >
      <Stack gap="md">
        <Paper withBorder radius="md" p="md" bg="gray.0">
          <Text fw={700} size="lg">
            {data?.className ?? session.className}
          </Text>
          <Group gap="xs" mt={6}>
            <Badge variant="light" color="blue" leftSection={<IconClock size={12} />}>
              {dayjs(data?.sessionDate ?? session.sessionDate).format('DD/MM/YYYY')} ·{' '}
              {data?.startTime ?? session.startTime}–{data?.endTime ?? session.endTime}
            </Badge>
            {(data?.classroom || session.classroom) && (
              <Badge variant="outline" color="gray">
                {t('portal.student.schedule.room', {
                  room: data?.classroom || session.classroom,
                })}
              </Badge>
            )}
          </Group>
        </Paper>

        {isLoading ? (
          <Text c="dimmed" size="sm">
            {t('portal.student.homework.loading')}
          </Text>
        ) : (
          <>
            <div>
              <Text size="sm" fw={600} mb="xs">
                {t('portal.student.schedule.homeworkModal.fromTeacher')}
              </Text>
              {!hasAssignment ? (
                <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light" radius="md">
                  {t('portal.student.schedule.homeworkModal.empty')}
                </Alert>
              ) : (
                <Paper withBorder radius="md" p="md">
                  <Stack gap="sm">
                    {assignmentNotes && (
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                        {assignmentNotes}
                      </Text>
                    )}
                    {materials.length > 0 && (
                      <List spacing={6} size="sm" icon={<IconFile size={14} />}>
                        {materials.map((m) => (
                          <List.Item key={m.id}>
                            <Anchor
                              href={m.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="sm"
                              fw={500}
                            >
                              {m.fileName || t('portal.student.homework.openFile')}
                            </Anchor>
                          </List.Item>
                        ))}
                      </List>
                    )}
                  </Stack>
                </Paper>
              )}
            </div>

            <Divider />

            <div>
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={600}>
                  {t('portal.student.schedule.homeworkModal.yourSubmission')}
                </Text>
                {canSubmit ? (
                  <Badge color="teal" variant="light">
                    {t('portal.student.schedule.homeworkModal.openUntil', {
                      time: dayjs(data?.submissionDeadline).format('HH:mm DD/MM'),
                    })}
                  </Badge>
                ) : (
                  <Badge color="gray" variant="light" leftSection={<IconLock size={10} />}>
                    {t('portal.student.schedule.homeworkModal.locked')}
                  </Badge>
                )}
              </Group>

              {submission && (
                <Alert
                  icon={<IconCheck size={16} />}
                  color="green"
                  variant="light"
                  radius="md"
                  mb="sm"
                  title={t('portal.student.schedule.homeworkModal.submittedAt', {
                    time: dayjs(submission.submittedAt).format('HH:mm DD/MM/YYYY'),
                  })}
                >
                  {submission.note && (
                    <Text size="sm" mb={4} style={{ whiteSpace: 'pre-wrap' }}>
                      {submission.note}
                    </Text>
                  )}
                  {submission.fileUrl && (
                    <Anchor href={submission.fileUrl} target="_blank" rel="noopener noreferrer" size="sm">
                      {submission.fileName || t('portal.student.homework.openFile')}
                    </Anchor>
                  )}
                </Alert>
              )}

              {submission?.feedback && (
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="indigo"
                  variant="light"
                  radius="md"
                  mb="sm"
                  title={
                    submission.feedbackAt
                      ? t('portal.student.schedule.homeworkModal.teacherFeedbackAt', {
                          time: dayjs(submission.feedbackAt).format('HH:mm DD/MM/YYYY'),
                        })
                      : t('portal.student.schedule.homeworkModal.teacherFeedback')
                  }
                >
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {submission.feedback}
                  </Text>
                </Alert>
              )}

              {canSubmit ? (
                <Stack gap="sm">
                  <Textarea
                    label={t('portal.student.schedule.homeworkModal.noteLabel')}
                    placeholder={t('portal.student.schedule.homeworkModal.notePlaceholder')}
                    minRows={3}
                    value={note}
                    onChange={(e) => setNote(e.currentTarget.value)}
                    radius="md"
                  />
                  <FileInput
                    label={t('portal.student.schedule.homeworkModal.fileLabel')}
                    placeholder={t('portal.student.schedule.homeworkModal.filePlaceholder')}
                    leftSection={<IconUpload size={16} />}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                    value={file}
                    onChange={setFile}
                    clearable
                    radius="md"
                  />
                  <Text size="xs" c="dimmed">
                    {t('portal.student.schedule.homeworkModal.submitHint')}
                  </Text>
                  <Button
                    onClick={() => submitMutation.mutate()}
                    loading={submitMutation.isPending}
                    disabled={!note.trim() && !file}
                    radius="md"
                  >
                    {submission
                      ? t('portal.student.schedule.homeworkModal.updateSubmit')
                      : t('portal.student.schedule.homeworkModal.submit')}
                  </Button>
                </Stack>
              ) : (
                !submission && (
                  <Alert icon={<IconLock size={16} />} color="orange" variant="light" radius="md">
                    {t('portal.student.schedule.homeworkModal.lockedEmpty')}
                  </Alert>
                )
              )}
            </div>
          </>
        )}
      </Stack>
    </Modal>
  );
}
