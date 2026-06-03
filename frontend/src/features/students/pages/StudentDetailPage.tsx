import { useState } from 'react';
import { Stack, Title, Paper, Grid, Text, Badge, Group, Button, Breadcrumbs, Anchor, Tabs } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft, IconEdit, IconSwitchHorizontal } from '@tabler/icons-react';
import api from '@/lib/api';
import { TransferClassModal } from '@/features/students/components/TransferClassModal';
import type { Student } from '@/types';

export function StudentDetailPage() {
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

  if (isLoading) return <Stack gap="md"><Title>Loading...</Title></Stack>;
  if (!student) return <Stack gap="md"><Title>Student not found</Title></Stack>;

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
        <Anchor component={Link} to="/students">Students</Anchor>
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
              Back
            </Button>
            {student.currentEnrollment && (
              <Button
                variant="light"
                leftSection={<IconSwitchHorizontal size={16} />}
                onClick={() => setTransferOpen(true)}
              >
                Transfer Class
              </Button>
            )}
            <Button
              leftSection={<IconEdit size={16} />}
              onClick={() => navigate(`/students/${id}/edit`)}
            >
              Edit
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
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              {/* Personal Info */}
              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">Personal Information</Title>
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Full Name</Text>
                    <Text fw={500}>{student.fullName}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Date of Birth</Text>
                    <Text fw={500}>{new Date(student.dateOfBirth).toLocaleDateString()}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Gender</Text>
                    <Text fw={500}>{student.gender}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Status</Text>
                    <Badge color={getStatusColor(student.status)}>{student.status}</Badge>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Phone</Text>
                    <Text fw={500}>{student.phone || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Email</Text>
                    <Text fw={500}>{student.email || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Text size="sm" c="dimmed">Address</Text>
                    <Text fw={500}>{student.address || '-'}</Text>
                  </Grid.Col>
                </Grid>
              </Paper>

              {/* Enrollment Info */}
              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">Enrollment Information</Title>
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Enrollment Date</Text>
                    <Text fw={500}>{new Date(student.enrollmentDate).toLocaleDateString()}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Center</Text>
                    <Text fw={500}>{student.center?.name || '-'}</Text>
                  </Grid.Col>
                </Grid>
              </Paper>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">Parents/Guardians</Title>
                {student.parents?.map((parent) => (
                  <Stack key={parent.id} gap="xs">
                    <Text fw={500}>{parent.fullName}</Text>
                    <Text size="sm" c="dimmed">{parent.relationship}</Text>
                    <Text size="sm">{parent.phone}</Text>
                  </Stack>
                )) || <Text c="dimmed">No parents registered</Text>}
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </>
  );
}