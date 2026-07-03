import { useEffect } from 'react';
import {
  Stack,
  Title,
  Paper,
  TextInput,
  Button,
  Group,
  Text,
  Loader,
  Image,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { BankSelect } from '@/components/BankSelect';
import { TeacherTuitionFeesSection } from '../components/TeacherTuitionFeesSection';

interface TeacherPaymentSettings {
  teacherId: string;
  fullName: string;
  centerName: string;
  vietqrBankId: string;
  accountNo: string;
  accountName: string;
  usingCenterDefaults?: boolean;
}

function buildSepayQrPreviewUrl(
  bankCode: string,
  accountNo: string,
  accountName?: string
): string | null {
  if (!bankCode || !accountNo.trim()) return null;
  const qs = new URLSearchParams({
    acc: accountNo.trim(),
    bank: bankCode,
    template: 'compact',
  });
  if (accountName?.trim()) {
    qs.set('holder', accountName.trim());
  }
  return `https://qr.sepay.vn/img?${qs.toString()}`;
}

export function TeacherPaymentSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const form = useForm({
    initialValues: {
      vietqrBankId: '',
      accountNo: '',
      accountName: '',
    },
    validate: {
      vietqrBankId: (v) => (!v ? t('settings.payments.selectBank') : null),
      accountNo: (v) => (!v ? t('settings.payments.accountNumberRequired') : null),
      accountName: (v) => (!v ? t('settings.payments.accountHolderRequired') : null),
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-payment-settings'],
    queryFn: async () => {
      const response = await api.get('/teacher-portal/payment-settings');
      return response.data.data as TeacherPaymentSettings;
    },
  });

  useEffect(() => {
    if (data) {
      form.setValues({
        vietqrBankId: data.vietqrBankId || '',
        accountNo: data.accountNo || '',
        accountName: data.accountName || '',
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const response = await api.put('/teacher-portal/payment-settings', values);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-payment-settings'] });
      notifications.show({
        title: t('portal.teacher.payments.savedTitle'),
        message: t('portal.teacher.payments.savedMessage'),
        color: 'green',
      });
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message:
          error.response?.data?.error?.message ?? t('portal.teacher.payments.failedMessage'),
        color: 'red',
      });
    },
  });

  const previewUrl = buildSepayQrPreviewUrl(
    form.values.vietqrBankId,
    form.values.accountNo,
    form.values.accountName
  );

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t('portal.teacher.payments.title')}</Title>
        <Text c="dimmed" size="sm">
          {t('portal.teacher.payments.subtitle')}
        </Text>
      </div>

      {data?.usingCenterDefaults && (
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          {t('portal.teacher.payments.usingCenterDefaults', { center: data.centerName })}
        </Alert>
      )}

      <Paper shadow="sm" p="lg" radius="md">
        <Stack gap="md">
          <Title order={3}>{t('portal.teacher.payments.bankSectionTitle')}</Title>
        {isLoading ? (
          <Loader size="sm" />
        ) : (
          <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
            <Stack gap="md">
              <BankSelect
                required
                {...form.getInputProps('vietqrBankId')}
              />
              <TextInput
                label={t('settings.payments.accountNumber')}
                placeholder={t('settings.payments.accountNumberPlaceholder')}
                required
                {...form.getInputProps('accountNo')}
              />
              <TextInput
                label={t('settings.payments.accountHolder')}
                placeholder={t('settings.payments.accountHolderPlaceholder')}
                required
                {...form.getInputProps('accountName')}
              />
              <Group justify="flex-end">
                <Button
                  type="submit"
                  leftSection={<IconDeviceFloppy size={16} />}
                  loading={saveMutation.isPending}
                >
                  {t('settings.payments.save')}
                </Button>
              </Group>
            </Stack>
          </form>
        )}
        </Stack>
      </Paper>

      {previewUrl && (
        <Paper shadow="sm" p="lg" radius="md">
          <Stack align="center" gap="sm">
            <Text fw={600}>{t('portal.teacher.payments.qrPreview')}</Text>
            <Text size="sm" c="dimmed" ta="center">
              {form.values.accountName} · {form.values.accountNo}
            </Text>
            <Image src={previewUrl} alt="SePay QR" w={220} radius="md" />
            <Text size="xs" c="dimmed" ta="center">
              {t('portal.teacher.payments.qrHint')}
            </Text>
          </Stack>
        </Paper>
      )}

      <TeacherTuitionFeesSection />
    </Stack>
  );
}
