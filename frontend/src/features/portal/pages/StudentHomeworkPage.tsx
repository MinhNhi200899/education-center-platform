import { Stack, Title, Text, Paper, Group, Badge, UnstyledButton } from '@mantine/core';
import { IconPaperclip, IconCheck, IconMessage } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { SessionHomeworkModal } from '../components/schedule/SessionHomeworkModal';
import type { StudentScheduleSession } from '../components/schedule/types';

export interface HomeworkMaterial {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
}

export interface HomeworkItem {
  sessionId: string;
  classId: string;
  className: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  materials: HomeworkMaterial[];
  submitted?: boolean;
  hasFeedback?: boolean;
  submittedAt?: string | null;
  feedbackAt?: string | null;
}

export function StudentHomeworkPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<StudentScheduleSession | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['portal-homework'],
    queryFn: async () => {
      const res = await api.get('/portal/homework');
      return res.data.data as { items: HomeworkItem[] };
    },
  });

  const items = data?.items ?? [];

  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (!sessionId || items.length === 0) return;
    const item = items.find((i) => i.sessionId === sessionId);
    if (!item) return;
    setSelected(toScheduleSession(item));
    const next = new URLSearchParams(searchParams);
    next.delete('session');
    setSearchParams(next, { replace: true });
  }, [searchParams, items, setSearchParams]);

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t('portal.student.homework.title')}</Title>
        <Text c="dimmed" size="sm">
          {t('portal.student.homework.subtitle')}
        </Text>
      </div>

      {isLoading ? (
        <Text c="dimmed">{t('portal.student.homework.loading')}</Text>
      ) : items.length === 0 ? (
        <Paper withBorder p="md" radius="md">
          <Text c="dimmed">{t('portal.student.homework.empty')}</Text>
        </Paper>
      ) : (
        <Stack gap="md">
          {items.map((item) => (
            <HomeworkCard
              key={item.sessionId}
              item={item}
              onOpen={() => setSelected(toScheduleSession(item))}
            />
          ))}
        </Stack>
      )}

      <SessionHomeworkModal
        session={selected}
        opened={!!selected}
        onClose={() => setSelected(null)}
      />
    </Stack>
  );
}

function toScheduleSession(item: HomeworkItem): StudentScheduleSession {
  return {
    id: item.sessionId,
    classId: item.classId,
    className: item.className,
    sessionDate:
      typeof item.sessionDate === 'string'
        ? item.sessionDate.split('T')[0]
        : dayjs(item.sessionDate).format('YYYY-MM-DD'),
    startTime: item.startTime,
    endTime: item.endTime,
    notes: item.notes,
    materials: item.materials,
    hasHomework: true,
    status: 'scheduled',
  };
}

export function HomeworkCard({ item, onOpen }: { item: HomeworkItem; onOpen: () => void }) {
  const { t } = useTranslation();

  return (
    <UnstyledButton onClick={onOpen} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
      <Paper withBorder p="md" radius="md" style={{ cursor: 'pointer' }}>
        <Group justify="space-between" align="flex-start" mb="xs" wrap="wrap">
          <div>
            <Text fw={600}>{item.className}</Text>
            <Text size="sm" c="dimmed">
              {dayjs(item.sessionDate).format('DD/MM/YYYY')} · {item.startTime}–{item.endTime}
            </Text>
          </div>
          <Group gap="xs">
            {item.hasFeedback ? (
              <Badge leftSection={<IconMessage size={12} />} variant="light" color="indigo">
                {t('portal.student.homework.hasFeedback')}
              </Badge>
            ) : item.submitted ? (
              <Badge leftSection={<IconCheck size={12} />} variant="light" color="teal">
                {t('portal.student.homework.submitted')}
              </Badge>
            ) : (
              <Badge variant="light" color="orange">
                {t('portal.student.homework.notSubmitted')}
              </Badge>
            )}
            {item.materials.length > 0 && (
              <Badge leftSection={<IconPaperclip size={12} />} variant="light">
                {t('portal.student.homework.attachments', { count: item.materials.length })}
              </Badge>
            )}
          </Group>
        </Group>

        {item.notes && (
          <Text size="sm" lineClamp={3} style={{ whiteSpace: 'pre-wrap' }}>
            {item.notes}
          </Text>
        )}

        <Text size="xs" c="dimmed" mt="sm">
          {t('portal.student.homework.openHint')}
        </Text>
      </Paper>
    </UnstyledButton>
  );
}
