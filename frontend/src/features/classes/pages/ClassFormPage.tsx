import { Stack, Title, Paper, Grid, TextInput, Select, Textarea, Button, Group, Breadcrumbs, Anchor, NumberInput, Text } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import type { Class } from '@/types';

export function ClassFormPage() {
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
      name: (v) => (!v ? 'Class name is required' : null),
      academicLevel: (v) => (!v ? 'Academic level is required' : null),
      capacity: (v) => (v < 1 || v > 100 ? 'Capacity must be 1-100' : null),
      startDate: (v) => (!v ? 'Start date is required' : null),
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
      notifications.show({ title: 'Success', message: 'Class created', color: 'green' });
      navigate('/classes');
    },
    onError: (error: any) => notifications.show({ title: 'Error', message: error.response?.data?.error?.message || 'Failed to create class', color: 'red' }),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const response = await api.put(`/classes/${id}`, values);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      notifications.show({ title: 'Success', message: 'Class updated', color: 'green' });
      navigate('/classes');
    },
    onError: (error: any) => notifications.show({ title: 'Error', message: error.response?.data?.error?.message || 'Failed to update class', color: 'red' }),
  });

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/classes">Classes</Anchor>
        <Text>{isEdit ? 'Edit Class' : 'New Class'}</Text>
      </Breadcrumbs>

      <form
        onSubmit={form.onSubmit((v) => {
          if (!isEdit && !user?.centerId) {
            notifications.show({ title: 'Error', message: 'No center assigned to your account', color: 'red' });
            return;
          }
          if (isEdit) updateMutation.mutate(v);
          else createMutation.mutate(v);
        })}
      >
        <Stack gap="lg">
          <Title order={2}>{isEdit ? 'Edit Class' : 'New Class'}</Title>

          <Paper shadow="sm" p="lg" radius="md">
            <Grid>
              <Grid.Col span={12}><TextInput label="Class Name" required {...form.getInputProps('name')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select label="Academic Level" required data={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} {...form.getInputProps('academicLevel')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><NumberInput label="Capacity" min={1} max={100} {...form.getInputProps('capacity')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Classroom" {...form.getInputProps('classroom')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Start Date" type="date" required {...form.getInputProps('startDate')} /></Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="End Date" type="date" {...form.getInputProps('endDate')} /></Grid.Col>
              <Grid.Col span={12}><Textarea label="Description" {...form.getInputProps('description')} /></Grid.Col>
            </Grid>
          </Paper>

          <Group justify="flex-end">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/classes')}>Cancel</Button>
            <Button type="submit" leftSection={<IconCheck size={16} />} loading={createMutation.isPending || updateMutation.isPending}>{isEdit ? 'Update' : 'Create'} Class</Button>
          </Group>
        </Stack>
      </form>
    </>
  );
}