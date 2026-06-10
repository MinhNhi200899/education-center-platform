import { Modal, Table, Text, Loader, Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import type { RevenueDrilldownData } from '../types';

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
  const { t } = useTranslation();
  const { formatVnd } = useLocaleFormatters();

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
      title={t('reports.drilldownTitle', { name: className })}
      size="lg"
    >
      {isLoading ? (
        <Stack align="center" py="xl">
          <Loader size="sm" />
        </Stack>
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('reports.totalMonth', { amount: formatVnd(data?.totalRevenue || 0), month, year })}
          </Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('reports.student')}</Table.Th>
                <Table.Th ta="right">{t('reports.revenue')}</Table.Th>
                <Table.Th ta="center">{t('reports.invoicesPaid')}</Table.Th>
                <Table.Th>{t('reports.lastPayment')}</Table.Th>
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
