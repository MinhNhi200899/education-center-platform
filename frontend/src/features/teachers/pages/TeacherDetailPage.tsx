import { Stack, Title, Paper, Grid, Text, Badge, Group, Button, Breadcrumbs, Anchor } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft, IconEdit } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import type { Teacher } from '@/types';

export function TeacherDetailPage() {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', id],
    queryFn: async () => {
      const response = await api.get(`/teachers/${id}`);
      return response.data.data as Teacher;
    },
    enabled: !!id,
  });

  if (isLoading) return <Stack gap="md"><Title>{t('common.loading')}</Title></Stack>;
  if (!teacher) return <Stack gap="md"><Title>{t('teachers.detail.notFound')}</Title></Stack>;

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/teachers">{t('teachers.list.title')}</Anchor>
        <Text>{teacher.fullName}</Text>
      </Breadcrumbs>

      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>{teacher.fullName}</Title>
          <Group gap="sm">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/teachers')}>
              {t('common.back')}
            </Button>
            <Button leftSection={<IconEdit size={16} />} onClick={() => navigate(`/teachers/${id}/edit`)}>
              {t('common.edit')}
            </Button>
          </Group>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">{t('teachers.detail.personalInfo')}</Title>
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('teachers.detail.fullName')}</Text>
                    <Text fw={500}>{teacher.fullName}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('teachers.detail.dob')}</Text>
                    <Text fw={500}>{formatDate(teacher.dateOfBirth)}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('teachers.detail.gender')}</Text>
                    <Text fw={500}>{teacher.gender}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('teachers.detail.status')}</Text>
                    <Badge color={teacher.status === 'active' ? 'green' : teacher.status === 'inactive' ? 'yellow' : 'red'}>
                      {t(`teachers.status.${teacher.status}` as any)}
                    </Badge>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('teachers.detail.email')}</Text>
                    <Text fw={500}>{teacher.email}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('teachers.detail.phone')}</Text>
                    <Text fw={500}>{teacher.phone}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('teachers.detail.qualification')}</Text>
                    <Text fw={500}>{teacher.qualification || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('teachers.detail.specialization')}</Text>
                    <Text fw={500}>{teacher.specialization || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('teachers.detail.hireDate')}</Text>
                    <Text fw={500}>{formatDate(teacher.hireDate)}</Text>
                  </Grid.Col>
                </Grid>
              </Paper>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper shadow="sm" p="lg" radius="md">
              <Title order={4} mb="md">{t('teachers.detail.currentClasses')}</Title>
              {teacher.currentClasses?.map((cls) => (
                <Stack key={cls.id} gap="xs">
                  <Text fw={500}>{cls.name}</Text>
                  <Badge size="sm" variant="light">{cls.role}</Badge>
                </Stack>
              )) || <Text c="dimmed">{t('teachers.detail.noClasses')}</Text>}
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </>
  );
}
