import { Modal, Stack, Text, Button, Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { TeacherScheduleSession } from './schedule-utils';

interface Props {
  opened: boolean;
  session: TeacherScheduleSession | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteSessionModal({ opened, session, loading, onClose, onConfirm }: Props) {
  const { t } = useTranslation();

  if (!session) return null;

  return (
    <Modal opened={opened} onClose={onClose} title={t('portal.teacher.schedule.delete.title')} size="sm">
      <Stack gap="md">
        <Text size="sm">{t('portal.teacher.schedule.delete.message')}</Text>
        <Text fw={600}>{session.className}</Text>
        <Text size="sm" c="dimmed">
          {dayjs(session.sessionDate).format('DD/MM/YYYY')} · {session.startTime}–{session.endTime}
          {session.classroom ? ` · ${session.classroom}` : ''}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button color="red" loading={loading} onClick={onConfirm}>
            {t('portal.teacher.schedule.delete.confirm')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
