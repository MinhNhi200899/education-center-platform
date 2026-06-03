import { Modal, Table, Text, Loader, Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { RevenueDrilldownData } from '../types';
import { formatVnd } from './RevenueCharts';

interface Props {
  opened: boolean;
  onClose: () => void;
  classId: string | null;
  className: string;
  year: number;
  month: number;
}

export function RevenueDrilldownModal({
  opened,
  onClose,
  classId,
  className,
  year,
  month,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'revenue-drilldown', classId, year, month],
    queryFn: async () => {
      const params = new URLSearchParams({
        classId: classId!,
        year: String(year),
        month: String(month),
      });
      const res = await api.get(`/reports/revenue/drilldown?${params}`);
      return res.data.data as RevenueDrilldownData;
    },
    enabled: opened && !!classId,
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Chi tiết doanh thu — ${className}`}
      size="lg"
    >
      {isLoading ? (
        <Stack align="center" py="xl">
          <Loader size="sm" />
        </Stack>
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Tổng: {formatVnd(data?.totalRevenue || 0)} · Tháng {month}/{year}
          </Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Học sinh</Table.Th>
                <Table.Th ta="right">Doanh thu</Table.Th>
                <Table.Th ta="center">Phiếu đã thu</Table.Th>
                <Table.Th>Thanh toán gần nhất</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data?.students || []).map((s) => (
                <Table.Tr key={s.studentId}>
                  <Table.Td>{s.studentName}</Table.Td>
                  <Table.Td ta="right">{formatVnd(s.revenue)}</Table.Td>
                  <Table.Td ta="center">{s.invoicesPaid}</Table.Td>
                  <Table.Td>{s.lastPaymentDate || '—'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      )}
    </Modal>
  );
}
