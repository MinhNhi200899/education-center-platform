import {
  Stack,
  Title,
  Paper,
  Table,
  Text,
  Badge,
  Group,
  Pagination,
  Select,
  TextInput,
  Button,
  ActionIcon,
} from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconEye, IconSearch, IconPlus, IconBell } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import api from '@/lib/api';
import type { Invoice } from '@/types';
import { InvoiceGenerateModal } from '../components/InvoiceGenerateModal';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  issued: 'Đã phát hành',
  paid: 'Đã thanh toán',
  overdue: 'Quá hạn',
  cancelled: 'Đã hủy',
};

export function InvoiceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['invoices', page, status, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(status && { status }),
        ...(search && { search }),
      });
      const response = await api.get(`/tuition/invoices?${params}`);
      return response.data;
    },
  });

  const remindersMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/tuition/invoices/send-reminders', {});
      return res.data.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Gửi nhắc nợ',
        message: `Đã gửi ${data.sent} thông báo (${data.skipped} bỏ qua)`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Lỗi',
        message: error.response?.data?.error?.message || 'Không thể gửi nhắc nợ',
        color: 'red',
      });
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

  const getStatusColor = (s: string) =>
    ({ draft: 'gray', issued: 'blue', paid: 'green', overdue: 'red', cancelled: 'gray' }[s] || 'gray');

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Phiếu thu học phí</Title>
          <Text c="dimmed" size="sm">
            Quản lý phiếu thu, tạo tự động từ điểm danh, nhắc nợ
          </Text>
        </div>
        <Group>
          <Button
            variant="light"
            leftSection={<IconBell size={16} />}
            loading={remindersMutation.isPending}
            onClick={() => remindersMutation.mutate()}
          >
            Gửi nhắc nợ
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setGenerateOpen(true)}>
            Tạo từ điểm danh
          </Button>
        </Group>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <Group mb="md">
          <TextInput
            placeholder="Tìm theo số phiếu..."
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            placeholder="Lọc trạng thái"
            data={[
              { value: 'draft', label: 'Nháp' },
              { value: 'issued', label: 'Đã phát hành' },
              { value: 'paid', label: 'Đã thanh toán' },
              { value: 'overdue', label: 'Quá hạn' },
              { value: 'cancelled', label: 'Đã hủy' },
            ]}
            value={status}
            onChange={setStatus}
            clearable
            w={180}
          />
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Số phiếu</Table.Th>
              <Table.Th>Học sinh</Table.Th>
              <Table.Th>Số tiền</Table.Th>
              <Table.Th>Trạng thái</Table.Th>
              <Table.Th>Ngày phát hành</Table.Th>
              <Table.Th>Hạn thanh toán</Table.Th>
              <Table.Th w={80}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.data?.map((invoice: Invoice) => (
              <Table.Tr key={invoice.id}>
                <Table.Td>
                  <Text fw={500}>{invoice.invoiceNumber}</Text>
                </Table.Td>
                <Table.Td>{invoice.student?.fullName || '-'}</Table.Td>
                <Table.Td>{formatCurrency(invoice.totalAmount)}</Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(invoice.status)} variant="light">
                    {STATUS_LABELS[invoice.status] || invoice.status}
                  </Badge>
                </Table.Td>
                <Table.Td>{new Date(invoice.issueDate).toLocaleDateString('vi-VN')}</Table.Td>
                <Table.Td>{new Date(invoice.dueDate).toLocaleDateString('vi-VN')}</Table.Td>
                <Table.Td>
                  <ActionIcon variant="subtle" onClick={() => navigate(`/payments/invoice/${invoice.id}`)}>
                    <IconEye size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {data?.data?.length === 0 && (
          <Stack align="center" py="xl">
            <Text c="dimmed">Chưa có phiếu thu</Text>
          </Stack>
        )}

        {data && data.meta.totalPages > 1 && (
          <Group justify="center" p="md">
            <Pagination total={data.meta.totalPages} value={page} onChange={setPage} />
          </Group>
        )}
      </Paper>

      <InvoiceGenerateModal opened={generateOpen} onClose={() => setGenerateOpen(false)} />
    </Stack>
  );
}
