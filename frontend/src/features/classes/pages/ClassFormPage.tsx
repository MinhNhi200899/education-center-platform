import { Stack, Title, Paper, Grid, TextInput, Select, Textarea, Button, Group, Breadcrumbs, Anchor, NumberInput, Text } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import type { Class } from '@/types';

export function ClassFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!id;

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      academicLevel: '' as '' | 'beginner' | 'intermediate' | 'advanced',
      capacity: 30,
      classroom: '',
      startDate: '',
      endDate: '',
      notes: '',
      schedule: {
        monday: [{ startTime: '08:00', endTime: '09:30', room: '' }],
        tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [],
      },
    },
    validate: {
      name: (v) => (!v ? t('classes.messages.requiredName') : null),
      academicLevel: (v) => (!v ? t('classes.messages.requiredLevel') : null),
      capacity: (v) => (v < 1 || v > 100 ? t('classes.messages.requiredCapacity') : null),
      startDate: (v) => (!v ? t('classes.messages.requiredStartDate') : null),
    },
  });

  useQuery({
    queryKey: ['class', id],
    queryFn: async () => {
      const response = await api.get(`/classes/${id}`);
      const c = response.data.data as Class;
      form.setValues({
        name: c.name,
        description: c.description || '',
        academicLevel: c.academicLevel,
        capacity: c.capacity,
        classroom: c.classroom || '',
        startDate: c.startDate.split('T')[0],
        endDate: c.endDate?.split('T')[0] || '',
        notes: c.notes || '',
        schedule: c.schedule as any,
      });
      return c;
    },
    enabled: isEdit && !!id,
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const response = await api.post('/classes', {
        ...values,
        centerId: user?.centerId,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      notifications.show({ title: t('common.success'), message: t('classes.messages.createSuccess'), color: 'green' });
      navigate('/classes');
    },
    onError: (error: any) => notifications.show({ title: t('common.error'), message: error.response?.data?.error?.message || t('classes.messages.createFailed'), color: 'red' }),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const response = await api.put(`/classes/${id}`, values);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      notifications.show({ title: t('common.success'), message: t('classes.messages.updateSuccess'), color: 'green' });
      navigate('/classes');
    },
    onError: (error: any) => notifications.show({ title: t('common.error'), message: error.response?.data?.error?.message || t('classes.messages.updateFailed'), color: 'red' }),
  });

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/classes">{t('classes.list.title')}</Anchor>
        <Text>{isEdit ? t('classes.form.editTitle') : t('classes.form.newTitle')}</Text>
      </Breadcrumbs>

      <form
        onSubmit={form.onSubmit((v) => {
          if (!isEdit && !user?.centerId) {
            notifications.show({ title: t('common.error'), message: t('classes.messages.noCenter'), color: 'red' });
            return;
          }
          if (isEdit) updateMutation.mutate(v);
          else createMutation.mutate(v);
        })}
      >
        <Stack gap="lg">
          <Title order={2}>{isEdit ? t('classes.form.editTitle') : t('classes.form.newTitle')}</Title>

          <Paper shadow="sm" p="lg" radius="md">
            <Grid>
              <Grid.Col span={12}><TextInput label={t('classes.form.name')} required {...form.getInputProps('name')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select label={t('classes.form.academicLevel')} required data={[{ value: 'beginner', label: t('classes.levels.beginner') }, { value: 'intermediate', label: t('classes.levels.intermediate') }, { value: 'advanced', label: t('classes.levels.advanced') }]} {...form.getInputProps('academicLevel')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><NumberInput label={t('classes.form.capacity')} min={1} max={100} {...form.getInputProps('capacity')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label={t('classes.form.classroom')} {...form.getInputProps('classroom')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label={t('classes.form.startDate')} type="date" required {...form.getInputProps('startDate')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label={t('classes.form.endDate')} type="date" {...form.getInputProps('endDate')} /></Grid.Col>
              <Grid.Col span={12}><Textarea label={t('classes.form.description')} {...form.getInputProps('description')} /></Grid.Col>
            </Grid>
          </Paper>

          <Group justify="flex-end">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/classes')}>{t('common.cancel')}</Button>
            <Button type="submit" leftSection={<IconCheck size={16} />} loading={createMutation.isPending || updateMutation.isPending}>{isEdit ? t('classes.form.submitUpdate') : t('classes.form.submitCreate')}</Button>
          </Group>
        </Stack>
      </form>
    </>
  );
}
