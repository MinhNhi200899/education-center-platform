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
  Select,
  Image,
  Box,
  Card,
  CopyButton,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import {
  IconArrowLeft,
  IconCheck,
  IconQrcode,
  IconMessageShare,
  IconPrinter,
  IconSend,
  IconCopy,
} from '@tabler/icons-react';
import api from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  issued: 'blue',
  paid: 'green',
  overdue: 'red',
  cancelled: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  issued: 'Đã phát hành',
  paid: 'Đã thanh toán',
  overdue: 'Quá hạn',
  cancelled: 'Đã hủy',
};

export function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<string>('classic');

  const { data: invoice, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const response = await api.get(`/tuition/invoices/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  const { data: preview } = useQuery({
    queryKey: ['invoice-preview', id, theme],
    queryFn: async () => {
      const response = await api.get(`/tuition/invoices/${id}/preview?theme=${theme}`);
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
      notifications.show({ title: 'Thành công', message: 'Đã xác nhận thanh toán', color: 'green' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: any) =>
      notifications.show({
        title: 'Lỗi',
        message: error.response?.data?.error?.message || 'Không thể xác nhận',
        color: 'red',
      }),
  });

  const issueMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/tuition/invoices/${id}/issue`);
      return response.data.data;
    },
    onSuccess: () => {
      notifications.show({ title: 'Thành công', message: 'Đã phát hành phiếu thu', color: 'green' });
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
        title: 'Gửi Zalo (stub)',
        message: data.note || 'Đã tạo mẫu tin nhắn Zalo',
        color: 'blue',
      });
    },
    onError: (error: any) =>
      notifications.show({
        title: 'Lỗi',
        message: error.response?.data?.error?.message || 'Không thể gửi Zalo',
        color: 'red',
      }),
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

  const handlePrint = () => {
    if (!preview?.html) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(preview.html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (!invoice) {
    return (
      <Stack>
        <Title>Đang tải...</Title>
      </Stack>
    );
  }

  const themeOptions =
    preview?.themes?.map((t: { id: string; label: string }) => ({ value: t.id, label: t.label })) || [
      { value: 'classic', label: 'Cổ điển' },
      { value: 'modern', label: 'Hiện đại' },
      { value: 'minimal', label: 'Tối giản' },
      { value: 'colorful', label: 'Màu sắc' },
      { value: 'formal', label: 'Trang trọng' },
      { value: 'elegant', label: 'Thanh lịch' },
    ];

  return (
    <Stack gap="lg">
      <Group>
        <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/payments')}>
          Quay lại danh sách
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper shadow="sm" p="lg" radius="md">
            <Group justify="space-between" mb="lg">
              <div>
                <Text size="sm" c="dimmed">
                  Số phiếu thu
                </Text>
                <Text size="xl" fw={700}>
                  {invoice.invoiceNumber}
                </Text>
              </div>
              <Badge color={STATUS_COLORS[invoice.status] || 'gray'} size="lg">
                {STATUS_LABELS[invoice.status] || invoice.status}
              </Badge>
            </Group>

            <Divider my="md" />

            <Stack gap="md">
              <Group justify="space-between">
                <Text>Học sinh</Text>
                <Text fw={500}>{invoice.student?.fullName || '-'}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Gói học phí</Text>
                <Text fw={500}>{invoice.tuitionPlan?.name || '-'}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Ngày phát hành</Text>
                <Text fw={500}>{new Date(invoice.issueDate).toLocaleDateString('vi-VN')}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Hạn thanh toán</Text>
                <Text fw={500}>{new Date(invoice.dueDate).toLocaleDateString('vi-VN')}</Text>
              </Group>
            </Stack>

            <Divider my="md" />

            <Stack gap="sm">
              {invoice.items?.map((item: { id: string; description: string; quantity: number; amount: number }) => (
                <Group key={item.id} justify="space-between">
                  <Text size="sm">
                    {item.description} (×{item.quantity})
                  </Text>
                  <Text fw={500}>{formatCurrency(item.amount)}</Text>
                </Group>
              ))}
              <Group justify="space-between">
                <Text>Giảm giá</Text>
                <Text fw={500}>{formatCurrency(invoice.discount)}</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="lg" fw={600}>
                  Tổng cộng
                </Text>
                <Text size="lg" fw={700} c="green">
                  {formatCurrency(invoice.totalAmount)}
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
                  Phát hành
                </Button>
              )}
              {invoice.status !== 'paid' && (
                <>
                  <Button
                    leftSection={<IconCheck size={16} />}
                    loading={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate()}
                  >
                    Xác nhận TT (tiền mặt)
                  </Button>
                  <Button
                    variant="light"
                    color="blue"
                    leftSection={<IconMessageShare size={16} />}
                    loading={zaloMutation.isPending}
                    onClick={() => zaloMutation.mutate()}
                  >
                    Gửi Zalo
                  </Button>
                </>
              )}
            </Group>
          </Paper>

          <Paper shadow="sm" p="lg" radius="md" mt="md">
            <Group justify="space-between" mb="md">
              <Title order={4}>Xem trước phiếu thu</Title>
              <Group>
                <Select data={themeOptions} value={theme} onChange={(v) => setTheme(v || 'classic')} w={160} />
                <Button variant="light" leftSection={<IconPrinter size={16} />} onClick={handlePrint}>
                  In / Tải
                </Button>
              </Group>
            </Group>
            {preview?.html && (
              <Box
                style={{
                  border: '1px solid #eee',
                  borderRadius: 8,
                  overflow: 'hidden',
                  maxHeight: 480,
                  overflowY: 'auto',
                }}
                dangerouslySetInnerHTML={{ __html: preview.html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || preview.html }}
              />
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {invoice.status !== 'paid' && vietqr && (
            <Paper shadow="sm" p="lg" radius="md" mb="md">
              <Group mb="md">
                <IconQrcode size={20} />
                <Title order={4}>Thanh toán VietQR</Title>
              </Group>
              <Stack align="center" gap="sm">
                <Image src={vietqr.qrCodeUrl} alt="VietQR" w={200} radius="md" />
                <Text size="sm" c="dimmed" ta="center">
                  {vietqr.receiverName} · {vietqr.receiverBank}
                </Text>
                <Text fw={600}>{formatCurrency(vietqr.amount)}</Text>
                <Group gap="xs">
                  <CopyButton value={vietqr.qrCodeUrl}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Đã copy' : 'Copy link QR'}>
                        <ActionIcon variant="light" onClick={copy}>
                          <IconCopy size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                  <Button size="xs" variant="light" onClick={() => refetchQr()}>
                    Làm mới QR
                  </Button>
                </Group>
              </Stack>
            </Paper>
          )}

          <Paper shadow="sm" p="lg" radius="md">
            <Title order={4} mb="md">
              Lịch sử thanh toán
            </Title>
            {invoice.payments?.length ? (
              <Stack gap="sm">
                {invoice.payments.map((payment: { id: string; transactionDate: string; paymentMethod: string; amount: number; status: string }) => (
                  <Card key={payment.id} withBorder padding="sm">
                    <Text size="sm" fw={500}>
                      {new Date(payment.transactionDate).toLocaleString('vi-VN')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {payment.paymentMethod} · {formatCurrency(payment.amount)} · {payment.status}
                    </Text>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" size="sm">
                Chưa có thanh toán
              </Text>
            )}
          </Paper>

          {zaloMutation.data && (
            <Paper shadow="sm" p="lg" radius="md" mt="md">
              <Title order={5} mb="sm">
                Mẫu tin Zalo
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
