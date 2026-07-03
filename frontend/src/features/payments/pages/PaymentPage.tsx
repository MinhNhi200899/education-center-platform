import {
  Stack,
  Title,
  Paper,
  Text,
  Group,
  Button,
  Grid,
  Badge,
  Divider,
  Image,
  Card,
  CopyButton,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useMemo } from 'react';
import {
  IconArrowLeft,
  IconCheck,
  IconQrcode,
  IconMessageShare,
  IconSend,
  IconCopy,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';

export function PaymentPage() {
  const { t } = useTranslation();
  const { formatDate, formatVnd } = useLocaleFormatters();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { data: invoice, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const response = await api.get(`/tuition/invoices/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  const { data: vietqr, refetch: refetchQr } = useQuery({
    queryKey: ['vietqr', id],
    queryFn: async () => {
      const response = await api.post('/payments/vietqr', { invoiceId: id });
      return response.data.data;
    },
    enabled: !!id && invoice?.status !== 'paid',
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/payments/confirm', {
        invoiceId: id,
        amount: invoice.totalAmount,
        paymentMethod: 'cash',
      });
      return response.data.data;
    },
    onSuccess: () => {
      notifications.show({ title: t('payments.payment.paymentSuccessTitle'), message: t('payments.payment.paymentSuccess'), color: 'green' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: any) =>
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('payments.payment.paymentFailed'),
        color: 'red',
      }),
  });

  const issueMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/tuition/invoices/${id}/issue`);
      return response.data.data;
    },
    onSuccess: () => {
      notifications.show({ title: t('payments.payment.publishTitle'), message: t('payments.payment.publishTitle'), color: 'green' });
      refetch();
    },
  });

  const zaloMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/tuition/invoices/${id}/share-zalo`);
      return response.data.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: t('payments.payment.zaloTemplate'),
        message: data.note || t('payments.payment.zaloTemplate'),
        color: 'blue',
      });
    },
    onError: (error: any) =>
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('payments.payment.zaloFailed'),
        color: 'red',
      }),
  });

  if (!invoice) {
    return (
      <Stack>
        <Title>{t('payments.payment.loading')}</Title>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group>
        <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/payments')}>
          {t('payments.payment.backToList')}
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper shadow="sm" p="lg" radius="md">
            <Group justify="space-between" mb="lg">
              <div>
                <Text size="sm" c="dimmed">
                  {t('payments.payment.invoiceNumber')}
                </Text>
                <Text size="xl" fw={700}>
                  {invoice.invoiceNumber}
                </Text>
              </div>
              <Badge color={STATUS_COLORS[invoice.status as keyof typeof STATUS_COLORS] || 'gray'} size="lg">
                {t(`payments.status.${invoice.status}` as any)}
              </Badge>
            </Group>

            <Divider my="md" />

            <Stack gap="md">
              <Group justify="space-between">
                <Text>{t('payments.payment.student')}</Text>
                <Text fw={500}>{invoice.student?.fullName || '-'}</Text>
              </Group>
              <Group justify="space-between">
                <Text>{t('payments.payment.tuitionPlan')}</Text>
                <Text fw={500}>{invoice.tuitionPlan?.name || '-'}</Text>
              </Group>
              <Group justify="space-between">
                <Text>{t('payments.payment.issueDate')}</Text>
                <Text fw={500}>{formatDate(invoice.issueDate)}</Text>
              </Group>
              <Group justify="space-between">
                <Text>{t('payments.payment.dueDate')}</Text>
                <Text fw={500}>{formatDate(invoice.dueDate)}</Text>
              </Group>
            </Stack>

            <Divider my="md" />

            <Stack gap="sm">
              {invoice.items?.map((item: { id: string; description: string; quantity: number; amount: number }) => (
                <Group key={item.id} justify="space-between">
                  <Text size="sm">
                    {t('payments.payment.itemsDescription', { description: item.description, quantity: item.quantity })}
                  </Text>
                  <Text fw={500}>{formatVnd(item.amount)}</Text>
                </Group>
              ))}
              <Group justify="space-between">
                <Text>{t('payments.payment.discount')}</Text>
                <Text fw={500}>{formatVnd(invoice.discount)}</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="lg" fw={600}>
                  {t('payments.payment.total')}
                </Text>
                <Text size="lg" fw={700} c="green">
                  {formatVnd(invoice.totalAmount)}
                </Text>
              </Group>
            </Stack>

            <Group mt="lg" grow>
              {invoice.status === 'draft' && (
                <Button
                  variant="light"
                  leftSection={<IconSend size={16} />}
                  loading={issueMutation.isPending}
                  onClick={() => issueMutation.mutate()}
                >
                  {t('payments.payment.issue')}
                </Button>
              )}
              {invoice.status !== 'paid' && (
                <>
                  <Button
                    leftSection={<IconCheck size={16} />}
                    loading={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate()}
                  >
                    {t('payments.payment.confirmCash')}
                  </Button>
                  <Button
                    variant="light"
                    color="blue"
                    leftSection={<IconMessageShare size={16} />}
                    loading={zaloMutation.isPending}
                    onClick={() => zaloMutation.mutate()}
                  >
                    {t('payments.payment.sendZalo')}
                  </Button>
                </>
              )}
            </Group>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {invoice.status !== 'paid' && vietqr && (
            <Paper shadow="sm" p="lg" radius="md" mb="md">
              <Group mb="md">
                <IconQrcode size={20} />
                <Title order={4}>{t('payments.payment.vietqrTitle')}</Title>
              </Group>
              <Stack align="center" gap="sm">
                <Image src={vietqr.qrCodeUrl} alt="VietQR" w={200} radius="md" />
                <Text size="sm" c="dimmed" ta="center">
                  {vietqr.receiverName} · {vietqr.receiverBank}
                </Text>
                <Text fw={600}>{formatVnd(vietqr.amount)}</Text>
                <Group gap="xs">
                  <CopyButton value={vietqr.qrCodeUrl}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? t('payments.payment.copyCopied') : t('payments.payment.copyLink')}>
                        <ActionIcon variant="light" onClick={copy}>
                          <IconCopy size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                  <Button size="xs" variant="light" onClick={() => refetchQr()}>
                    {t('payments.payment.refresh')}
                  </Button>
                </Group>
              </Stack>
            </Paper>
          )}

          <Paper shadow="sm" p="lg" radius="md">
            <Title order={4} mb="md">
              {t('payments.payment.paymentHistory')}
            </Title>
            {invoice.payments?.length ? (
              <Stack gap="sm">
                {invoice.payments.map((payment: { id: string; transactionDate: string; paymentMethod: string; amount: number; status: string }) => (
                  <Card key={payment.id} withBorder padding="sm">
                    <Text size="sm" fw={500}>
                      {new Date(payment.transactionDate).toLocaleString()}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {payment.paymentMethod} · {formatVnd(payment.amount)} · {payment.status}
                    </Text>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" size="sm">
                {t('payments.payment.noPayments')}
              </Text>
            )}
          </Paper>

          {zaloMutation.data && (
            <Paper shadow="sm" p="lg" radius="md" mt="md">
              <Title order={5} mb="sm">
                {t('payments.payment.zaloTemplateTitle')}
              </Title>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {zaloMutation.data.messageTemplate}
              </Text>
            </Paper>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
