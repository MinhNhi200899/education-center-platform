import { Stack, Title, Paper, Grid, Text, Badge, Group, Button, Breadcrumbs, Anchor, Progress, Divider, ThemeIcon } from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft, IconEdit, IconUsers, IconUser } from '@tabler/icons-react';
import api from '@/lib/api';
import type { Class, ScheduleSlot } from '@/types';

export function ClassDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: async () => {
      const response = await api.get(`/classes/${id}`);
      return response.data.data as Class;
    },
    enabled: !!id,
  });

  if (isLoading) return <Stack gap="md"><Title>Loading...</Title></Stack>;
  if (!cls) return <Stack gap="md"><Title>Class not found</Title></Stack>;

  const getStatusColor = (status: string) => ({ active: 'green', inactive: 'yellow', completed: 'blue', archived: 'gray' }[status] || 'gray');

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/classes">Classes</Anchor>
        <Text>{cls.name}</Text>
      </Breadcrumbs>

      <Stack gap="lg">
        <Group justify="space-between">
          <Group gap="md">
            <Title order={2}>{cls.name}</Title>
            <Badge color={getStatusColor(cls.status)} size="lg">{cls.status}</Badge>
          </Group>
          <Group gap="sm">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/classes')}>Back</Button>
            <Button leftSection={<IconEdit size={16} />} onClick={() => navigate(`/classes/${id}/edit`)}>Edit</Button>
          </Group>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Stack gap="md">
              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">Class Information</Title>
                <Grid>
                  <Grid.Col span={6}><Text size="sm" c="dimmed">Academic Level</Text><Text fw={500} tt="capitalize">{cls.academicLevel}</Text></Grid.Col>
                  <Grid.Col span={6}><Text size="sm" c="dimmed">Classroom</Text><Text fw={500}>{cls.classroom || '-'}</Text></Grid.Col>
                  <Grid.Col span={6}><Text size="sm" c="dimmed">Start Date</Text><Text fw={500}>{new Date(cls.startDate).toLocaleDateString()}</Text></Grid.Col>
                  <Grid.Col span={6}><Text size="sm" c="dimmed">End Date</Text><Text fw={500}>{cls.endDate ? new Date(cls.endDate).toLocaleDateString() : '-'}</Text></Grid.Col>
                  <Grid.Col span={12}><Text size="sm" c="dimmed">Description</Text><Text fw={500}>{cls.description || '-'}</Text></Grid.Col>
                </Grid>
              </Paper>

              <Paper shadow="sm" p="lg" radius="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>Schedule</Title>
                </Group>
                {Object.entries(cls.schedule).map(([day, slots]) => (slots as ScheduleSlot[]).length > 0 && (
                  <div key={day}>
                    <Text fw={500} tt="capitalize" mb="xs">{day}</Text>
                    {(slots as ScheduleSlot[]).map((slot: ScheduleSlot, i: number) => (
                      <Text key={i} size="sm" c="dimmed">{slot.startTime} - {slot.endTime} {slot.room && `(Room ${slot.room})`}</Text>
                    ))}
                    <Divider my="sm" />
                  </div>
                ))}
              </Paper>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="md">
              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">Enrollment</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm">Current</Text>
                    <Text fw={600}>{cls.currentEnrollment}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Capacity</Text>
                    <Text fw={600}>{cls.capacity}</Text>
                  </Group>
                  <Progress value={(cls.currentEnrollment / cls.capacity) * 100} size="lg" mt="sm" />
                  <Text size="xs" c="dimmed" ta="center">{cls.capacity - cls.currentEnrollment} slots available</Text>
                </Stack>
              </Paper>

              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">Teachers</Title>
                {cls.teachers?.map((t) => (
                  <Group key={t.id} gap="sm" mb="sm">
                    <ThemeIcon color="blue" variant="light" size="lg" radius="md"><IconUser size={16} /></ThemeIcon>
                    <div>
                      <Text size="sm" fw={500}>{t.fullName}</Text>
                      <Badge size="xs" variant="light">{t.role}</Badge>
                    </div>
                  </Group>
                )) || <Text c="dimmed">No teachers assigned</Text>}
              </Paper>

              <Paper shadow="sm" p="lg" radius="md">
                <Title order={4} mb="md">Students</Title>
                {cls.students?.map((s) => (
                  <Group key={s.id} gap="sm" mb="sm">
                    <ThemeIcon color="green" variant="light" size="md" radius="md"><IconUsers size={14} /></ThemeIcon>
                    <Text size="sm">{s.fullName}</Text>
                  </Group>
                )) || <Text c="dimmed">No students enrolled</Text>}
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </>
  );
}