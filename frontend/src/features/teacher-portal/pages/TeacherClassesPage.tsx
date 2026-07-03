import { Stack, Title, Text, Paper, Group, Badge, SimpleGrid } from '@mantine/core';
import { IconSchool } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import {
  ClassStudentsModal,
  type TeacherClassSummary,
} from '../components/ClassStudentsModal';

export function TeacherClassesPage() {
  const { t } = useTranslation();
  const [selectedClass, setSelectedClass] = useState<TeacherClassSummary | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-portal-classes'],
    queryFn: async () => {
      const res = await api.get('/teacher-portal/classes');
      return res.data.data as Array<{
        classId: string;
        className: string;
        classroom?: string;
        status: string;
        studentCount: number;
        role: string;
        academicLevel?: string;
      }>;
    },
  });

  return (
    <Stack gap="lg">
      <Title order={2}>{t('portal.teacher.classes.title')}</Title>
      <Text c="dimmed" size="sm">
        {t('portal.teacher.classes.subtitle')}
      </Text>

      {isLoading ? (
        <Text c="dimmed">{t('portal.teacher.classes.loading')}</Text>
      ) : (data?.length ?? 0) === 0 ? (
        <Paper withBorder p="xl" radius="md">
          <Text ta="center" c="dimmed">
            {t('portal.teacher.classes.empty')}
          </Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {data!.map((c) => (
            <Paper
              key={c.classId}
              withBorder
              p="md"
              radius="md"
              style={{ cursor: 'pointer' }}
              onClick={() =>
                setSelectedClass({
                  classId: c.classId,
                  className: c.className,
                  classroom: c.classroom,
                })
              }
            >
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconSchool size={20} />
                  <Text fw={600}>{c.className}</Text>
                </Group>
                {c.role === 'primary' && (
                  <Badge color="blue" size="sm">
                    {t('portal.teacher.classes.primaryBadge')}
                  </Badge>
                )}
              </Group>
              {c.classroom && (
                <Text size="sm" c="dimmed">
                  {t('portal.teacher.schedule.room', { room: c.classroom })}
                </Text>
              )}
              <Group mt="md" gap="xs">
                <Badge variant="light">
                  {t('portal.teacher.classes.studentCount', { count: c.studentCount })}
                </Badge>
                <Badge variant="outline">{c.status}</Badge>
                {c.academicLevel && (
                  <Badge variant="outline" color="gray">
                    {c.academicLevel}
                  </Badge>
                )}
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      <ClassStudentsModal
        classInfo={selectedClass}
        opened={!!selectedClass}
        onClose={() => setSelectedClass(null)}
      />
    </Stack>
  );
}
