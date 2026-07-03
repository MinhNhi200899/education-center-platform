import { Modal, Stack, NumberInput, Textarea, Button, Group, Text, List } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

export interface TuitionStudentTarget {
  studentId: string;
  fullName: string;
  monthlyFeeAmount: number | null;
  monthlyFeeNote: string | null;
}

interface Props {
  classId: string;
  month: string;
  students: TuitionStudentTarget[] | null;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SetStudentTuitionModal({
  classId,
  month,
  students,
  opened,
  onClose,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<number | string>('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!students?.length) return;
    const fees = students.map((s) => s.monthlyFeeAmount).filter((f) => f != null) as number[];
    const allSame =
      fees.length === students.length && fees.every((fee) => fee === fees[0]);
    setAmount(allSame ? fees[0] : '');
    setNote(students.length === 1 ? (students[0].monthlyFeeNote ?? '') : '');
  }, [students, opened]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!students?.length) return;
      const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
      if (students.length === 1) {
        await api.put(
          `/teacher-portal/classes/${classId}/students/${students[0].studentId}/monthly-fee`,
          { month, amount: numericAmount, note: note.trim() || undefined }
        );
      } else {
        await api.put(`/teacher-portal/classes/${classId}/students/monthly-fee/bulk`, {
          month,
          studentIds: students.map((s) => s.studentId),
          amount: numericAmount,
          note: note.trim() || undefined,
        });
      }
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message:
          (students?.length ?? 0) > 1
            ? t('portal.teacher.classes.studentsModal.setTuitionBulkSuccess', {
                count: students!.length,
              })
            : t('portal.teacher.classes.studentsModal.setTuitionSuccess'),
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['teacher-class-students', classId, month] });
      onSuccess?.();
      onClose();
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message:
          err.response?.data?.error?.message ??
          t('portal.teacher.classes.studentsModal.setTuitionFailed'),
        color: 'red',
      });
    },
  });

  if (!students?.length) return null;

  const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
  const canSave = Number.isFinite(numericAmount) && numericAmount >= 0;
  const isBulk = students.length > 1;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        isBulk
          ? t('portal.teacher.classes.studentsModal.setTuitionBulkTitle', {
              count: students.length,
            })
          : t('portal.teacher.classes.studentsModal.setTuitionTitle')
      }
      size="sm"
    >
      <Stack gap="md">
        {isBulk ? (
          <List size="sm" spacing={4}>
            {students.map((s) => (
              <List.Item key={s.studentId}>{s.fullName}</List.Item>
            ))}
          </List>
        ) : (
          <Text size="sm" c="dimmed">
            {students[0].fullName}
          </Text>
        )}
        <NumberInput
          label={t('portal.teacher.classes.studentsModal.monthlyFeeLabel')}
          placeholder={t('portal.teacher.classes.studentsModal.monthlyFeePlaceholder')}
          min={0}
          step={50000}
          thousandSeparator=","
          value={amount}
          onChange={setAmount}
          required
        />
        <Textarea
          label={t('portal.teacher.classes.studentsModal.feeNoteLabel')}
          placeholder={t('portal.teacher.classes.studentsModal.feeNotePlaceholder')}
          minRows={2}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="light" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!canSave}
          >
            {t('common.save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
