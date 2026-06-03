import { useEffect } from 'react';
import { Stack, Title, Paper, TextInput, Button, Group, Text, Select, Loader } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const BANK_OPTIONS = [
  { value: 'VCB', label: 'Vietcombank (VCB)' },
  { value: 'TCB', label: 'Techcombank (TCB)' },
  { value: 'BIDV', label: 'BIDV' },
  { value: 'VTB', label: 'Vietinbank (VTB)' },
  { value: 'MB', label: 'MB Bank (MB)' },
  { value: 'ACB', label: 'ACB' },
  { value: 'VPB', label: 'VPBank (VPB)' },
];

interface PaymentSettings {
  centerId: string;
  centerName: string;
  vietqrBankId: string;
  accountNo: string;
  accountName: string;
}

export function PaymentSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const centerId = user?.centerId;

  const form = useForm({
    initialValues: {
      vietqrBankId: '',
      accountNo: '',
      accountName: '',
    },
    validate: {
      vietqrBankId: (v) => (!v ? 'Select a bank' : null),
      accountNo: (v) => (!v ? 'Account number is required' : null),
      accountName: (v) => (!v ? 'Account holder name is required' : null),
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
      notifications.show({ title: 'Saved', message: 'Payment settings updated', color: 'green' });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to save settings',
        color: 'red',
      });
    },
  });

  if (!centerId) {
    return (
      <Stack gap="md">
        <Title order={2}>QR Payment Settings</Title>
        <Text c="dimmed">No center assigned to your account.</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>QR Payment Settings</Title>
        <Text c="dimmed" size="sm">
          Configure VietQR bank details for {data?.centerName || user?.center?.name}
        </Text>
      </div>

      <Paper shadow="sm" p="lg" radius="md">
        {isLoading ? (
          <Loader size="sm" />
        ) : (
          <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
            <Stack gap="md">
              <Select
                label="Bank"
                placeholder="Select bank"
                data={BANK_OPTIONS}
                searchable
                required
                {...form.getInputProps('vietqrBankId')}
              />
              <TextInput
                label="Account number"
                placeholder="Bank account number"
                required
                {...form.getInputProps('accountNo')}
              />
              <TextInput
                label="Account holder name"
                placeholder="Name shown on VietQR"
                required
                {...form.getInputProps('accountName')}
              />
              <Group justify="flex-end">
                <Button
                  type="submit"
                  leftSection={<IconDeviceFloppy size={16} />}
                  loading={saveMutation.isPending}
                >
                  Save settings
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Paper>
    </Stack>
  );
}
