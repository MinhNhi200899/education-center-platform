import { useState } from 'react';
import { Modal, Stack, Select, TextInput, Button, Group, Text } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import type { Class, Student } from '@/types';

interface TransferClassModalProps {
  student: Student;
  opened: boolean;
  onClose: () => void;
}

export function TransferClassModal({ student, opened, onClose }: TransferClassModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [fromClassId, setFromClassId] = useState<string | null>(
    student.currentEnrollment?.class?.id ?? null
  );
  const [toClassId, setToClassId] = useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState('');

  const { data: classes } = useQuery({
    queryKey: ['classes-transfer', student.centerId],
    queryFn: async () => {
      const response = await api.get(`/classes?limit=100&centerId=${student.centerId}`);
      return response.data.data as Class[];
    },
    enabled: opened,
  });

  const classOptions = (classes ?? [])
    .filter((c) => c.status === 'active')
    .map((c) => ({ value: c.id, label: c.name }));

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!fromClassId || !toClassId || !reason.trim()) {
        throw new Error(t('students.transfer.missingFields'));
      }
      await api.post(`/students/${student.id}/transfer-class`, {
        fromClassId,
        toClassId,
        effectiveDate,
        reason: reason.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', student.id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      notifications.show({
        title: t('students.transfer.successTitle'),
        message: t('students.transfer.successMessage'),
        color: 'green',
      });
      onClose();
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('students.transfer.failedMessage'),
        color: 'red',
      });
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title={t('students.transfer.title')}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('students.transfer.description')}
        </Text>
        <Select
          label={t('students.transfer.fromClass')}
          placeholder={t('students.transfer.fromClassPlaceholder')}
          data={classOptions}
          value={fromClassId}
          onChange={setFromClassId}
          required
        />
        <Select
          label={t('students.transfer.toClass')}
          placeholder={t('students.transfer.toClassPlaceholder')}
          data={classOptions.filter((o) => o.value !== fromClassId)}
          value={toClassId}
          onChange={setToClassId}
          required
        />
        <TextInput
          label={t('students.transfer.effectiveDate')}
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          required
        />
        <TextInput
          label={t('students.transfer.reason')}
          placeholder={t('students.transfer.reasonPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        <Group justify="flex-end">
          <Button variant="light" onClick={onClose}>
            {t('students.transfer.cancel')}
          </Button>
          <Button
            onClick={() => transferMutation.mutate()}
            loading={transferMutation.isPending}
            disabled={!fromClassId || !toClassId || !reason.trim()}
          >
            {t('students.transfer.submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
