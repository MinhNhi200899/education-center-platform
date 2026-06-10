import { useState, useMemo } from 'react';
import {
  Stack,
  Title,
  Paper,
  Text,
  Group,
  Card,
  SimpleGrid,
  Tabs,
  ThemeIcon,
  Loader,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  IconChartPie,
  IconChartLine,
  IconUsers,
  IconReportMoney,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import { RevenueFiltersBar, type RevenueFilterValues } from '../components/RevenueFiltersBar';
import {
  RevenuePieByClass,
  RevenueTrendChart,
  RevenueByStudentTable,
  RevenueByClassList,
} from '../components/RevenueCharts';
import { RevenueDrilldownModal } from '../components/RevenueDrilldownModal';
import type { RevenueReportData, RevenueViewMode, MonthlyReportData, YearlyReportData } from '../types';

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="lg" fw={700} mt={4}>
        {value}
      </Text>
    </Paper>
  );
}

export function ReportsPage() {
  const { t } = useTranslation();
  const { formatVnd } = useLocaleFormatters();
  const now = new Date();
  const [filters, setFilters] = useState<RevenueFilterValues>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    classId: null,
  });
  const [view, setView] = useState<RevenueViewMode>('summary');
  const [drilldown, setDrilldown] = useState<{ classId: string; className: string } | null>(null);

  const VIEW_TABS: { value: RevenueViewMode; label: string }[] = useMemo(
    () => [
      { value: 'summary', label: t('reports.tabs.overview') },
      { value: 'by_class', label: t('reports.tabs.byClass') },
      { value: 'by_student', label: t('reports.tabs.byStudent') },
      { value: 'trend', label: t('reports.tabs.trend') },
    ],
    [t]
  );

  const revenueParams = new URLSearchParams({ view, year: String(filters.year) });
  if (view !== 'trend') {
    revenueParams.set('month', String(filters.month));
  }
  if (filters.classId) revenueParams.set('classId', filters.classId);

  const { data: revenue, isLoading } = useQuery({
    queryKey: ['reports', 'revenue', view, filters],
    queryFn: async () => {
      const res = await api.get(`/reports/revenue?${revenueParams}`);
      return res.data.data as RevenueReportData;
    },
  });

  const { data: monthly } = useQuery({
    queryKey: ['reports', 'monthly', filters.year, filters.month],
    queryFn: async () => {
      const res = await api.get(
        `/reports/monthly?year=${filters.year}&month=${filters.month}`
      );
      return res.data.data as MonthlyReportData;
    },
  });

  const { data: yearly } = useQuery({
    queryKey: ['reports', 'yearly', filters.year],
    queryFn: async () => {
      const res = await api.get(`/reports/yearly?year=${filters.year}`);
      return res.data.data as YearlyReportData;
    },
  });

  const openDrilldown = (classId: string, className: string) => {
    setDrilldown({ classId, className });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>{t('reports.title')}</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {t('reports.subtitle')}
          </Text>
        </div>
        <ThemeIcon size="xl" radius="md" variant="light" color="green">
          <IconReportMoney size={24} />
        </ThemeIcon>
      </Group>

      <Card shadow="sm" padding="lg" radius="md">
        <RevenueFiltersBar values={filters} onChange={setFilters} />
      </Card>

      <Tabs value={view} onChange={(v) => v && setView(v as RevenueViewMode)}>
        <Tabs.List>
          {VIEW_TABS.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : (
          <>
            <Tabs.Panel value="summary" pt="md">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
                <StatMini label={t('reports.summary.periodRevenue')} value={formatVnd(revenue?.totalRevenue || 0)} />
                <StatMini
                  label={t('reports.summary.growth')}
                  value={`${revenue?.growthRate ?? 0}%`}
                />
                <StatMini
                  label={t('reports.summary.collectionRate')}
                  value={`${revenue?.collectionRate ?? 0}%`}
                />
                <StatMini
                  label={t('reports.summary.outstanding')}
                  value={formatVnd(revenue?.outstandingAmount || 0)}
                />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                <Card shadow="sm" padding="lg" radius="md">
                  <Group gap="xs" mb="md">
                    <IconChartPie size={18} />
                    <Title order={5}>{t('reports.byClass.byClassHeading')}</Title>
                  </Group>
                  <RevenuePieByClass data={revenue} onClassClick={openDrilldown} />
                </Card>
                <Card shadow="sm" padding="lg" radius="md">
                  <Group gap="xs" mb="md">
                    <IconChartLine size={18} />
                    <Title order={5}>{t('reports.trendHeading')}</Title>
                  </Group>
                  <RevenueTrendChart data={revenue} view="summary" />
                </Card>
              </SimpleGrid>
            </Tabs.Panel>

            <Tabs.Panel value="by_class" pt="md">
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                <Card shadow="sm" padding="lg" radius="md">
                  <Title order={5} mb="md">
                    {t('reports.byClass.pieChart')}
                  </Title>
                  <RevenuePieByClass data={revenue} onClassClick={openDrilldown} />
                </Card>
                <Card shadow="sm" padding="lg" radius="md">
                  <Title order={5} mb="md">
                    {t('reports.byClass.tableTitle')}
                  </Title>
                  <Text size="xs" c="dimmed" mb="sm">
                    {t('reports.byClass.clickHint')}
                  </Text>
                  <RevenueByClassList data={revenue} onClassClick={openDrilldown} />
                </Card>
              </SimpleGrid>
            </Tabs.Panel>

            <Tabs.Panel value="by_student" pt="md">
              <Card shadow="sm" padding="lg" radius="md">
                <Group gap="xs" mb="md">
                  <IconUsers size={18} />
                  <Title order={5}>{t('reports.byStudent.tableTitle')}</Title>
                </Group>
                <RevenueByStudentTable data={revenue} />
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="trend" pt="md">
              <Card shadow="sm" padding="lg" radius="md">
                <Title order={5} mb="md">
                  {t('reports.trendTitle')}
                </Title>
                <RevenueTrendChart data={revenue} view="trend" height={320} />
              </Card>
            </Tabs.Panel>
          </>
        )}
      </Tabs>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card shadow="sm" padding="lg" radius="md">
          <Title order={5} mb="md">
            {t('reports.monthlyReport', { month: filters.month, year: filters.year })}
          </Title>
          {monthly ? (
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">{t('reports.activeStudents')}</Text>
                <Text fw={500}>{monthly.summary.totalStudents}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">{t('reports.newEnrollments')}</Text>
                <Text fw={500}>{monthly.summary.newEnrollments}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">{t('reports.averageAttendance')}</Text>
                <Text fw={500}>{monthly.summary.averageAttendance}%</Text>
              </Group>
            </Stack>
          ) : (
            <Loader size="sm" />
          )}
        </Card>
        <Card shadow="sm" padding="lg" radius="md">
          <Title order={5} mb="md">
            {t('reports.yearlyReport', { year: filters.year })}
          </Title>
          {yearly ? (
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">{t('reports.yearRevenue')}</Text>
                <Text fw={500}>{formatVnd(yearly.summary.totalRevenue)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">{t('reports.summary.growth')}</Text>
                <Text fw={500}>{yearly.summary.growthRate}%</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">{t('reports.newEnrollments')}</Text>
                <Text fw={500}>{yearly.summary.newEnrollments}</Text>
              </Group>
            </Stack>
          ) : (
            <Loader size="sm" />
          )}
        </Card>
      </SimpleGrid>

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
