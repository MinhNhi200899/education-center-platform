import { Modal, Stack, Select, TextInput, Button, Group, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

export interface TeacherClassOption {
  classId: string;
  className: string;
  classroom?: string | null;
}

export interface CreateSessionFormValues {
  classId: string;
  sessionDates: Date[];
  startTime: string;
  endTime: string;
  classroom: string;
  notes: string;
}

interface Props {
  opened: boolean;
  onClose: () => void;
  classes: TeacherClassOption[];
  defaultDate?: string;
  loading?: boolean;
  onSubmit: (values: CreateSessionFormValues) => void;
}

function getInitialDate(defaultDate?: string): Date {
  return defaultDate ? new Date(`${defaultDate}T12:00:00`) : new Date();
}

export function CreateSessionModal({
  opened,
  onClose,
  classes,
  defaultDate,
  loading,
  onSubmit,
}: Props) {
  const { t } = useTranslation();

  const form = useForm<CreateSessionFormValues>({
    initialValues: {
      classId: classes[0]?.classId ?? '',
      sessionDates: [],
      startTime: '09:00',
      endTime: '10:30',
      classroom: classes[0]?.classroom ?? '',
      notes: '',
    },
    validate: {
      classId: (v) => (!v ? t('portal.teacher.schedule.create.classRequired') : null),
      sessionDates: (v) =>
        !v?.length ? t('portal.teacher.schedule.create.dateRequired') : null,
      startTime: (v) => (!v ? t('portal.teacher.schedule.create.startRequired') : null),
      endTime: (v, values) => {
        if (!v) return t('portal.teacher.schedule.create.endRequired');
        if (values.startTime && v <= values.startTime) {
          return t('portal.teacher.schedule.create.endAfterStart');
        }
        return null;
      },
    },
  });

  useEffect(() => {
    if (!opened) return;
    const initialDate = getInitialDate(defaultDate);
    form.setValues({
      classId: classes[0]?.classId ?? '',
      sessionDates: [initialDate],
      startTime: '09:00',
      endTime: '10:30',
      classroom: classes[0]?.classroom ?? '',
      notes: '',
    });
    form.clearErrors();
  }, [opened, defaultDate, classes]);

  const handleClassChange = (classId: string | null) => {
    if (!classId) return;
    form.setFieldValue('classId', classId);
    const cls = classes.find((c) => c.classId === classId);
    if (cls?.classroom) {
      form.setFieldValue('classroom', cls.classroom);
    }
  };

  const handleSubmit = form.onSubmit((values) =>
    onSubmit({
      ...values,
      sessionDates: [...values.sessionDates].sort((a, b) => a.getTime() - b.getTime()),
    })
  );

  const dateCount = form.values.sessionDates.length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('portal.teacher.schedule.create.title')}
      size="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Select
            label={t('portal.teacher.schedule.create.class')}
            placeholder={t('portal.teacher.schedule.create.classPlaceholder')}
            data={classes.map((c) => ({ value: c.classId, label: c.className }))}
            value={form.values.classId}
            onChange={handleClassChange}
            required
          />
          <DatePickerInput
            type="multiple"
            label={t('portal.teacher.schedule.create.date')}
            description={t('portal.teacher.schedule.create.dateHint')}
            placeholder={t('portal.teacher.schedule.create.datePlaceholder')}
            value={form.values.sessionDates}
            onChange={(dates) => form.setFieldValue('sessionDates', dates)}
            valueFormat="DD/MM/YYYY"
            required
            error={form.errors.sessionDates}
          />
          {dateCount > 0 && (
            <Text size="xs" c="dimmed">
              {t('portal.teacher.schedule.create.dateSelected', { count: dateCount })}
            </Text>
          )}
          <Group grow>
            <TextInput
              label={t('portal.teacher.schedule.create.startTime')}
              placeholder="09:00"
              {...form.getInputProps('startTime')}
              required
            />
            <TextInput
              label={t('portal.teacher.schedule.create.endTime')}
              placeholder="10:30"
              {...form.getInputProps('endTime')}
              required
            />
          </Group>
          <TextInput
            label={t('portal.teacher.schedule.create.classroom')}
            placeholder={t('portal.teacher.schedule.create.classroomPlaceholder')}
            {...form.getInputProps('classroom')}
          />
          <TextInput
            label={t('portal.teacher.schedule.create.notes')}
            {...form.getInputProps('notes')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} type="button">
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={loading}>
              {dateCount > 1
                ? t('portal.teacher.schedule.create.submitMultiple', { count: dateCount })
                : t('portal.teacher.schedule.create.submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function formatSessionDateForApi(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}
