import { useState } from 'react';
import { Modal, Stack, Select, TextInput, Button, Group, Text } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import api from '@/lib/api';
import type { Class, Student } from '@/types';

interface TransferClassModalProps {
  student: Student;
  opened: boolean;
  onClose: () => void;
}

export function TransferClassModal({ student, opened, onClose }: TransferClassModalProps) {
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
        throw new Error('Missing required fields');
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
      notifications.show({ title: 'Transferred', message: 'Class transfer completed', color: 'green' });
      onClose();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error?.message || 'Transfer failed',
        color: 'red',
      });
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Transfer class">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Withdraws the student from the current class and enrolls them in a new class. Previous enrollments are kept in history.
        </Text>
        <Select
          label="From class"
          placeholder="Current class"
          data={classOptions}
          value={fromClassId}
          onChange={setFromClassId}
          required
        />
        <Select
          label="To class"
          placeholder="Target class"
          data={classOptions.filter((o) => o.value !== fromClassId)}
          value={toClassId}
          onChange={setToClassId}
          required
        />
        <TextInput
          label="Effective date"
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          required
        />
        <TextInput
          label="Reason"
          placeholder="e.g. Level change, schedule conflict"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        <Group justify="flex-end">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => transferMutation.mutate()}
            loading={transferMutation.isPending}
            disabled={!fromClassId || !toClassId || !reason.trim()}
          >
            Transfer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
