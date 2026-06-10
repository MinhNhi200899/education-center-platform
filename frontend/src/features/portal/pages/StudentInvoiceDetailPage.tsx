import { Stack, Title, Text, Paper, Group, Button, Badge } from '@mantine/core';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';

export function StudentInvoiceDetailPage() {
  const { t } = useTranslation();
  const { formatDate, formatVnd } = useLocaleFormatters();
  const { id } = useParams();

  const STATUS = useMemo(
    () => ({
      issued: { label: t('payments.status.pending'), color: 'blue' },
      paid: { label: t('payments.status.paid'), color: 'green' },
      overdue: { label: t('payments.status.overdue'), color: 'red' },
    }),
    [t]
  );

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['portal-invoice', id],
    queryFn: async () => {
      const res = await api.get(`/portal/invoices/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const st = invoice ? STATUS[invoice.status as keyof typeof STATUS] ?? { label: invoice.status, color: 'gray' } : null;

  return (
    <Stack gap="lg">
      <Button
        component={Link}
        to="/portal/tuition"
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        w="fit-content"
      >
        {t('portal.student.invoiceDetail.back')}
      </Button>

      {isLoading ? (
        <Text c="dimmed">{t('portal.student.invoiceDetail.loading')}</Text>
      ) : !invoice ? (
        <Text c="red">{t('portal.student.invoiceDetail.notFound')}</Text>
      ) : (
        <Paper withBorder p="lg" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={3}>{invoice.invoiceNumber}</Title>
            {st && <Badge color={st.color}>{st.label}</Badge>}
          </Group>
          <Stack gap="xs">
            <Text>
              <Text span c="dimmed">
                {t('portal.student.invoiceDetail.student')}{' '}
              </Text>
              {invoice.student?.fullName}
            </Text>
            <Text>
              <Text span c="dimmed">
                {t('portal.student.invoiceDetail.issueDate')}{' '}
              </Text>
              {formatDate(invoice.issueDate)}
            </Text>
            <Text>
              <Text span c="dimmed">
                {t('portal.student.invoiceDetail.dueDate')}{' '}
              </Text>
              {formatDate(invoice.dueDate)}
            </Text>
            <Text fw={700} size="lg" mt="sm">
              {t('portal.student.invoiceDetail.total')} {formatVnd(invoice.totalAmount)}
            </Text>
            <Text>
              {t('portal.student.invoiceDetail.paid')} {formatVnd(invoice.paidAmount)}
            </Text>
            <Text c="orange" fw={600}>
              {t('portal.student.invoiceDetail.remaining')} {formatVnd(invoice.amountDue)}
            </Text>
          </Stack>
          <Text size="sm" c="dimmed" mt="lg">
            {t('portal.student.invoiceDetail.intro')}
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
