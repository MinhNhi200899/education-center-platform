import { Modal, Stack, Select, TextInput, Button, Group } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

export interface TeacherClassOption {
  classId: string;
  className: string;
  classroom?: string | null;
}

export interface CreateSessionFormValues {
  classId: string;
  sessionDate: Date | null;
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
      sessionDate: defaultDate ? new Date(`${defaultDate}T12:00:00`) : new Date(),
      startTime: '08:00',
      endTime: '09:30',
      classroom: classes[0]?.classroom ?? '',
      notes: '',
    },
    validate: {
      classId: (v) => (!v ? t('portal.teacher.schedule.create.classRequired') : null),
      sessionDate: (v) => (!v ? t('portal.teacher.schedule.create.dateRequired') : null),
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

  const handleClassChange = (classId: string | null) => {
    if (!classId) return;
    form.setFieldValue('classId', classId);
    const cls = classes.find((c) => c.classId === classId);
    if (cls?.classroom) {
      form.setFieldValue('classroom', cls.classroom);
    }
  };

  const handleSubmit = form.onSubmit((values) => onSubmit(values));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('portal.teacher.schedule.create.title')}
      size="md"
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
          <DateInput
            label={t('portal.teacher.schedule.create.date')}
            value={form.values.sessionDate}
            onChange={(d) => form.setFieldValue('sessionDate', d)}
            valueFormat="DD/MM/YYYY"
            required
          />
          <Group grow>
            <TextInput
              label={t('portal.teacher.schedule.create.startTime')}
              placeholder="08:00"
              {...form.getInputProps('startTime')}
              required
            />
            <TextInput
              label={t('portal.teacher.schedule.create.endTime')}
              placeholder="09:30"
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
              {t('portal.teacher.schedule.create.submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function formatSessionDateForApi(date: Date | null): string {
  if (!date) return dayjs().format('YYYY-MM-DD');
  return dayjs(date).format('YYYY-MM-DD');
}
