import {
  Stack,
  Title,
  Text,
  SimpleGrid,
  Card,
  Group,
  ThemeIcon,
  Button,
  Select,
  Badge,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  IconCalendarCheck,
  IconCalendarMonth,
  IconList,
  IconWifiOff,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import api from '@/lib/api';
import { getPendingCount, syncOfflineQueue } from '@/lib/attendance-offline';
import type { Class } from '@/types';

export function AttendanceHubPage() {
  const navigate = useNavigate();
  const [classId, setClassId] = useState<string | null>(null);
  const [pending, setPending] = useState(getPendingCount());

  const { data: classes } = useQuery({
    queryKey: ['classes', 'attendance-hub'],
    queryFn: async () => {
      const res = await api.get('/classes?limit=100&status=active');
      return res.data.data as Class[];
    },
  });

  const { data: todaySessions } = useQuery({
    queryKey: ['class-sessions-today', classId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get(
        `/classes/${classId}/sessions?startDate=${today}&endDate=${today}`
      );
      return res.data.data as Array<{ id: string; sessionDate: string; startTime: string }>;
    },
    enabled: !!classId,
  });

  useEffect(() => {
    const runSync = async () => {
      if (!navigator.onLine || getPendingCount() === 0) return;
      const result = await syncOfflineQueue();
      if (result.synced > 0) {
        notifications.show({
          title: 'Đồng bộ offline',
          message: `Đã gửi ${result.synced} bản ghi điểm danh`,
          color: 'teal',
        });
        setPending(getPendingCount());
      }
    };
    runSync();
    window.addEventListener('online', runSync);
    return () => window.removeEventListener('online', runSync);
  }, []);

  const todaySessionId = todaySessions?.[0]?.id;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Điểm danh thông minh</Title>
          <Text c="dimmed" size="sm">
            Chấm nhanh CÓ/VẮNG, điểm danh cả tháng, hỗ trợ offline
          </Text>
        </div>
        {pending > 0 && (
          <Badge color="orange" leftSection={<IconWifiOff size={14} />}>
            {pending} chờ đồng bộ
          </Badge>
        )}
      </Group>

      <Select
        label="Chọn lớp"
        placeholder="Chọn lớp học"
        data={classes?.map((c) => ({ value: c.id, label: c.name })) || []}
        value={classId}
        onChange={setClassId}
        searchable
      />

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          style={{ cursor: classId && todaySessionId ? 'pointer' : 'not-allowed', opacity: classId && todaySessionId ? 1 : 0.6 }}
          onClick={() => {
            if (classId && todaySessionId) {
              navigate(`/attendance/mark/${todaySessionId}?classId=${classId}`);
            }
          }}
        >
          <ThemeIcon size={48} radius="md" color="green" variant="light" mb="md">
            <IconCalendarCheck size={28} />
          </ThemeIcon>
          <Text fw={700}>Điểm danh nhanh</Text>
          <Text size="sm" c="dimmed" mt="xs">
            Một chạm CÓ / VẮNG cho buổi hôm nay, ghi lý do vắng ngay
          </Text>
          {!todaySessionId && classId && (
            <Text size="xs" c="orange" mt="sm">
              Chưa có buổi học hôm nay — tạo buổi ở mục điểm danh tháng
            </Text>
          )}
        </Card>

        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          style={{ cursor: classId ? 'pointer' : 'not-allowed', opacity: classId ? 1 : 0.6 }}
          onClick={() => classId && navigate(`/attendance/monthly/${classId}`)}
        >
          <ThemeIcon size={48} radius="md" color="blue" variant="light" mb="md">
            <IconCalendarMonth size={28} />
          </ThemeIcon>
          <Text fw={700}>Điểm danh cả tháng</Text>
          <Text size="sm" c="dimmed" mt="xs">
            Lưới tháng — kéo chuột để điền hàng loạt
          </Text>
        </Card>

        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/attendance/history')}
        >
          <ThemeIcon size={48} radius="md" color="gray" variant="light" mb="md">
            <IconList size={28} />
          </ThemeIcon>
          <Text fw={700}>Lịch sử điểm danh</Text>
          <Text size="sm" c="dimmed" mt="xs">
            Xem, lọc theo lớp và trạng thái
          </Text>
        </Card>
      </SimpleGrid>

      {classId && !todaySessionId && (
        <Button
          variant="light"
          onClick={() => navigate(`/attendance/monthly/${classId}`)}
        >
          Tạo buổi học tháng này rồi điểm danh
        </Button>
      )}
    </Stack>
  );
}
