
import { Stack, Title, Text, Paper, Table, Badge, Button, Group } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';

export function StudentTuitionPage() {
  const { t } = useTranslation();
  const { formatDate, formatVnd } = useLocaleFormatters();

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

  const STATUS = useMemo(
    () => ({
      draft: { label: t('payments.status.draft'), color: 'gray' },
      issued: { label: t('payments.status.pending'), color: 'blue' },
      paid: { label: t('payments.status.paid'), color: 'green' },
      overdue: { label: t('payments.status.overdue'), color: 'red' },
      cancelled: { label: t('payments.status.cancelled'), color: 'gray' },
    }),
    [t]
  );

  const pending = data?.filter((i) => ['issued', 'overdue'].includes(i.status)) ?? [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t('portal.student.tuition.title')}</Title>
        <Text c="dimmed" size="sm">
          {t('portal.student.tuition.subtitle')}
        </Text>
      </div>

      {pending.length > 0 && (
        <Paper withBorder p="md" radius="md" bg="orange.0">
          <Text fw={600} mb="xs">
            {t('portal.student.tuition.pendingHeader', { count: pending.length })}
          </Text>
          <Stack gap="xs">
            {pending.map((inv) => (
              <Group key={inv.id} justify="space-between">
                <Text size="sm">
                  {inv.invoiceNumber} · {t('portal.student.tuition.dueOn', { date: dayjs(inv.dueDate).format('DD/MM/YYYY') })}
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
          <Text c="dimmed">{t('portal.student.tuition.loading')}</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('portal.student.tuition.table.number')}</Table.Th>
                <Table.Th>{t('portal.student.tuition.table.issueDate')}</Table.Th>
                <Table.Th>{t('portal.student.tuition.table.dueDate')}</Table.Th>
                <Table.Th>{t('portal.student.tuition.table.amount')}</Table.Th>
                <Table.Th>{t('portal.student.tuition.table.status')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data ?? []).map((inv) => {
                const st = STATUS[inv.status as keyof typeof STATUS] ?? { label: inv.status, color: 'gray' };
                return (
                  <Table.Tr key={inv.id}>
                    <Table.Td>{inv.invoiceNumber}</Table.Td>
                    <Table.Td>{formatDate(inv.issueDate)}</Table.Td>
                    <Table.Td>{formatDate(inv.dueDate)}</Table.Td>
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
                          {t('portal.student.tuition.details')}
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
