import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Badge,
  Button,
  SimpleGrid,
  Alert,
  Table,
  Avatar,
  Progress,
} from '@mantine/core';
import {
  IconCalendar,
  IconSchool,
  IconClipboardCheck,
  IconBell,
  IconCash,
  IconReceipt,
  IconAlertTriangle,
  IconUsers,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useLocaleFormatters } from '@/lib/format';

export function TeacherHomePage() {
  const { t } = useTranslation();
  const { formatVnd } = useLocaleFormatters();
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-portal-dashboard'],
    queryFn: async () => {
      const res = await api.get('/teacher-portal/dashboard');
      return res.data.data;
    },
  });

  if (isLoading) {
    return <Text c="dimmed">{t('portal.teacher.home.loading')}</Text>;
  }

  const todayCount = data?.todaySessions?.length ?? 0;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t('portal.teacher.home.welcome', { name: data?.profile?.fullName ?? t('portal.teacher.home.fallbackName') })}</Title>
        <Text c="dimmed" size="sm">
          {data?.profile?.center?.name ?? t('header.appName')}
        </Text>
      </div>

      {todayCount > 0 && (
        <Alert icon={<IconBell size={18} />} color="blue" title={t('portal.teacher.home.todayAlertTitle')}>
          {t('portal.teacher.home.todayAlertMessage', { count: todayCount })}{' '}
          <Button component={Link} to="/teacher/schedule" variant="white" size="xs" ml="xs">
            {t('portal.teacher.home.todayAlertCta')}
          </Button>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('portal.teacher.home.currentClasses')}
            </Text>
            <IconSchool size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs">
            {data?.classes?.length ?? 0}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('portal.teacher.home.upcomingSessions')}
            </Text>
            <IconCalendar size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs">
            {data?.upcomingSessions?.length ?? 0}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('portal.teacher.home.todaySessions')}
            </Text>
            <IconClipboardCheck size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs" c={todayCount > 0 ? 'blue' : undefined}>
            {todayCount}
          </Text>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('portal.teacher.home.revenueTotal')}
            </Text>
            <IconCash size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs" c="green">
            {formatVnd(data?.revenue?.totalRevenue ?? 0)}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {data?.revenue?.paidInvoiceCount ?? 0} {t('portal.teacher.home.revenuePaid').toLowerCase()}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('portal.teacher.home.revenuePaid')}
            </Text>
            <IconReceipt size={20} />
          </Group>
          <Text size="xl" fw={700} mt="xs">
            {data?.revenue?.paidInvoiceCount ?? 0}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {data?.revenue?.studentCount ?? 0} {t('portal.teacher.home.myStudents').toLowerCase()}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('portal.teacher.home.revenueUnpaid')}
            </Text>
            <IconAlertTriangle size={20} />
          </Group>
          <Text
            size="xl"
            fw={700}
            mt="xs"
            c={(data?.revenue?.unpaidAmount ?? 0) > 0 ? 'red' : undefined}
          >
            {formatVnd(data?.revenue?.unpaidAmount ?? 0)}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {data?.revenue?.unpaidInvoiceCount ?? 0} {t('portal.teacher.home.revenuePaid').toLowerCase()}
          </Text>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>
            <Group gap="xs">
              <IconUsers size={20} />
              {t('portal.teacher.home.myStudents')}
            </Group>
          </Title>
          {data?.students?.length >= 20 && (
            <Button component={Link} to="/teacher/classes" variant="light" size="xs">
              {t('portal.teacher.home.viewAllStudents')}
            </Button>
          )}
        </Group>
        {(data?.students?.length ?? 0) === 0 ? (
          <Text c="dimmed" size="sm">
            {t('portal.teacher.home.noStudents')}
          </Text>
        ) : (
          <Table striped highlightOnHover withTableBorder={false} verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('portal.teacher.home.studentsCol')}</Table.Th>
                <Table.Th>{t('portal.teacher.home.classCol')}</Table.Th>
                <Table.Th ta="center">{t('portal.teacher.home.sessionsAttended')}</Table.Th>
                <Table.Th>{t('portal.teacher.home.attendanceRate')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.students.map((s: {
                studentId: string;
                fullName: string;
                avatarUrl?: string | null;
                classNames: string[];
                sessionsAttended: number;
                attendanceRate: number;
              }) => {
                const rate = s.attendanceRate;
                const rateColor = rate >= 80 ? 'green' : rate >= 50 ? 'yellow' : 'red';
                return (
                  <Table.Tr key={s.studentId}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar src={s.avatarUrl ?? undefined} size="sm" radius="xl" color="blue">
                          {s.fullName?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <Text size="sm" fw={500}>
                          {s.fullName}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {s.classNames.join(', ')}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Badge variant="light" color={rateColor} size="lg">
                        {s.sessionsAttended}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Progress value={rate} color={rateColor} size="sm" style={{ flex: 1, minWidth: 60 }} />
                        <Text size="xs" c="dimmed" w={40} ta="right">
                          {rate}%
                        </Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>{t('portal.teacher.home.upcomingSchedule')}</Title>
          <Button component={Link} to="/teacher/schedule" variant="light" size="xs">
            {t('portal.teacher.home.viewFullSchedule')}
          </Button>
        </Group>
        {(data?.upcomingSessions?.length ?? 0) === 0 ? (
          <Text c="dimmed" size="sm">
            {t('portal.teacher.home.noUpcoming')}
          </Text>
        ) : (
          <Stack gap="xs">
            {data.upcomingSessions.map((s: {
              id: string;
              className: string;
              sessionDate: string;
              startTime: string;
              endTime: string;
              classroom?: string;
            }) => (
              <Group key={s.id} justify="space-between" wrap="nowrap">
                <div>
                  <Text fw={500}>{s.className}</Text>
                  <Text size="xs" c="dimmed">
                    {dayjs(s.sessionDate).format('DD/MM/YYYY')} · {s.startTime}–{s.endTime}
                    {s.classroom ? ` · ${s.classroom}` : ''}
                  </Text>
                </div>
                <Badge variant="light">{t('portal.teacher.home.badgeUpcoming')}</Badge>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>{t('portal.teacher.home.myClasses')}</Title>
          <Button component={Link} to="/teacher/classes" variant="light" size="xs">
            {t('portal.teacher.home.viewAll')}
          </Button>
        </Group>
        {(data?.classes?.length ?? 0) === 0 ? (
          <Text c="dimmed" size="sm">
            {t('portal.teacher.home.noClassAssigned')}
          </Text>
        ) : (
          <Stack gap="xs">
            {data.classes.map((c: {
              classId: string;
              className: string;
              classroom?: string;
              studentCount?: number;
              role?: string;
            }) => (
              <Group key={c.classId} justify="space-between">
                <div>
                  <Text fw={500}>{c.className}</Text>
                  {c.classroom && (
                    <Text size="xs" c="dimmed">
                      {c.classroom}
                    </Text>
                  )}
                </div>
                <Group gap="xs">
                  {c.studentCount != null && (
                    <Badge variant="outline">{t('portal.teacher.home.studentCount', { count: c.studentCount })}</Badge>
                  )}
                  {c.role === 'primary' && <Badge color="blue">{t('portal.teacher.home.primaryBadge')}</Badge>}
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
