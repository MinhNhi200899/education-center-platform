import { Stack, Title, Paper, Grid, TextInput, Select, Textarea, Button, Group, Breadcrumbs, Anchor, Text } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import type { Teacher } from '@/types';

export function TeacherFormPage() {
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
      address: '',
      qualification: '',
      specialization: '',
      hireDate: '',
      salary: 0,
      notes: '',
    },
    validate: {
      fullName: (value) => (!value ? 'Name is required' : null),
      dateOfBirth: (value) => (!value ? 'Date of birth is required' : null),
      gender: (value) => (!value ? 'Gender is required' : null),
      phone: (value) => (!value ? 'Phone is required' : null),
      email: (value) => (!value ? 'Email is required' : null),
      hireDate: (value) => (!value ? 'Hire date is required' : null),
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
        address: t.address || '',
        qualification: t.qualification || '',
        specialization: t.specialization || '',
        hireDate: t.hireDate.split('T')[0],
        salary: Number(t.salary) || 0,
        notes: t.notes || '',
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
      notifications.show({ title: 'Success', message: 'Teacher created', color: 'green' });
      navigate('/teachers');
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.error?.message || 'Failed to create teacher', color: 'red' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const response = await api.put(`/teachers/${id}`, values);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      notifications.show({ title: 'Success', message: 'Teacher updated', color: 'green' });
      navigate('/teachers');
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.error?.message || 'Failed to update teacher', color: 'red' });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    if (!isEdit && !user?.centerId) {
      notifications.show({ title: 'Error', message: 'No center assigned to your account', color: 'red' });
      return;
    }
    if (isEdit) updateMutation.mutate(values);
    else createMutation.mutate(values);
  };

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/teachers">Teachers</Anchor>
        <Text>{isEdit ? 'Edit Teacher' : 'New Teacher'}</Text>
      </Breadcrumbs>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          <Title order={2}>{isEdit ? 'Edit Teacher' : 'New Teacher'}</Title>

          <Paper shadow="sm" p="lg" radius="md">
            <Grid>
              <Grid.Col span={12}><TextInput label="Full Name" required {...form.getInputProps('fullName')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Date of Birth" type="date" required {...form.getInputProps('dateOfBirth')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select label="Gender" required data={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} {...form.getInputProps('gender')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Phone" required {...form.getInputProps('phone')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Email" required {...form.getInputProps('email')} /></Grid.Col>
              <Grid.Col span={12}><TextInput label="Address" {...form.getInputProps('address')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Qualification" {...form.getInputProps('qualification')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Specialization" {...form.getInputProps('specialization')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Hire Date" type="date" required {...form.getInputProps('hireDate')} /></Grid.Col>
              <Grid.Col span={12}><Textarea label="Notes" {...form.getInputProps('notes')} /></Grid.Col>
            </Grid>
          </Paper>

          <Group justify="flex-end">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/teachers')}>Cancel</Button>
            <Button type="submit" leftSection={<IconCheck size={16} />} loading={createMutation.isPending || updateMutation.isPending}>{isEdit ? 'Update' : 'Create'} Teacher</Button>
          </Group>
        </Stack>
      </form>
    </>
  );
}