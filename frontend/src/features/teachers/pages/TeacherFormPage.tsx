import { Stack, Title, Paper, Grid, TextInput, Select, Button, Group, Breadcrumbs, Anchor, Text } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import type { Teacher } from '@/types';

export function TeacherFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!id;

  const form = useForm({
    initialValues: {
      fullName: '',
      dateOfBirth: '',
      gender: '' as '' | 'male' | 'female' | 'other',
      phone: '',
      email: '',
    },
    validate: {
      fullName: (value) => (!value ? t('teachers.messages.requiredName') : null),
      dateOfBirth: (value) => (!value ? t('teachers.messages.requiredDob') : null),
      gender: (value) => (!value ? t('teachers.messages.requiredGender') : null),
      phone: (value) => (!value ? t('teachers.messages.requiredPhone') : null),
      email: (value) => (!value ? t('teachers.messages.requiredEmail') : null),
    },
  });

  useQuery({
    queryKey: ['teacher', id],
    queryFn: async () => {
      const response = await api.get(`/teachers/${id}`);
      const t = response.data.data as Teacher;
      form.setValues({
        fullName: t.fullName,
        dateOfBirth: t.dateOfBirth.split('T')[0],
        gender: t.gender,
        phone: t.phone,
        email: t.email,
      });
      return t;
    },
    enabled: isEdit && !!id,
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const response = await api.post('/teachers', {
        ...values,
        centerId: user?.centerId,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      notifications.show({ title: t('common.success'), message: t('teachers.messages.createSuccess'), color: 'green' });
      navigate('/teachers');
    },
    onError: (error: any) => {
      const err = error.response?.data?.error;
      const details = err?.details as Array<{ field: string; message: string }> | undefined;
      const detailMsg = details?.length ? `\n• ${details.map((d) => `${d.field}: ${d.message}`).join('\n• ')}` : '';
      notifications.show({ title: t('common.error'), message: (err?.message || t('teachers.messages.createFailed')) + detailMsg, color: 'red', autoClose: 6000 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const response = await api.put(`/teachers/${id}`, values);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      notifications.show({ title: t('common.success'), message: t('teachers.messages.updateSuccess'), color: 'green' });
      navigate('/teachers');
    },
    onError: (error: any) => {
      const err = error.response?.data?.error;
      const details = err?.details as Array<{ field: string; message: string }> | undefined;
      const detailMsg = details?.length ? `\n• ${details.map((d) => `${d.field}: ${d.message}`).join('\n• ')}` : '';
      notifications.show({ title: t('common.error'), message: (err?.message || t('teachers.messages.updateFailed')) + detailMsg, color: 'red', autoClose: 6000 });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    if (!isEdit && !user?.centerId) {
      notifications.show({ title: t('common.error'), message: t('teachers.messages.noCenter'), color: 'red' });
      return;
    }
    if (isEdit) updateMutation.mutate(values);
    else createMutation.mutate(values);
  };

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/teachers">{t('teachers.list.title')}</Anchor>
        <Text>{isEdit ? t('teachers.form.editTitle') : t('teachers.form.newTitle')}</Text>
      </Breadcrumbs>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          <Title order={2}>{isEdit ? t('teachers.form.editTitle') : t('teachers.form.newTitle')}</Title>

          <Paper shadow="sm" p="lg" radius="md">
            <Grid>
              <Grid.Col span={12}><TextInput label={t('teachers.form.fullName')} required {...form.getInputProps('fullName')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label={t('teachers.form.dob')} type="date" required {...form.getInputProps('dateOfBirth')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select label={t('teachers.form.gender')} required data={[{ value: 'male', label: t('students.form.male') }, { value: 'female', label: t('students.form.female') }, { value: 'other', label: t('students.form.other') }]} {...form.getInputProps('gender')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label={t('teachers.form.phone')} required {...form.getInputProps('phone')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label={t('teachers.form.email')} required {...form.getInputProps('email')} /></Grid.Col>
            </Grid>
          </Paper>

          <Group justify="flex-end">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/teachers')}>{t('common.cancel')}</Button>
            <Button type="submit" leftSection={<IconCheck size={16} />} loading={createMutation.isPending || updateMutation.isPending}>{isEdit ? t('teachers.form.submitUpdate') : t('teachers.form.submitCreate')}</Button>
          </Group>
        </Stack>
      </form>
    </>
  );
}
