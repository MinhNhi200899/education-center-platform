import { Stack, Title, Paper, Grid, Text, Badge, Group, Button, Breadcrumbs, Anchor } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft, IconEdit } from '@tabler/icons-react';
import api from '@/lib/api';
import type { Teacher } from '@/types';

export function TeacherDetailPage() {
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

  if (isLoading) return <Stack gap="md"><Title>Loading...</Title></Stack>;
  if (!teacher) return <Stack gap="md"><Title>Teacher not found</Title></Stack>;

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/teachers">Teachers</Anchor>
        <Text>{teacher.fullName}</Text>
      </Breadcrumbs>

      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>{teacher.fullName}</Title>
          <Group gap="sm">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/teachers')}>
              Back
            </Button>
            <Button leftSection={<IconEdit size={16} />} onClick={() => navigate(`/teachers/${id}/edit`)}>
              Edit
            </Button>
          </Group>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">Personal Information</Title>
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Full Name</Text>
                    <Text fw={500}>{teacher.fullName}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Date of Birth</Text>
                    <Text fw={500}>{new Date(teacher.dateOfBirth).toLocaleDateString()}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Gender</Text>
                    <Text fw={500}>{teacher.gender}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Status</Text>
                    <Badge color={teacher.status === 'active' ? 'green' : teacher.status === 'inactive' ? 'yellow' : 'red'}>
                      {teacher.status}
                    </Badge>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Email</Text>
                    <Text fw={500}>{teacher.email}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Phone</Text>
                    <Text fw={500}>{teacher.phone}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Qualification</Text>
                    <Text fw={500}>{teacher.qualification || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Specialization</Text>
                    <Text fw={500}>{teacher.specialization || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Hire Date</Text>
                    <Text fw={500}>{new Date(teacher.hireDate).toLocaleDateString()}</Text>
                  </Grid.Col>
                </Grid>
              </Paper>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper shadow="sm" p="lg" radius="md">
              <Title order={4} mb="md">Current Classes</Title>
              {teacher.currentClasses?.map((cls) => (
                <Stack key={cls.id} gap="xs">
                  <Text fw={500}>{cls.name}</Text>
                  <Badge size="sm" variant="light">{cls.role}</Badge>
                </Stack>
              )) || <Text c="dimmed">No classes assigned</Text>}
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </>
  );
}