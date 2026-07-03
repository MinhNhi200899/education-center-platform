import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  Image,
  Paper,
  Badge,
  CopyButton,
  ActionIcon,
  Tooltip,
  Alert,
} from '@mantine/core';
import { IconCopy, IconPrinter, IconAlertCircle } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useLocaleFormatters } from '@/lib/format';

interface ReceiptStudent {
  studentId: string;
  fullName: string;
}

interface ReceiptData {
  className: string;
  month: string;
  student: { id: string; fullName: string; phone: string | null };
  sessionsAttended: number;
  monthlyFeeAmount: number;
  calculatedTuition: number;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    issueDate: string;
    dueDate: string;
  };
  vietqr: {
    qrCodeUrl: string;
    amount: number;
    receiverName: string;
    receiverBank: string;
    receiverAccount: string;
    description: string;
  } | null;
  previewHtml: string;
}

interface Props {
  classId: string;
  month: string;
  student: ReceiptStudent | null;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ExportReceiptModal({
  classId,
  month,
  student,
  opened,
  onClose,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const { formatVnd } = useLocaleFormatters();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(
        `/teacher-portal/classes/${classId}/students/${student!.studentId}/receipt`,
        { month }
      );
      return res.data.data as ReceiptData;
    },
    onSuccess: () => {
      onSuccess?.();
    },
  });

  useEffect(() => {
    if (opened && student) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, student?.studentId, month, classId]);

  const handlePrint = () => {
    if (!mutation.data?.previewHtml) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(mutation.data.previewHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  const data = mutation.data;
  const isPaid = data?.invoice.status === 'paid';

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('portal.teacher.classes.studentsModal.exportReceiptTitle', {
        name: student?.fullName ?? '',
      })}
      centered
      size="lg"
    >
      {mutation.isPending && (
        <Text c="dimmed">{t('portal.teacher.classes.studentsModal.exportReceiptLoading')}</Text>
      )}

      {mutation.isError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" title={t('common.error')}>
          {(mutation.error as { response?: { data?: { error?: { message?: string } } } })?.response
            ?.data?.error?.message ??
            t('portal.teacher.classes.studentsModal.exportReceiptFailed')}
        </Alert>
      )}

      {data && (
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">
                {t('portal.teacher.classes.studentsModal.exportReceiptNumber')}
              </Text>
              <Text fw={700}>{data.invoice.invoiceNumber}</Text>
            </div>
            <Badge
              color={isPaid ? 'green' : 'blue'}
              variant="light"
              size="lg"
            >
              {t(`payments.status.${data.invoice.status}`, { defaultValue: data.invoice.status })}
            </Badge>
          </Group>

          <Paper withBorder p="md" radius="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  {t('portal.teacher.classes.studentsModal.student')}
                </Text>
                <Text fw={500}>{data.student.fullName}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  {t('portal.teacher.classes.studentsModal.sessions')}
                </Text>
                <Text>{data.sessionsAttended}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  {t('portal.teacher.classes.studentsModal.tuition')}
                </Text>
                <Text fw={700} size="lg">
                  {formatVnd(data.calculatedTuition)}
                </Text>
              </Group>
              <Text size="xs" c="dimmed" ta="right">
                {t('portal.teacher.classes.studentsModal.tuitionFormula', {
                  monthly: formatVnd(data.monthlyFeeAmount),
                  attended: data.sessionsAttended,
                })}
              </Text>
            </Stack>
          </Paper>

          {!isPaid && data.vietqr && (
            <Paper withBorder p="md" radius="md">
              <Stack align="center" gap="sm">
                <Text fw={600}>{t('payments.payment.vietqrTitle')}</Text>
                <Image src={data.vietqr.qrCodeUrl} alt="VietQR" w={220} radius="md" />
                <Text size="sm" ta="center">
                  {data.vietqr.receiverName} · {data.vietqr.receiverBank}
                </Text>
                <Text size="sm" c="dimmed">
                  {data.vietqr.receiverAccount}
                </Text>
                <Text fw={600}>{formatVnd(data.vietqr.amount)}</Text>
                <Text size="xs" c="dimmed" ta="center">
                  {data.vietqr.description}
                </Text>
                <CopyButton value={data.vietqr.qrCodeUrl}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? t('common.copied') : t('common.copy')}>
                      <ActionIcon variant="light" onClick={copy}>
                        <IconCopy size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Stack>
            </Paper>
          )}

          {isPaid && (
            <Alert color="green" variant="light">
              {t('portal.teacher.classes.studentsModal.exportReceiptPaid')}
            </Alert>
          )}

          <Group justify="flex-end">
            <Button variant="light" leftSection={<IconPrinter size={16} />} onClick={handlePrint}>
              {t('portal.teacher.classes.studentsModal.exportReceiptPrint')}
            </Button>
            <Button onClick={handleClose}>{t('common.close')}</Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
