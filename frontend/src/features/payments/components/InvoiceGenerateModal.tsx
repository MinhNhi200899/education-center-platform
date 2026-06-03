import {
  Modal,
  Stack,
  Select,
  Button,
  Group,
  Text,
  Switch,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import api from '@/lib/api';
import type { Class } from '@/types';

interface InvoiceGenerateModalProps {
  opened: boolean;
  onClose: () => void;
}

export function InvoiceGenerateModal({ opened, onClose }: InvoiceGenerateModalProps) {
  const queryClient = useQueryClient();
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const form = useForm({
    initialValues: {
      classId: '',
      tuitionPlanId: '',
      periodStart: format(monthStart, 'yyyy-MM-dd'),
      periodEnd: format(monthEnd, 'yyyy-MM-dd'),
      prorated: true,
      autoIssue: true,
    },
  });

  const { data: classes } = useQuery({
    queryKey: ['classes', 'invoice-generate'],
    queryFn: async () => {
      const res = await api.get('/classes?limit=100&status=active');
      return res.data.data as Class[];
    },
    enabled: opened,
  });

  const { data: plans } = useQuery({
    queryKey: ['tuition-plans', form.values.classId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50', isActive: 'true' });
      if (form.values.classId) params.set('classId', form.values.classId);
      const res = await api.get(`/tuition/plans?${params}`);
      return res.data.data as Array<{ id: string; name: string; amount: number }>;
    },
    enabled: opened,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/tuition/invoices/generate-from-attendance', form.values);
      return res.data.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Tạo phiếu thu thành công',
        message: `Đã tạo ${data.generated} phiếu thu (${data.skipped} bỏ qua)`,
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Lỗi',
        message: error.response?.data?.error?.message || 'Không thể tạo phiếu thu',
        color: 'red',
      });
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Tạo phiếu thu từ điểm danh" size="md">
      <Stack gap="md">
        <Alert color="blue" variant="light">
          Hệ thống tính học phí theo số buổi có mặt trong kỳ (present/late) × mức phí gói học phí.
        </Alert>

        <Select
          label="Lớp học"
          placeholder="Chọn lớp"
          data={classes?.map((c) => ({ value: c.id, label: c.name })) || []}
          searchable
          required
          {...form.getInputProps('classId')}
        />

        <Select
          label="Gói học phí"
          placeholder="Chọn gói học phí"
          data={plans?.map((p) => ({
            value: p.id,
            label: `${p.name} (${new Intl.NumberFormat('vi-VN').format(p.amount)} đ/tháng)`,
          })) || []}
          searchable
          required
          {...form.getInputProps('tuitionPlanId')}
        />

        <Group grow>
          <Text size="sm" c="dimmed">
            Từ: {form.values.periodStart}
          </Text>
          <Text size="sm" c="dimmed">
            Đến: {form.values.periodEnd}
          </Text>
        </Group>

        <Switch
          label="Tính theo tỷ lệ buổi học (prorated)"
          {...form.getInputProps('prorated', { type: 'checkbox' })}
        />
        <Switch
          label="Phát hành ngay (issued)"
          {...form.getInputProps('autoIssue', { type: 'checkbox' })}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Hủy
          </Button>
          <Button
            loading={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
            disabled={!form.values.classId || !form.values.tuitionPlanId}
          >
            Tạo phiếu thu
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
