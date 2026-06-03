import {
  Drawer,
  Stack,
  Text,
  Group,
  Textarea,
  Select,
  TextInput,
  Button,
  Anchor,
  Divider,
  List,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { IconBrandGoogleDrive, IconLink } from '@tabler/icons-react';
import api from '@/lib/api';
import type { SessionDetail, SessionStatus } from '../types';
import { SessionStatusBadge } from './SessionStatusBadge';

interface Props {
  sessionId: string | null;
  opened: boolean;
  onClose: () => void;
}

export function SessionDetailDrawer({ sessionId, opened, onClose }: Props) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<SessionStatus>('scheduled');
  const [driveUrl, setDriveUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: async () => {
      const res = await api.get(`/sessions/${sessionId}`);
      return res.data.data as SessionDetail;
    },
    enabled: !!sessionId && opened,
  });

  useEffect(() => {
    if (!session) return;
    setNotes(session.notes ?? '');
    setStatus(session.status);
  }, [session]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { notes?: string; status?: SessionStatus }) => {
      await api.put(`/sessions/${sessionId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-weekly'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-monthly'] });
      queryClient.invalidateQueries({ queryKey: ['session-detail', sessionId] });
    },
    onError: () => {
      notifications.show({
        title: 'Lỗi',
        message: 'Không thể cập nhật buổi học',
        color: 'red',
      });
    },
  });

  const materialMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/sessions/${sessionId}/materials`, {
        driveUrl,
        fileName: fileName || undefined,
      });
    },
    onSuccess: () => {
      notifications.show({
        title: 'Đã lưu tài liệu',
        message: 'Liên kết Google Drive đã được gắn vào buổi học',
        color: 'green',
      });
      setDriveUrl('');
      setFileName('');
      queryClient.invalidateQueries({ queryKey: ['session-detail', sessionId] });
    },
    onError: () => {
      notifications.show({
        title: 'Lỗi',
        message: 'Không thể thêm tài liệu',
        color: 'red',
      });
    },
  });

  const scheduleNotesSave = (value: string) => {
    if (!sessionId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateMutation.mutate({ notes: value });
    }, 600);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    scheduleNotesSave(value);
  };

  const handleStatusChange = (value: string | null) => {
    if (!value) return;
    const next = value as SessionStatus;
    setStatus(next);
    updateMutation.mutate({ status: next });
  };

  if (!sessionId) return null;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Chi tiết buổi học"
      position="right"
      size="md"
    >
      {isLoading || !session ? (
        <Text c="dimmed" size="sm">
          Đang tải...
        </Text>
      ) : (
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text fw={600}>{session.class?.name}</Text>
              <Text size="sm" c="dimmed">
                {session.sessionDate} · {session.startTime}–{session.endTime}
                {session.classroom ? ` · ${session.classroom}` : ''}
              </Text>
            </div>
            <SessionStatusBadge status={session.status} />
          </Group>

          {session.teacher && (
            <Text size="sm">
              Giáo viên: <strong>{session.teacher.fullName}</strong>
            </Text>
          )}

          <Select
            label="Trạng thái buổi học"
            value={status}
            onChange={handleStatusChange}
            data={[
              { value: 'scheduled', label: 'Đã lên lịch' },
              { value: 'completed', label: 'Đã dạy' },
              { value: 'cancelled', label: 'Đã hủy' },
            ]}
          />

          <Textarea
            label="Ghi chú buổi dạy"
            description="Tự động lưu sau khi ngừng gõ"
            minRows={4}
            value={notes}
            onChange={(e) => handleNotesChange(e.currentTarget.value)}
          />

          <Divider label="Tài liệu Google Drive" labelPosition="center" />

          {session.googleDriveFolderId && (
            <Text size="xs" c="dimmed">
              Thư mục trung tâm (stub): {session.googleDriveFolderId}
            </Text>
          )}

          {session.materials.length > 0 && (
            <List spacing="xs" size="sm" icon={<IconLink size={14} />}>
              {session.materials.map((m) => (
                <List.Item key={m.id}>
                  <Anchor href={m.fileUrl} target="_blank" rel="noopener noreferrer" size="sm">
                    {m.fileName}
                  </Anchor>
                </List.Item>
              ))}
            </List>
          )}

          <TextInput
            label="Liên kết Google Drive"
            placeholder="https://drive.google.com/file/d/..."
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.currentTarget.value)}
            leftSection={<IconBrandGoogleDrive size={16} />}
          />
          <TextInput
            label="Tên tệp (tuỳ chọn)"
            value={fileName}
            onChange={(e) => setFileName(e.currentTarget.value)}
          />
          <Button
            onClick={() => materialMutation.mutate()}
            loading={materialMutation.isPending}
            disabled={!driveUrl.trim()}
          >
            Gắn liên kết Drive
          </Button>
        </Stack>
      )}
    </Drawer>
  );
}
