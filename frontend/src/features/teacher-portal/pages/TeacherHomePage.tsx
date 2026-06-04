import { Stack, Title, Text, Paper, Group, Badge, Button, SimpleGrid, Alert } from '@mantine/core';
import { IconCalendar, IconSchool, IconClipboardCheck, IconBell } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '@/lib/api';

export function TeacherHomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-portal-dashboard'],
    queryFn: async () => {
      const res = await api.get('/teacher-portal/dashboard');
      return res.data.data;
    },
  });

  if (isLoading) {
    return <Text c="dimmed">Đang tải...</Text>;
  }

  const todayCount = data?.todaySessions?.length ?? 0;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Xin chào, {data?.profile?.fullName ?? 'giáo viên'}</Title>
        <Text c="dimmed" size="sm">
          {data?.profile?.center?.name ?? 'Education Center'}
        </Text>
      </div>

      {todayCount > 0 && (
        <Alert icon={<IconBell size={18} />} color="blue" title="Buổi dạy hôm nay">
          Bạn có {todayCount} buổi dạy hôm nay.{' '}
          <Button component={Link} to="/teacher/schedule" variant="white" size="xs" ml="xs">
            Xem lịch
          </Button>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Lớp đang dạy
            </Text>
            <IconSchool size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs">
            {data?.classes?.length ?? 0}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Buổi dạy sắp tới
            </Text>
            <IconCalendar size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs">
            {data?.upcomingSessions?.length ?? 0}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Buổi dạy hôm nay
            </Text>
            <IconClipboardCheck size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs" c={todayCount > 0 ? 'blue' : undefined}>
            {todayCount}
          </Text>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>Lịch dạy sắp tới</Title>
          <Button component={Link} to="/teacher/schedule" variant="light" size="xs">
            Xem lịch đầy đủ
          </Button>
        </Group>
        {(data?.upcomingSessions?.length ?? 0) === 0 ? (
          <Text c="dimmed" size="sm">
            Chưa có buổi dạy nào trong lịch.
          </Text>
        ) : (
          <Stack gap="xs">
            {data.upcomingSessions.map((s: {
              id: string;
              className: string;
              sessionDate: string;
              startTime: string;
              endTime: string;
              classroom?: string;
            }) => (
              <Group key={s.id} justify="space-between" wrap="nowrap">
                <div>
                  <Text fw={500}>{s.className}</Text>
                  <Text size="xs" c="dimmed">
                    {dayjs(s.sessionDate).format('DD/MM/YYYY')} · {s.startTime}–{s.endTime}
                    {s.classroom ? ` · ${s.classroom}` : ''}
                  </Text>
                </div>
                <Badge variant="light">Sắp diễn ra</Badge>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>Lớp của tôi</Title>
          <Button component={Link} to="/teacher/classes" variant="light" size="xs">
            Xem tất cả
          </Button>
        </Group>
        {(data?.classes?.length ?? 0) === 0 ? (
          <Text c="dimmed" size="sm">
            Chưa được phân công lớp.
          </Text>
        ) : (
          <Stack gap="xs">
            {data.classes.map((c: {
              classId: string;
              className: string;
              classroom?: string;
              studentCount?: number;
              role?: string;
            }) => (
              <Group key={c.classId} justify="space-between">
                <div>
                  <Text fw={500}>{c.className}</Text>
                  {c.classroom && (
                    <Text size="xs" c="dimmed">
                      {c.classroom}
                    </Text>
                  )}
                </div>
                <Group gap="xs">
                  {c.studentCount != null && (
                    <Badge variant="outline">{c.studentCount} HS</Badge>
                  )}
                  {c.role === 'primary' && <Badge color="blue">Chủ nhiệm</Badge>}
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
