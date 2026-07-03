import { useEffect, useState } from 'react';
import { Stack, Title, Paper, Grid, TextInput, Select, Textarea, Button, Group, Breadcrumbs, Anchor, Text, Modal, Alert, CopyButton, ActionIcon, Tooltip } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCheck, IconCopy, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import type { CreateStudentResult, Student } from '@/types';

export function StudentFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!id;
  const [credentials, setCredentials] = useState<{ loginEmail: string; initialPassword: string } | null>(null);

  const form = useForm({
    initialValues: {
      fullName: '',
      dateOfBirth: '',
      gender: '' as '' | 'male' | 'female' | 'other',
      phone: '',
      email: '',
      password: '',
      address: '',
      enrollmentDate: '',
      notes: '',
      centerId: '',
    },
    validate: {
      fullName: (value) => (!value ? t('students.messages.requiredName') : null),
      dateOfBirth: (value) => (!value ? t('students.messages.requiredDob') : null),
      gender: (value) => (!value ? t('students.messages.requiredGender') : null),
      enrollmentDate: (value) => (!value ? t('students.messages.requiredEnrollmentDate') : null),
      email: (value) => {
        if (!value) return t('students.messages.requiredEmail');
        return /^\S+@\S+\.\S+$/.test(value) ? null : t('students.messages.invalidEmail');
      },
      password: (value) => {
        if (!value?.trim()) return null;
        return value.trim().length >= 8 ? null : t('students.messages.passwordMinLength');
      },
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
      const { password, ...rest } = values;
      const payload = {
        ...rest,
        centerId: rest.centerId || user?.centerId,
        ...(password.trim() ? { password: password.trim() } : {}),
      };
      const response = await api.post('/students', payload);
      return response.data.data as CreateStudentResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      if (data.loginEmail && data.initialPassword) {
        setCredentials({
          loginEmail: data.loginEmail,
          initialPassword: data.initialPassword,
        });
      } else {
        notifications.show({
          title: t('common.success'),
          message: t('students.messages.createSuccess'),
          color: 'green',
        });
        navigate('/students');
      }
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('students.messages.createFailed'),
        color: 'red',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const { centerId: _c, enrollmentDate: _e, dateOfBirth: _d, gender: _g, ...rest } = values;
      const response = await api.put(`/students/${id}`, rest);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      notifications.show({
        title: t('common.success'),
        message: t('students.messages.updateSuccess'),
        color: 'green',
      });
      navigate('/students');
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('students.messages.updateFailed'),
        color: 'red',
      });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    if (!user?.centerId && !values.centerId) {
      notifications.show({ title: t('common.error'), message: t('students.messages.noCenter'), color: 'red' });
      return;
    }
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  if (isLoading) return <Stack gap="md"><Title>{t('common.loading')}</Title></Stack>;

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/students">{t('students.list.title')}</Anchor>
        <Text>{isEdit ? t('students.form.editTitle') : t('students.form.newTitle')}</Text>
      </Breadcrumbs>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          <Title order={2}>{isEdit ? t('students.form.editTitle') : t('students.form.newTitle')}</Title>

          <Paper shadow="sm" p="lg" radius="md">
            <Grid>
              <Grid.Col span={12}>
                <TextInput
                  label={t('students.form.fullName')}
                  placeholder={t('students.form.fullNamePlaceholder')}
                  required
                  {...form.getInputProps('fullName')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label={t('students.form.dob')}
                  type="date"
                  required
                  {...form.getInputProps('dateOfBirth')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label={t('students.form.gender')}
                  placeholder={t('students.form.selectGender')}
                  required
                  data={[
                    { value: 'male', label: t('students.form.male') },
                    { value: 'female', label: t('students.form.female') },
                    { value: 'other', label: t('students.form.other') },
                  ]}
                  {...form.getInputProps('gender')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label={t('students.form.phone')}
                  placeholder={t('students.form.phonePlaceholder')}
                  {...form.getInputProps('phone')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label={t('students.form.email')}
                  placeholder={t('students.form.emailPlaceholder')}
                  required
                  {...form.getInputProps('email')}
                />
              </Grid.Col>
              {!isEdit && (
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t('students.form.password')}
                    placeholder={t('students.form.passwordPlaceholder')}
                    {...form.getInputProps('password')}
                  />
                </Grid.Col>
              )}
              <Grid.Col span={12}>
                <TextInput
                  label={t('students.form.address')}
                  placeholder={t('students.form.addressPlaceholder')}
                  {...form.getInputProps('address')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label={t('students.form.enrollmentDate')}
                  type="date"
                  required
                  disabled={isEdit}
                  {...form.getInputProps('enrollmentDate')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label={t('students.form.notes')}
                  placeholder={t('students.form.notesPlaceholder')}
                  rows={3}
                  {...form.getInputProps('notes')}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          <Group justify="flex-end">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/students')}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" leftSection={<IconCheck size={16} />} loading={createMutation.isPending || updateMutation.isPending}>
              {isEdit ? t('students.form.submitUpdate') : t('students.form.submitCreate')}
            </Button>
          </Group>
        </Stack>
      </form>

      <Modal
        opened={!!credentials}
        onClose={() => {
          setCredentials(null);
          navigate('/students');
        }}
        title={t('students.credentials.title')}
        centered
      >
        <Stack gap="md">
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            {t('students.credentials.description')}
          </Alert>
          <TextInput
            label={t('students.form.email')}
            value={credentials?.loginEmail ?? ''}
            readOnly
            rightSection={
              <CopyButton value={credentials?.loginEmail ?? ''}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? t('common.copied') : t('common.copy')}>
                    <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                      <IconCopy size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            }
          />
          <TextInput
            label={t('students.form.password')}
            value={credentials?.initialPassword ?? ''}
            readOnly
            rightSection={
              <CopyButton value={credentials?.initialPassword ?? ''}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? t('common.copied') : t('common.copy')}>
                    <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                      <IconCopy size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            }
          />
          <Group justify="flex-end">
            <Button
              onClick={() => {
                setCredentials(null);
                navigate('/students');
              }}
            >
              {t('students.credentials.done')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
