import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Button,
  Badge,
  Image,
  CopyButton,
  ActionIcon,
  Tooltip,
  Divider,
  Alert,
} from '@mantine/core';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft, IconCopy, IconCheck, IconQrcode } from '@tabler/icons-react';
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
      return res.data.data as {
        id: string;
        invoiceNumber: string;
        totalAmount: number;
        paidAmount: number;
        amountDue: number;
        dueDate: string;
        issueDate: string;
        status: string;
        student?: { fullName: string };
        paymentQr?: {
          qrCodeUrl: string;
          amount: number;
          receiverName: string;
          receiverBank: string;
          receiverAccount: string;
          description: string;
          teacherName: string | null;
          className: string | null;
        } | null;
      };
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'issued' || status === 'overdue' ? 15_000 : false;
    },
  });

  const st = invoice
    ? STATUS[invoice.status as keyof typeof STATUS] ?? { label: invoice.status, color: 'gray' }
    : null;
  const qr = invoice?.paymentQr;
  const showPay = qr && (invoice.status === 'issued' || invoice.status === 'overdue');

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

          {invoice.status === 'paid' ? (
            <Alert color="green" mt="lg" radius="md" title={t('portal.student.invoiceDetail.paidTitle')}>
              {t('portal.student.invoiceDetail.paidMessage')}
            </Alert>
          ) : showPay ? (
            <>
              <Divider my="lg" />
              <Stack gap="md" align="center">
                <Group gap="xs">
                  <IconQrcode size={18} />
                  <Text fw={600}>{t('portal.student.invoiceDetail.qrTitle')}</Text>
                </Group>
                {(qr.teacherName || qr.className) && (
                  <Text size="sm" c="dimmed" ta="center">
                    {qr.className ? `${qr.className}` : ''}
                    {qr.teacherName
                      ? ` · ${t('portal.student.invoiceDetail.teacher', { name: qr.teacherName })}`
                      : ''}
                  </Text>
                )}
                <Image src={qr.qrCodeUrl} alt="SePay QR" w={220} radius="md" />
                <Text size="sm" c="dimmed" ta="center" maw={360}>
                  {t('portal.student.invoiceDetail.qrHint')}
                </Text>
                <Paper withBorder p="md" radius="md" w="100%" maw={400}>
                  <Stack gap="xs">
                    <CopyRow
                      label={t('portal.student.invoiceDetail.bank')}
                      value={qr.receiverBank}
                    />
                    <CopyRow
                      label={t('portal.student.invoiceDetail.account')}
                      value={qr.receiverAccount}
                    />
                    <CopyRow
                      label={t('portal.student.invoiceDetail.receiver')}
                      value={qr.receiverName}
                    />
                    <CopyRow
                      label={t('portal.student.invoiceDetail.amount')}
                      value={formatVnd(qr.amount)}
                    />
                    <CopyRow
                      label={t('portal.student.invoiceDetail.transferContent')}
                      value={qr.description}
                      highlight
                    />
                  </Stack>
                </Paper>
              </Stack>
            </>
          ) : (
            <Alert color="orange" mt="lg" radius="md">
              {t('portal.student.invoiceDetail.noQr')}
            </Alert>
          )}
        </Paper>
      )}
    </Stack>
  );
}

function CopyRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <div style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="sm" fw={highlight ? 700 : 500} style={{ wordBreak: 'break-all' }}>
          {value}
        </Text>
      </div>
      <CopyButton value={value} timeout={1500}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? '✓' : 'Copy'} withArrow>
            <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}
