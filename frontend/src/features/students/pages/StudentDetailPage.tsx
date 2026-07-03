import { useState } from 'react';
import { Stack, Title, Paper, Grid, Text, Badge, Group, Button, Breadcrumbs, Anchor } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft, IconEdit, IconSwitchHorizontal } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import { TransferClassModal } from '@/features/students/components/TransferClassModal';
import type { Student } from '@/types';

export function StudentDetailPage() {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const { id } = useParams();
  const navigate = useNavigate();
  const [transferOpen, setTransferOpen] = useState(false);

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const response = await api.get(`/students/${id}`);
      return response.data.data as Student;
    },
    enabled: !!id,
  });

  if (isLoading) return <Stack gap="md"><Title>{t('common.loading')}</Title></Stack>;
  if (!student) return <Stack gap="md"><Title>{t('students.messages.notFound')}</Title></Stack>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'yellow';
      case 'archived': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/students">{t('students.list.title')}</Anchor>
        <Text>{student.fullName}</Text>
      </Breadcrumbs>

      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>{student.fullName}</Title>
          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/students')}
            >
              {t('common.back')}
            </Button>
            {student.currentEnrollment && (
              <Button
                variant="light"
                leftSection={<IconSwitchHorizontal size={16} />}
                onClick={() => setTransferOpen(true)}
              >
                {t('students.detail.transfer')}
              </Button>
            )}
            <Button
              leftSection={<IconEdit size={16} />}
              onClick={() => navigate(`/students/${id}/edit`)}
            >
              {t('common.edit')}
            </Button>
          </Group>
        </Group>

        {student.currentEnrollment && (
          <TransferClassModal
            student={student}
            opened={transferOpen}
            onClose={() => setTransferOpen(false)}
          />
        )}

        <Grid>
          <Grid.Col span={{ base: 12, md: 12 }}>
            <Stack gap="md">
              {/* Personal Info */}
              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">{t('students.detail.personalInfo')}</Title>
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('students.detail.fullName')}</Text>
                    <Text fw={500}>{student.fullName}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('students.detail.dob')}</Text>
                    <Text fw={500}>{formatDate(student.dateOfBirth)}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('students.detail.gender')}</Text>
                    <Text fw={500}>{student.gender}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('students.detail.status')}</Text>
                    <Badge color={getStatusColor(student.status)}>
                      {t(`students.status.${student.status}` as any)}
                    </Badge>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('students.detail.phone')}</Text>
                    <Text fw={500}>{student.phone || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('students.detail.email')}</Text>
                    <Text fw={500}>{student.email || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('students.form.password')}</Text>
                    <Text fw={500} ff="monospace">{student.loginPassword || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Text size="sm" c="dimmed">{t('students.detail.address')}</Text>
                    <Text fw={500}>{student.address || '-'}</Text>
                  </Grid.Col>
                </Grid>
              </Paper>

              {/* Enrollment Info */}
              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">{t('students.detail.enrollmentInfo')}</Title>
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('students.detail.enrollmentDate')}</Text>
                    <Text fw={500}>{formatDate(student.enrollmentDate)}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">{t('students.detail.center')}</Text>
                    <Text fw={500}>{student.center?.name || '-'}</Text>
                  </Grid.Col>
                </Grid>
              </Paper>
            </Stack>
          </Grid.Col>

       
        </Grid>
      </Stack>
    </>
  );
}
