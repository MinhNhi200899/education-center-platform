import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { isStudentUser } from '@/lib/roles';
import {
  Grid,
  Card,
  Text,
  Group,
  Stack,
  Title,
  Progress,
  RingProgress,
  SimpleGrid,
  ThemeIcon,
} from '@mantine/core';
import {
  IconCurrencyDollar,
  IconUsers,
  IconSchool,
  IconTrendingUp,
  IconTrendingDown,
  IconReceipt,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { RevenueMetrics, StudentMetrics, AttendanceMetrics, CollectionMetrics } from '@/types';
import { RevenueFiltersBar, type RevenueFilterValues } from '@/features/reports/components/RevenueFiltersBar';
import { RevenuePieByClass, RevenueTrendChart, formatVnd } from '@/features/reports/components/RevenueCharts';
import { RevenueDrilldownModal } from '@/features/reports/components/RevenueDrilldownModal';
import type { RevenueReportData } from '@/features/reports/types';

function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon: React.ElementType;
  color: string;
}) {
  const { t } = useTranslation();
  return (
    <Card shadow="sm" padding="lg" radius="md">
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed" fw={500}>
          {title}
        </Text>
        <ThemeIcon color={color} variant="light" size="lg" radius="md">
          <Icon size={20} />
        </ThemeIcon>
      </Group>
      <Text size="xl" fw={700}>
        {value}
      </Text>
      {change !== undefined && (
        <Group gap={4} mt="xs">
          {changeType === 'increase' ? (
            <IconTrendingUp size={16} color="teal" />
          ) : (
            <IconTrendingDown size={16} color="red" />
          )}
          <Text size="sm" c={changeType === 'increase' ? 'teal' : 'red'}>
            {Math.abs(change)}%
          </Text>
          <Text size="xs" c="dimmed">
            {t('dashboard.vsPrevious')}
          </Text>
        </Group>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isStudentUser(user)) {
      navigate('/portal', { replace: true });
    }
  }, [user, navigate]);

  const now = new Date();
  const [filters, setFilters] = useState<RevenueFilterValues>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    classId: null,
  });
  const [drilldown, setDrilldown] = useState<{ classId: string; className: string } | null>(null);

  const revenueParams = new URLSearchParams({
    view: 'summary',
    year: String(filters.year),
    month: String(filters.month),
  });
  if (filters.classId) revenueParams.set('classId', filters.classId);

  const { data: revenueData } = useQuery({
    queryKey: ['dashboard', 'revenue', filters],
    queryFn: async () => {
      const response = await api.get(`/dashboard/revenue?${revenueParams}`);
      return response.data.data as RevenueReportData & RevenueMetrics;
    },
  });

  const { data: studentData } = useQuery({
    queryKey: ['dashboard', 'students'],
    queryFn: async () => {
      const response = await api.get('/dashboard/students');
      return response.data.data as StudentMetrics;
    },
  });

  const { data: attendanceData } = useQuery({
    queryKey: ['dashboard', 'attendance'],
    queryFn: async () => {
      const response = await api.get('/dashboard/attendance');
      return response.data.data as AttendanceMetrics;
    },
  });

  const { data: collectionData } = useQuery({
    queryKey: ['dashboard', 'collections'],
    queryFn: async () => {
      const response = await api.get('/dashboard/collections');
      return response.data.data as CollectionMetrics;
    },
  });

  return (
    <Stack gap="lg">
      <Title order={2}>{t('dashboard.title')}</Title>

      <Card shadow="sm" padding="md" radius="md">
        <RevenueFiltersBar values={filters} onChange={setFilters} />
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        <StatCard
          title={t('dashboard.monthlyRevenue')}
          value={formatVnd(revenueData?.totalRevenue || 0, i18n.language)}
          change={revenueData?.growthRate}
          changeType={(revenueData?.growthRate ?? 0) >= 0 ? 'increase' : 'decrease'}
          icon={IconCurrencyDollar}
          color="green"
        />
        <StatCard
          title={t('dashboard.activeStudents')}
          value={studentData?.activeStudents || 0}
          change={studentData?.growthRate}
          changeType={(studentData?.growthRate ?? 0) >= 0 ? 'increase' : 'decrease'}
          icon={IconUsers}
          color="blue"
        />
        <StatCard
          title={t('dashboard.classes')}
          value={revenueData?.byClass?.length || studentData?.byClass?.length || 0}
          icon={IconSchool}
          color="violet"
        />
        <StatCard
          title={t('dashboard.collectionRate')}
          value={`${(revenueData?.collectionRate ?? collectionData?.collectionRate ?? 0).toFixed(1)}%`}
          icon={IconReceipt}
          color="orange"
        />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card shadow="sm" padding="lg" radius="md">
            <Title order={4} mb="md">
              {t('dashboard.revenueTrend')}
            </Title>
            <RevenueTrendChart data={revenueData} view="summary" height={260} />
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card shadow="sm" padding="lg" radius="md">
            <Title order={4} mb="md">
              {t('dashboard.revenueByClass')}
            </Title>
            <RevenuePieByClass
              data={revenueData}
              height={260}
              onClassClick={(classId, className) => setDrilldown({ classId, className })}
            />
          </Card>
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card shadow="sm" padding="lg" radius="md">
            <Title order={4} mb="md">
              {t('dashboard.attendanceRate')}
            </Title>
            <Stack align="center" gap="md" py="md">
              <RingProgress
                size={180}
                thickness={16}
                roundCaps
                sections={[
                  { value: attendanceData?.averageAttendanceRate || 0, color: 'green' },
                ]}
                label={
                  <Text size="xl" fw={700} ta="center">
                    {attendanceData?.averageAttendanceRate?.toFixed(1) || 0}%
                  </Text>
                }
              />
              <Group gap="xl">
                <Stack gap={4} align="center">
                  <Text size="xs" c="dimmed">
                    {t('dashboard.present')}
                  </Text>
                  <Text fw={600}>{attendanceData?.byStatus?.present || 0}</Text>
                </Stack>
                <Stack gap={4} align="center">
                  <Text size="xs" c="dimmed">
                    {t('dashboard.absent')}
                  </Text>
                  <Text fw={600}>{attendanceData?.byStatus?.absent || 0}</Text>
                </Stack>
                <Stack gap={4} align="center">
                  <Text size="xs" c="dimmed">
                    {t('dashboard.late')}
                  </Text>
                  <Text fw={600}>{attendanceData?.byStatus?.late || 0}</Text>
                </Stack>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card shadow="sm" padding="lg" radius="md">
            <Title order={4} mb="md">
              {t('dashboard.studentsByClass')}
            </Title>
            <Stack gap="sm">
              {studentData?.byClass?.slice(0, 5).map((item) => (
                <Group key={item.className} justify="space-between">
                  <Text size="sm">{item.className}</Text>
                  <Text size="sm" fw={500}>
                    {item.students}
                  </Text>
                </Group>
              )) || (
                <Text c="dimmed" size="sm">
                  {t('dashboard.noClassData')}
                </Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card shadow="sm" padding="lg" radius="md">
            <Title order={4} mb="md">
              {t('dashboard.invoiceStatus')}
            </Title>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm">{t('dashboard.paid')}</Text>
                <Text size="sm" fw={500} c="green">
                  {collectionData?.paidInvoices || 0}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">{t('dashboard.issued')}</Text>
                <Text size="sm" fw={500} c="blue">
                  {collectionData?.issuedInvoices || 0}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">{t('dashboard.overdue')}</Text>
                <Text size="sm" fw={500} c="red">
                  {collectionData?.overdueInvoices || 0}
                </Text>
              </Group>
              <Progress
                value={collectionData?.collectionRate || 0}
                size="lg"
                radius="md"
                mt="md"
                color="green"
              />
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      <RevenueDrilldownModal
        opened={!!drilldown}
        onClose={() => setDrilldown(null)}
        classId={drilldown?.classId || null}
        className={drilldown?.className || ''}
        year={filters.year}
        month={filters.month}
      />
    </Stack>
  );
}
