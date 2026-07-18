import { Stack, Title, Text, Paper, Group, Anchor, Badge, List } from '@mantine/core';
import { IconFile, IconPaperclip } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

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
}

export function StudentHomeworkPage() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['portal-homework'],
    queryFn: async () => {
      const res = await api.get('/portal/homework');
      return res.data.data as { items: HomeworkItem[] };
    },
  });

  const items = data?.items ?? [];

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
            <HomeworkCard key={item.sessionId} item={item} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function HomeworkCard({ item }: { item: HomeworkItem }) {
  const { t } = useTranslation();

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" align="flex-start" mb="xs" wrap="wrap">
        <div>
          <Text fw={600}>{item.className}</Text>
          <Text size="sm" c="dimmed">
            {dayjs(item.sessionDate).format('DD/MM/YYYY')} · {item.startTime}–{item.endTime}
          </Text>
        </div>
        {item.materials.length > 0 && (
          <Badge leftSection={<IconPaperclip size={12} />} variant="light">
            {t('portal.student.homework.attachments', { count: item.materials.length })}
          </Badge>
        )}
      </Group>

      {item.notes && (
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} mb={item.materials.length ? 'sm' : 0}>
          {item.notes}
        </Text>
      )}

      {item.materials.length > 0 && (
        <List spacing={4} size="sm" icon={<IconFile size={14} />}>
          {item.materials.map((m) => (
            <List.Item key={m.id}>
              <Anchor href={m.fileUrl} target="_blank" rel="noopener noreferrer" size="sm">
                {m.fileName || t('portal.student.homework.openFile')}
              </Anchor>
            </List.Item>
          ))}
        </List>
      )}
    </Paper>
  );
}
