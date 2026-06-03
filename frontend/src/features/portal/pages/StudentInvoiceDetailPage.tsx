import { Stack, Title, Text, Paper, Group, Button, Badge } from '@mantine/core';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft } from '@tabler/icons-react';
import dayjs from 'dayjs';
import api from '@/lib/api';

const formatVnd = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

const STATUS: Record<string, { label: string; color: string }> = {
  issued: { label: 'Chờ thanh toán', color: 'blue' },
  paid: { label: 'Đã thanh toán', color: 'green' },
  overdue: { label: 'Quá hạn', color: 'red' },
};

export function StudentInvoiceDetailPage() {
  const { id } = useParams();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['portal-invoice', id],
    queryFn: async () => {
      const res = await api.get(`/portal/invoices/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const st = invoice ? STATUS[invoice.status] ?? { label: invoice.status, color: 'gray' } : null;

  return (
    <Stack gap="lg">
      <Button
        component={Link}
        to="/portal/tuition"
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        w="fit-content"
      >
        Quay lại học phí
      </Button>

      {isLoading ? (
        <Text c="dimmed">Đang tải...</Text>
      ) : !invoice ? (
        <Text c="red">Không tìm thấy phiếu thu.</Text>
      ) : (
        <Paper withBorder p="lg" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={3}>{invoice.invoiceNumber}</Title>
            {st && <Badge color={st.color}>{st.label}</Badge>}
          </Group>
          <Stack gap="xs">
            <Text>
              <Text span c="dimmed">
                Học sinh:{' '}
              </Text>
              {invoice.student?.fullName}
            </Text>
            <Text>
              <Text span c="dimmed">
                Ngày phát hành:{' '}
              </Text>
              {dayjs(invoice.issueDate).format('DD/MM/YYYY')}
            </Text>
            <Text>
              <Text span c="dimmed">
                Hạn thanh toán:{' '}
              </Text>
              {dayjs(invoice.dueDate).format('DD/MM/YYYY')}
            </Text>
            <Text fw={700} size="lg" mt="sm">
              Tổng: {formatVnd(invoice.totalAmount)}
            </Text>
            <Text>
              Đã thanh toán: {formatVnd(invoice.paidAmount)}
            </Text>
            <Text c="orange" fw={600}>
              Còn lại: {formatVnd(invoice.amountDue)}
            </Text>
          </Stack>
          <Text size="sm" c="dimmed" mt="lg">
            Vui lòng thanh toán theo hướng dẫn của trung tâm hoặc liên hệ phụ huynh / kế toán để nhận mã QR.
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
