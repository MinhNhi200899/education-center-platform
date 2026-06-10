import { useEffect, useMemo } from 'react';
import { Stack, Title, Paper, TextInput, Button, Group, Text, Select, Loader } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface PaymentSettings {
  centerId: string;
  centerName: string;
  vietqrBankId: string;
  accountNo: string;
  accountName: string;
}

export function PaymentSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const centerId = user?.centerId;

  const BANK_OPTIONS = useMemo(
    () => [
      { value: 'VCB', label: t('settings.payments.banks.VCB') },
      { value: 'TCB', label: t('settings.payments.banks.TCB') },
      { value: 'BIDV', label: t('settings.payments.banks.BIDV') },
      { value: 'VTB', label: t('settings.payments.banks.VTB') },
      { value: 'MB', label: t('settings.payments.banks.MB') },
      { value: 'ACB', label: t('settings.payments.banks.ACB') },
      { value: 'VPB', label: t('settings.payments.banks.VPB') },
    ],
    [t]
  );

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
    queryKey: ['payment-settings', centerId],
    queryFn: async () => {
      const response = await api.get(`/centers/${centerId}/payment-settings`);
      return response.data.data as PaymentSettings;
    },
    enabled: !!centerId,
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
      const response = await api.put(`/centers/${centerId}/payment-settings`, values);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings', centerId] });
      notifications.show({ title: t('settings.payments.savedTitle'), message: t('settings.payments.savedMessage'), color: 'green' });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('settings.payments.failedTitle'),
        message: error.response?.data?.error?.message || t('settings.payments.failedMessage'),
        color: 'red',
      });
    },
  });

  if (!centerId) {
    return (
      <Stack gap="md">
        <Title order={2}>{t('settings.payments.title')}</Title>
        <Text c="dimmed">{t('settings.payments.noCenter')}</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t('settings.payments.title')}</Title>
        <Text c="dimmed" size="sm">
          {t('settings.payments.subtitle', { center: data?.centerName || user?.center?.name || '' })}
        </Text>
      </div>

      <Paper shadow="sm" p="lg" radius="md">
        {isLoading ? (
          <Loader size="sm" />
        ) : (
          <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
            <Stack gap="md">
              <Select
                label={t('settings.payments.bank')}
                placeholder={t('settings.payments.selectBank')}
                data={BANK_OPTIONS}
                searchable
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
      </Paper>
    </Stack>
  );
}
