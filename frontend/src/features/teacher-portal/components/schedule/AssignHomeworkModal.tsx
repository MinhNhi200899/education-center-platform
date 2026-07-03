import {
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Button,
  Group,
  Loader,
  List,
  FileInput,
} from '@mantine/core';
import { IconFile, IconUpload } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import type { TeacherScheduleSession } from './schedule-utils';

interface Props {
  session: TeacherScheduleSession | null;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ACCEPTED_FILES = '.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function AssignHomeworkModal({ session, opened, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const [homework, setHomework] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['class-students-homework', session?.classId],
    queryFn: async () => {
      const res = await api.get(`/classes/${session!.classId}/students`);
      return res.data.data as Array<{ id: string; fullName: string }>;
    },
    enabled: opened && !!session?.classId,
  });

  const { data: sessionDetail, isLoading: loadingSession } = useQuery({
    queryKey: ['session-homework', session?.id],
    queryFn: async () => {
      const res = await api.get(`/sessions/${session!.id}`);
      return res.data.data as { notes?: string | null };
    },
    enabled: opened && !!session?.id,
  });

  useEffect(() => {
    if (!opened) {
      setHomework('');
      setLink('');
      setFile(null);
      return;
    }
    if (sessionDetail?.notes) {
      setHomework(sessionDetail.notes);
    }
  }, [opened, sessionDetail?.notes]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!session || !students?.length) return;

      let attachmentLine = '';
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await api.post('/uploads/homework', formData);
        const uploaded = uploadRes.data.data as {
          url: string;
          fileName: string;
          fileType: string;
          fileSize: number;
          driveFileId: string;
        };

        await api.post(`/sessions/${session.id}/materials`, {
          fileUrl: uploaded.url,
          fileName: uploaded.fileName,
          fileType: uploaded.fileType,
          fileSize: uploaded.fileSize,
          driveFileId: uploaded.driveFileId,
        });

        attachmentLine = `${t('portal.teacher.schedule.assignHomework.fileLabel')}: ${uploaded.url}`;
      } else if (link.trim() && /drive\.google\.com/i.test(link)) {
        await api.post(`/sessions/${session.id}/materials`, {
          driveUrl: link.trim(),
          fileName: 'Google Drive',
          fileType: 'google_drive',
        });
      }

      const content = [
        homework.trim(),
        link.trim() ? `${t('portal.teacher.schedule.assignHomework.linkLabel')}: ${link.trim()}` : '',
        attachmentLine,
      ]
        .filter(Boolean)
        .join('\n');

      await api.put(`/sessions/${session.id}`, { notes: content });

      await api.post('/evaluations/bulk', {
        classId: session.classId,
        evaluationType: 'daily',
        evaluationDate: session.sessionDate,
        records: students.map((student) => ({
          studentId: student.id,
          comments: content,
        })),
      });
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('portal.teacher.schedule.assignHomework.success', { count: students?.length ?? 0 }),
        color: 'green',
      });
      onSuccess?.();
      onClose();
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message: err.response?.data?.error?.message ?? t('portal.teacher.schedule.assignHomework.failed'),
        color: 'red',
      });
    },
  });

  if (!session) return null;

  const isLoading = loadingStudents || loadingSession;
  const canSubmit = (homework.trim() || file || link.trim()) && students?.length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('portal.teacher.schedule.assignHomework.title')}
      size="lg"
    >
      <Stack gap="md">
        <div>
          <Text fw={600}>{session.className}</Text>
          <Text size="sm" c="dimmed">
            {session.sessionDate} · {session.startTime}–{session.endTime}
          </Text>
        </div>

        <Textarea
          label={t('portal.teacher.schedule.assignHomework.contentLabel')}
          placeholder={t('portal.teacher.schedule.assignHomework.contentPlaceholder')}
          minRows={4}
          value={homework}
          onChange={(e) => setHomework(e.currentTarget.value)}
        />

        <FileInput
          label={t('portal.teacher.schedule.assignHomework.fileLabel')}
          description={t('portal.teacher.schedule.assignHomework.fileHint')}
          placeholder={t('portal.teacher.schedule.assignHomework.filePlaceholder')}
          accept={ACCEPTED_FILES}
          leftSection={<IconUpload size={16} />}
          value={file}
          onChange={setFile}
          clearable
        />

        <TextInput
          label={t('portal.teacher.schedule.assignHomework.linkOptional')}
          description={t('portal.teacher.schedule.assignHomework.linkHint')}
          placeholder="https://drive.google.com/..."
          value={link}
          onChange={(e) => setLink(e.currentTarget.value)}
        />

        <Text size="xs" c="dimmed">
          {t('portal.teacher.schedule.assignHomework.storageNote')}
        </Text>

        <div>
          <Text size="sm" fw={500} mb={4}>
            {t('portal.teacher.schedule.assignHomework.studentsLabel', { count: students?.length ?? 0 })}
          </Text>
          {isLoading ? (
            <Loader size="sm" />
          ) : students?.length ? (
            <List size="sm" spacing={2} icon={<IconFile size={14} />}>
              {students.map((s) => (
                <List.Item key={s.id}>{s.fullName}</List.Item>
              ))}
            </List>
          ) : (
            <Text size="sm" c="dimmed">
              {t('portal.teacher.schedule.assignHomework.noStudents')}
            </Text>
          )}
        </div>

        <Group justify="flex-end">
          <Button variant="light" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            loading={assignMutation.isPending}
            disabled={!canSubmit}
          >
            {t('portal.teacher.schedule.assignHomework.submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
