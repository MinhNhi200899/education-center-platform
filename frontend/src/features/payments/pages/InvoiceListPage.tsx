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
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconEye, IconSearch, IconPlus, IconBell } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import type { Invoice } from '@/types';
import { InvoiceGenerateModal } from '../components/InvoiceGenerateModal';

export function InvoiceListPage() {
  const { t } = useTranslation();
  const { formatDate, formatVnd } = useLocaleFormatters();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);

  const STATUS_COLORS = useMemo(
    () => ({
      draft: 'gray',
      issued: 'blue',
      paid: 'green',
      overdue: 'red',
      cancelled: 'gray',
    }),
    []
  );

  const STATUS_OPTIONS = useMemo(
    () => [
      { value: 'draft', label: t('payments.status.draft') },
      { value: 'issued', label: t('payments.status.pending') },
      { value: 'paid', label: t('payments.status.paid') },
      { value: 'overdue', label: t('payments.status.overdue') },
      { value: 'cancelled', label: t('payments.status.cancelled') },
    ],
    [t]
  );

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
        title: t('payments.invoiceList.reminderSuccessTitle'),
        message: t('payments.invoiceList.reminderSuccess', { sent: data.sent, skipped: data.skipped }),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('payments.invoiceList.reminderFailed'),
        color: 'red',
      });
    },
  });

  const getStatusColor = (s: string) => STATUS_COLORS[s as keyof typeof STATUS_COLORS] || 'gray';

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>{t('payments.invoiceList.title')}</Title>
          <Text c="dimmed" size="sm">
            {t('payments.invoiceList.subtitle')}
          </Text>
        </div>
        <Group>
          <Button
            variant="light"
            leftSection={<IconBell size={16} />}
            loading={remindersMutation.isPending}
            onClick={() => remindersMutation.mutate()}
          >
            {t('payments.invoiceList.sendReminder')}
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setGenerateOpen(true)}>
            {t('payments.invoiceList.generateFromAttendance')}
          </Button>
        </Group>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <Group mb="md">
          <TextInput
            placeholder={t('payments.invoiceList.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            placeholder={t('payments.invoiceList.filterStatus')}
            data={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            clearable
            w={180}
          />
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('payments.invoiceList.table.number')}</Table.Th>
              <Table.Th>{t('payments.invoiceList.table.student')}</Table.Th>
              <Table.Th>{t('payments.invoiceList.table.amount')}</Table.Th>
              <Table.Th>{t('payments.invoiceList.table.status')}</Table.Th>
              <Table.Th>{t('payments.invoiceList.table.issueDate')}</Table.Th>
              <Table.Th>{t('payments.invoiceList.table.dueDate')}</Table.Th>
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
                <Table.Td>{formatVnd(invoice.totalAmount)}</Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(invoice.status)} variant="light">
                    {t(`payments.status.${invoice.status}` as any)}
                  </Badge>
                </Table.Td>
                <Table.Td>{formatDate(invoice.issueDate)}</Table.Td>
                <Table.Td>{formatDate(invoice.dueDate)}</Table.Td>
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
            <Text c="dimmed">{t('payments.invoiceList.empty')}</Text>
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
