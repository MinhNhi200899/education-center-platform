import {
  ActionIcon,
  Indicator,
  Menu,
  Text,
  ScrollArea,
  Stack,
  Group,
  Button,
  Badge,
} from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { isStudentUser } from '@/lib/roles';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data as { unreadCount: number; items: NotificationItem[] };
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  const handleClickItem = (item: NotificationItem) => {
    if (!item.isRead) markReadMutation.mutate(item.id);

    if (item.type === 'tuition_invoice' && isStudentUser(user)) {
      const invoiceId = (item.data as { invoiceId?: string } | null)?.invoiceId;
      if (invoiceId) navigate(`/portal/tuition/${invoiceId}`);
      else navigate('/portal/tuition');
      return;
    }

    if (item.type === 'homework_submission' && !isStudentUser(user)) {
      const sessionId = (item.data as { sessionId?: string; studentId?: string } | null)?.sessionId;
      const studentId = (item.data as { studentId?: string } | null)?.studentId;
      if (sessionId) {
        const params = new URLSearchParams({ reviewSession: sessionId });
        if (studentId) params.set('studentId', studentId);
        navigate(`/teacher/schedule?${params.toString()}`);
      } else {
        navigate('/teacher/schedule');
      }
      return;
    }

    if (item.type === 'homework_feedback' && isStudentUser(user)) {
      const sessionId = (item.data as { sessionId?: string } | null)?.sessionId;
      if (sessionId) navigate(`/portal/homework?session=${sessionId}`);
      else navigate('/portal/homework');
    }
  };

  return (
    <Menu shadow="md" width={360} position="bottom-end" withinPortal>
      <Menu.Target>
        <Indicator inline label={unread > 0 ? unread : undefined} size={16} disabled={unread === 0} color="red">
          <ActionIcon variant="subtle" color="gray" size="lg" radius="md" aria-label={t('header.notifications')}>
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Menu.Target>

      <Menu.Dropdown>
        <Group justify="space-between" px="sm" py={6}>
          <Text size="sm" fw={600}>
            {t('notifications.title')}
          </Text>
          {unread > 0 && (
            <Button variant="subtle" size="compact-xs" onClick={() => markAllMutation.mutate()}>
              {t('notifications.markAllRead')}
            </Button>
          )}
        </Group>
        <Menu.Divider />
        <ScrollArea.Autosize mah={320}>
          {items.length === 0 ? (
            <Text size="sm" c="dimmed" p="md" ta="center">
              {t('notifications.empty')}
            </Text>
          ) : (
            <Stack gap="xs" p="xs">
              {items.map((item) => (
                <Menu.Item
                  key={item.id}
                  onClick={() => handleClickItem(item)}
                  style={{
                    background: item.isRead ? undefined : 'var(--mantine-color-blue-0)',
                    whiteSpace: 'normal',
                    height: 'auto',
                    paddingTop: 10,
                    paddingBottom: 10,
                    borderRadius: 'var(--mantine-radius-sm)',
                  }}
                >
                  <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" fw={item.isRead ? 500 : 700} lineClamp={1}>
                        {item.title}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {item.message}
                      </Text>
                      <Text size="xs" c="dimmed" mt={4}>
                        {dayjs(item.createdAt).format('HH:mm DD/MM')}
                      </Text>
                    </div>
                    {!item.isRead && <Badge size="xs" circle color="blue" />}
                  </Group>
                </Menu.Item>
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
}
