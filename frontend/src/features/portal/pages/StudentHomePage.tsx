import { Stack, Title, Text, Paper, Group, Badge, Button, SimpleGrid, Alert } from '@mantine/core';
import { IconCalendar, IconSchool, IconReceipt, IconBell } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '@/lib/api';

export function StudentHomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: async () => {
      const res = await api.get('/portal/dashboard');
      return res.data.data;
    },
  });

  if (isLoading) {
    return <Text c="dimmed">Đang tải...</Text>;
  }

  const pendingCount = data?.pendingInvoices?.length ?? 0;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Xin chào, {data?.profile?.fullName ?? 'học sinh'}</Title>
        <Text c="dimmed" size="sm">
          {data?.profile?.center?.name ?? 'Education Center'}
        </Text>
      </div>

      {pendingCount > 0 && (
        <Alert icon={<IconBell size={18} />} color="orange" title="Nhắc đóng học phí">
          Bạn có {pendingCount} phiếu thu chưa thanh toán.{' '}
          <Button component={Link} to="/portal/tuition" variant="white" size="xs" ml="xs">
            Xem ngay
          </Button>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Lớp đang học
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
              Buổi học sắp tới
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
              Phiếu thu chưa đóng
            </Text>
            <IconReceipt size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs" c={pendingCount > 0 ? 'orange' : undefined}>
            {pendingCount}
          </Text>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>Lịch học sắp tới</Title>
          <Button component={Link} to="/portal/schedule" variant="light" size="xs">
            Xem lịch đầy đủ
          </Button>
        </Group>
        {(data?.upcomingSessions?.length ?? 0) === 0 ? (
          <Text c="dimmed" size="sm">
            Chưa có buổi học nào trong lịch.
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
        <Title order={4} mb="md">
          Lớp của tôi
        </Title>
        {(data?.classes?.length ?? 0) === 0 ? (
          <Text c="dimmed" size="sm">
            Chưa được xếp lớp.
          </Text>
        ) : (
          <Stack gap="xs">
            {data.classes.map((c: { classId: string; className: string; classroom?: string }) => (
              <Group key={c.classId} justify="space-between">
                <Text fw={500}>{c.className}</Text>
                {c.classroom && (
                  <Text size="sm" c="dimmed">
                    {c.classroom}
                  </Text>
                )}
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
