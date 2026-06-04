import { Stack, Title, Text, Paper, Group, Badge, SimpleGrid } from '@mantine/core';
import { IconSchool } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function TeacherClassesPage() {
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
      <Title order={2}>Lớp của tôi</Title>
      <Text c="dimmed" size="sm">
        Danh sách lớp bạn đang phụ trách
      </Text>

      {isLoading ? (
        <Text c="dimmed">Đang tải...</Text>
      ) : (data?.length ?? 0) === 0 ? (
        <Paper withBorder p="xl" radius="md">
          <Text ta="center" c="dimmed">
            Chưa được phân công lớp nào.
          </Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {data!.map((c) => (
            <Paper key={c.classId} withBorder p="md" radius="md">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconSchool size={20} />
                  <Text fw={600}>{c.className}</Text>
                </Group>
                {c.role === 'primary' && <Badge color="blue" size="sm">Chủ nhiệm</Badge>}
              </Group>
              {c.classroom && (
                <Text size="sm" c="dimmed">
                  Phòng: {c.classroom}
                </Text>
              )}
              <Group mt="md" gap="xs">
                <Badge variant="light">{c.studentCount} học sinh</Badge>
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
    </Stack>
  );
}
