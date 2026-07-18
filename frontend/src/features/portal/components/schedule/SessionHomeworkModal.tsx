import { Modal, Stack, Text, List, Anchor, Alert } from '@mantine/core';
import { IconFile, IconInfoCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { StudentScheduleSession } from './types';

interface Props {
  session: StudentScheduleSession | null;
  opened: boolean;
  onClose: () => void;
}

export function SessionHomeworkModal({ session, opened, onClose }: Props) {
  const { t } = useTranslation();

  if (!session) return null;

  const notes = session.notes?.trim() || null;
  const materials = session.materials ?? [];
  const hasHomework = Boolean(notes) || materials.length > 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('portal.student.schedule.homeworkModal.title')}
      centered
      size="lg"
    >
      <Stack gap="md">
        <div>
          <Text fw={600}>{session.className}</Text>
          <Text size="sm" c="dimmed">
            {dayjs(session.sessionDate).format('DD/MM/YYYY')} · {session.startTime}–{session.endTime}
            {session.classroom
              ? ` · ${t('portal.student.schedule.room', { room: session.classroom })}`
              : ''}
          </Text>
        </div>

        {!hasHomework ? (
          <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
            {t('portal.student.schedule.homeworkModal.empty')}
          </Alert>
        ) : (
          <>
            {notes && (
              <div>
                <Text size="sm" fw={500} mb={4}>
                  {t('portal.student.schedule.homeworkModal.content')}
                </Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {notes}
                </Text>
              </div>
            )}
            {materials.length > 0 && (
              <div>
                <Text size="sm" fw={500} mb={4}>
                  {t('portal.student.schedule.homeworkModal.files')}
                </Text>
                <List spacing={4} size="sm" icon={<IconFile size={14} />}>
                  {materials.map((m) => (
                    <List.Item key={m.id}>
                      <Anchor href={m.fileUrl} target="_blank" rel="noopener noreferrer" size="sm">
                        {m.fileName || t('portal.student.homework.openFile')}
                      </Anchor>
                    </List.Item>
                  ))}
                </List>
              </div>
            )}
          </>
        )}
      </Stack>
    </Modal>
  );
}
