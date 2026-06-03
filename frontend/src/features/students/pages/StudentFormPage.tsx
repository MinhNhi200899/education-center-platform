import { useEffect } from 'react';
import { Stack, Title, Paper, Grid, TextInput, Select, Textarea, Button, Group, Breadcrumbs, Anchor, Text } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import type { Student } from '@/types';

export function StudentFormPage() {
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
      enrollmentDate: '',
      notes: '',
      centerId: '',
    },
    validate: {
      fullName: (value) => (!value ? 'Name is required' : null),
      dateOfBirth: (value) => (!value ? 'Date of birth is required' : null),
      gender: (value) => (!value ? 'Gender is required' : null),
      enrollmentDate: (value) => (!value ? 'Enrollment date is required' : null),
    },
  });

  useEffect(() => {
    if (!isEdit && user?.centerId) {
      form.setFieldValue('centerId', user.centerId);
    }
  }, [isEdit, user?.centerId]);

  const { isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const response = await api.get(`/students/${id}`);
      const student = response.data.data as Student;
      form.setValues({
        fullName: student.fullName,
        dateOfBirth: student.dateOfBirth.split('T')[0],
        gender: student.gender,
        phone: student.phone || '',
        email: student.email || '',
        address: student.address || '',
        enrollmentDate: student.enrollmentDate.split('T')[0],
        notes: student.notes || '',
        centerId: student.centerId,
      });
      return student;
    },
    enabled: isEdit && !!id,
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const payload = {
        ...values,
        centerId: values.centerId || user?.centerId,
      };
      const response = await api.post('/students', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      notifications.show({
        title: 'Success',
        message: 'Student created successfully',
        color: 'green',
      });
      navigate('/students');
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to create student',
        color: 'red',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const { centerId: _c, enrollmentDate, dateOfBirth, gender, ...rest } = values;
      const response = await api.put(`/students/${id}`, rest);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      notifications.show({
        title: 'Success',
        message: 'Student updated successfully',
        color: 'green',
      });
      navigate('/students');
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to update student',
        color: 'red',
      });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    if (!user?.centerId && !values.centerId) {
      notifications.show({ title: 'Error', message: 'No center assigned to your account', color: 'red' });
      return;
    }
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  if (isLoading) return <Stack gap="md"><Title>Loading...</Title></Stack>;

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/students">Students</Anchor>
        <Text>{isEdit ? 'Edit Student' : 'New Student'}</Text>
      </Breadcrumbs>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          <Title order={2}>{isEdit ? 'Edit Student' : 'New Student'}</Title>

          <Paper shadow="sm" p="lg" radius="md">
            <Grid>
              <Grid.Col span={12}>
                <TextInput
                  label="Full Name"
                  placeholder="Enter student name"
                  required
                  {...form.getInputProps('fullName')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Date of Birth"
                  type="date"
                  required
                  {...form.getInputProps('dateOfBirth')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Gender"
                  placeholder="Select gender"
                  required
                  data={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                  {...form.getInputProps('gender')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Phone"
                  placeholder="Enter phone number"
                  {...form.getInputProps('phone')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Email"
                  placeholder="Enter email"
                  {...form.getInputProps('email')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput
                  label="Address"
                  placeholder="Enter address"
                  {...form.getInputProps('address')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Enrollment Date"
                  type="date"
                  required
                  disabled={isEdit}
                  {...form.getInputProps('enrollmentDate')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Notes"
                  placeholder="Additional notes..."
                  rows={3}
                  {...form.getInputProps('notes')}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          <Group justify="flex-end">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/students')}>
              Cancel
            </Button>
            <Button type="submit" leftSection={<IconCheck size={16} />} loading={createMutation.isPending || updateMutation.isPending}>
              {isEdit ? 'Update' : 'Create'} Student
            </Button>
          </Group>
        </Stack>
      </form>
    </>
  );
}
