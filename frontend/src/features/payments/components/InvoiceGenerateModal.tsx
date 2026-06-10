import {
  Modal,
  Stack,
  Select,
  Button,
  Group,
  Text,
  Switch,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import type { Class } from '@/types';

interface InvoiceGenerateModalProps {
  opened: boolean;
  onClose: () => void;
}

export function InvoiceGenerateModal({ opened, onClose }: InvoiceGenerateModalProps) {
  const { t } = useTranslation();
  const { formatVnd } = useLocaleFormatters();
  const queryClient = useQueryClient();
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const form = useForm({
    initialValues: {
      classId: '',
      tuitionPlanId: '',
      periodStart: format(monthStart, 'yyyy-MM-dd'),
      periodEnd: format(monthEnd, 'yyyy-MM-dd'),
      prorated: true,
      autoIssue: true,
    },
  });

  const { data: classes } = useQuery({
    queryKey: ['classes', 'invoice-generate'],
    queryFn: async () => {
      const res = await api.get('/classes?limit=100&status=active');
      return res.data.data as Class[];
    },
    enabled: opened,
  });

  const { data: plans } = useQuery({
    queryKey: ['tuition-plans', form.values.classId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50', isActive: 'true' });
      if (form.values.classId) params.set('classId', form.values.classId);
      const res = await api.get(`/tuition/plans?${params}`);
      return res.data.data as Array<{ id: string; name: string; amount: number }>;
    },
    enabled: opened,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/tuition/invoices/generate-from-attendance', form.values);
      return res.data.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: t('payments.generate.successTitle'),
        message: t('payments.generate.successMessage', { generated: data.generated, skipped: data.skipped }),
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('payments.generate.failed'),
        color: 'red',
      });
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title={t('payments.generate.title')} size="md">
      <Stack gap="md">
        <Alert color="blue" variant="light">
          {t('payments.generate.alert')}
        </Alert>

        <Select
          label={t('payments.generate.class')}
          placeholder={t('payments.generate.selectClass')}
          data={classes?.map((c) => ({ value: c.id, label: c.name })) || []}
          searchable
          required
          {...form.getInputProps('classId')}
        />

        <Select
          label={t('payments.generate.tuitionPlan')}
          placeholder={t('payments.generate.selectPlan')}
          data={plans?.map((p) => ({
            value: p.id,
            label: `${p.name} (${formatVnd(p.amount)})`,
          })) || []}
          searchable
          required
          {...form.getInputProps('tuitionPlanId')}
        />

        <Group grow>
          <Text size="sm" c="dimmed">
            {t('payments.generate.periodFrom', { date: form.values.periodStart })}
          </Text>
          <Text size="sm" c="dimmed">
            {t('payments.generate.periodTo', { date: form.values.periodEnd })}
          </Text>
        </Group>

        <Switch
          label={t('payments.generate.prorated')}
          {...form.getInputProps('prorated', { type: 'checkbox' })}
        />
        <Switch
          label={t('payments.generate.autoIssue')}
          {...form.getInputProps('autoIssue', { type: 'checkbox' })}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            {t('payments.generate.cancel')}
          </Button>
          <Button
            loading={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
            disabled={!form.values.classId || !form.values.tuitionPlanId}
          >
            {t('payments.generate.submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
