import { Stack, Title, Text, Paper, Table, Badge, Button, Group } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '@/lib/api';

const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Nháp', color: 'gray' },
  issued: { label: 'Chờ thanh toán', color: 'blue' },
  paid: { label: 'Đã thanh toán', color: 'green' },
  overdue: { label: 'Quá hạn', color: 'red' },
  cancelled: { label: 'Đã hủy', color: 'gray' },
};

const formatVnd = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

export function StudentTuitionPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portal-invoices'],
    queryFn: async () => {
      const res = await api.get('/portal/invoices');
      return res.data.data as Array<{
        id: string;
        invoiceNumber: string;
        totalAmount: number;
        paidAmount: number;
        amountDue: number;
        dueDate: string;
        issueDate: string;
        status: string;
      }>;
    },
  });

  const pending = data?.filter((i) => ['issued', 'overdue'].includes(i.status)) ?? [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Học phí & thông báo đóng tiền</Title>
        <Text c="dimmed" size="sm">
          Phiếu thu và nhắc thanh toán dành cho bạn
        </Text>
      </div>

      {pending.length > 0 && (
        <Paper withBorder p="md" radius="md" bg="orange.0">
          <Text fw={600} mb="xs">
            Cần thanh toán ({pending.length})
          </Text>
          <Stack gap="xs">
            {pending.map((inv) => (
              <Group key={inv.id} justify="space-between">
                <Text size="sm">
                  {inv.invoiceNumber} · hạn {dayjs(inv.dueDate).format('DD/MM/YYYY')}
                </Text>
                <Text fw={600} c="orange">
                  {formatVnd(inv.amountDue)}
                </Text>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      <Paper withBorder p="md" radius="md">
        {isLoading ? (
          <Text c="dimmed">Đang tải...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Số phiếu</Table.Th>
                <Table.Th>Ngày phát hành</Table.Th>
                <Table.Th>Hạn thanh toán</Table.Th>
                <Table.Th>Số tiền</Table.Th>
                <Table.Th>Trạng thái</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data ?? []).map((inv) => {
                const st = STATUS[inv.status] ?? { label: inv.status, color: 'gray' };
                return (
                  <Table.Tr key={inv.id}>
                    <Table.Td>{inv.invoiceNumber}</Table.Td>
                    <Table.Td>{dayjs(inv.issueDate).format('DD/MM/YYYY')}</Table.Td>
                    <Table.Td>{dayjs(inv.dueDate).format('DD/MM/YYYY')}</Table.Td>
                    <Table.Td>{formatVnd(inv.totalAmount)}</Table.Td>
                    <Table.Td>
                      <Badge color={st.color}>{st.label}</Badge>
                    </Table.Td>
                    <Table.Td>
                      {['issued', 'overdue'].includes(inv.status) && (
                        <Button
                          component={Link}
                          to={`/portal/tuition/${inv.id}`}
                          size="xs"
                          variant="light"
                        >
                          Chi tiết
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
