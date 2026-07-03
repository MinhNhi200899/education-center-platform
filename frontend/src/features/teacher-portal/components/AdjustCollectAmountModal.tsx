import { Modal, Stack, Text, NumberInput, Group, Button, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useLocaleFormatters } from '@/lib/format';

export interface CollectAmountTarget {
  studentId: string;
  fullName: string;
  baseTuition: number | null;
  collectAmount: number | null;
  calculatedTuition: number | null;
}

interface Props {
  classId: string;
  month: string;
  student: CollectAmountTarget | null;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdjustCollectAmountModal({
  classId,
  month,
  student,
  opened,
  onClose,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const { formatVnd } = useLocaleFormatters();

  const form = useForm({
    initialValues: { collectAmount: '' as string | number },
    validate: {
      collectAmount: (value) => {
        const num = Number(value);
        if (!value && value !== 0) return t('portal.teacher.classes.studentsModal.collectAmountRequired');
        if (Number.isNaN(num) || num <= 0) return t('portal.teacher.classes.studentsModal.collectAmountInvalid');
        return null;
      },
    },
  });

  useEffect(() => {
    if (student && opened) {
      const initial =
        student.collectAmount ?? student.calculatedTuition ?? student.baseTuition ?? '';
      form.setValues({ collectAmount: initial });
    }
  }, [student, opened]);

  const mutation = useMutation({
    mutationFn: async (collectAmount: number) => {
      const res = await api.put(
        `/teacher-portal/classes/${classId}/students/${student!.studentId}/collect-amount`,
        { month, collectAmount }
      );
      return res.data.data;
    },
    onSuccess: () => {
      notifications.show({
        title: t('portal.teacher.classes.studentsModal.collectAmountSuccess'),
        message: student?.fullName ?? '',
        color: 'green',
      });
      onSuccess?.();
      onClose();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message:
          error.response?.data?.error?.message ??
          t('portal.teacher.classes.studentsModal.collectAmountFailed'),
        color: 'red',
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put(
        `/teacher-portal/classes/${classId}/students/${student!.studentId}/collect-amount`,
        { month, collectAmount: null }
      );
      return res.data.data;
    },
    onSuccess: () => {
      notifications.show({
        title: t('portal.teacher.classes.studentsModal.collectAmountResetSuccess'),
        message: '',
        color: 'green',
      });
      onSuccess?.();
      onClose();
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('portal.teacher.classes.studentsModal.collectAmountTitle', {
        name: student?.fullName ?? '',
      })}
      centered
    >
      {student && (
        <form
          onSubmit={form.onSubmit((values) =>
            mutation.mutate(Number(values.collectAmount))
          )}
        >
          <Stack gap="md">
            {student.baseTuition != null && (
              <Text size="sm" c="dimmed">
                {t('portal.teacher.classes.studentsModal.collectAmountBase', {
                  amount: formatVnd(student.baseTuition),
                })}
              </Text>
            )}
            <NumberInput
              label={t('portal.teacher.classes.studentsModal.collectAmountLabel')}
              placeholder={t('portal.teacher.classes.studentsModal.collectAmountPlaceholder')}
              min={1}
              step={1000}
              thousandSeparator=","
              suffix=" đ"
              required
              {...form.getInputProps('collectAmount')}
            />
            <TextInput
              label={t('portal.teacher.classes.studentsModal.filterMonth')}
              value={month}
              readOnly
              disabled
            />
            <Group justify="space-between">
              <Button
                variant="subtle"
                color="gray"
                disabled={resetMutation.isPending || student.collectAmount == null}
                loading={resetMutation.isPending}
                onClick={() => resetMutation.mutate()}
              >
                {t('portal.teacher.classes.studentsModal.collectAmountReset')}
              </Button>
              <Group>
                <Button variant="default" onClick={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" loading={mutation.isPending}>
                  {t('common.save')}
                </Button>
              </Group>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
