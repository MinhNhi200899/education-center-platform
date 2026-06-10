import { Paper, Text, Group, Stack } from '@mantine/core';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import type { RevenueReportData } from '../types';

const PIE_COLORS = ['#12b886', '#228be6', '#7950f2', '#fab005', '#fa5252', '#15aabf'];

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatAxisMillions = (value: unknown) => `${(toNumber(value) / 1e6).toFixed(0)}M`;

function useChartFormatters() {
  const { t } = useTranslation();
  const { formatVnd } = useLocaleFormatters();
  return { t, formatVnd };
}

export function RevenuePieByClass({
  data,
  onClassClick,
  height = 280,
}: {
  data: RevenueReportData | undefined;
  onClassClick?: (classId: string, className: string) => void;
  height?: number;
}) {
  const { t, formatVnd } = useChartFormatters();
  const chartData =
    data?.byClass?.map((c: { className: string; revenue: number; classId: string }) => ({
      name: c.className,
      value: c.revenue,
      classId: c.classId,
    })) || [];

  const formatTooltipVnd = (value: unknown) => formatVnd(toNumber(value));

  if (chartData.length === 0) {
    return (
      <Paper withBorder p="md" radius="md" h={height}>
        <Group justify="center" h="100%">
          <Text c="dimmed" size="sm">
            {t('reports.byClass.noData')}
          </Text>
        </Group>
      </Paper>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ name, percent }) =>
            `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
          }
          onClick={(_, index) => {
            const item = chartData[index];
            if (item && onClassClick) onClassClick(item.classId, item.name);
          }}
          style={{ cursor: onClassClick ? 'pointer' : 'default' }}
        >
          {chartData.map((_: unknown, i: number) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={formatTooltipVnd} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RevenueTrendChart({
  data,
  view,
  height = 280,
}: {
  data: RevenueReportData | undefined;
  view: RevenueReportData['view'];
  height?: number;
}) {
  const { t, formatVnd } = useChartFormatters();
  const trend = data?.trend || [];
  const chartData = trend.map((tr: { label?: string; date?: string; amount: number }) => ({
    label: tr.label || tr.date,
    amount: tr.amount,
  }));

  const formatTooltipVnd = (value: unknown) => formatVnd(toNumber(value));

  if (chartData.length === 0) {
    return (
      <Paper withBorder p="md" radius="md" h={height}>
        <Group justify="center" h="100%">
          <Text c="dimmed" size="sm">
            {t('reports.emptyTrend')}
          </Text>
        </Group>
      </Paper>
    );
  }

  const isMonthly = view === 'trend' && chartData[0]?.label?.includes('-');

  return (
    <ResponsiveContainer width="100%" height={height}>
      {isMonthly ? (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatAxisMillions} />
          <Tooltip formatter={formatTooltipVnd} />
          <Bar dataKey="amount" name="Doanh thu" fill="#228be6" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatAxisMillions} />
          <Tooltip formatter={formatTooltipVnd} />
          <Line type="monotone" dataKey="amount" name="Doanh thu" stroke="#12b886" strokeWidth={2} dot={false} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

export function RevenueByStudentTable({
  data,
  onStudentClick,
}: {
  data: RevenueReportData | undefined;
  onStudentClick?: (studentId: string) => void;
}) {
  const { t, formatVnd } = useChartFormatters();
  const rows = data?.byStudent || [];

  if (rows.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {t('reports.byStudent.noData')}
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {rows.map((row: { studentId: string; studentName: string; paymentCount: number; revenue: number }, idx: number) => (
        <Group
          key={row.studentId}
          justify="space-between"
          p="xs"
          style={{
            borderRadius: 8,
            background: idx % 2 === 0 ? 'var(--mantine-color-gray-0)' : undefined,
            cursor: onStudentClick ? 'pointer' : undefined,
          }}
          onClick={() => onStudentClick?.(row.studentId)}
        >
          <Text size="sm">{row.studentName}</Text>
          <Group gap="lg">
            <Text size="xs" c="dimmed">
              {t('reports.byStudent.transactions', { count: row.paymentCount })}
            </Text>
            <Text size="sm" fw={600}>
              {formatVnd(row.revenue)}
            </Text>
          </Group>
        </Group>
      ))}
    </Stack>
  );
}

export function RevenueByClassList({
  data,
  onClassClick,
}: {
  data: RevenueReportData | undefined;
  onClassClick?: (classId: string, className: string) => void;
}) {
  const { t, formatVnd } = useChartFormatters();
  const rows = data?.byClass || [];

  if (rows.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {t('reports.emptyByClass')}
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {rows.map((row: { classId: string; className: string; revenue: number }) => (
        <Group
          key={row.classId}
          justify="space-between"
          p="xs"
          style={{
            borderRadius: 8,
            cursor: onClassClick ? 'pointer' : undefined,
          }}
          onClick={() => onClassClick?.(row.classId, row.className)}
        >
          <Text size="sm">{row.className}</Text>
          <Text size="sm" fw={600}>
            {formatVnd(row.revenue)}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

// Re-exported for legacy callers (DashboardPage). Prefer useLocaleFormatters().
export const formatVnd = (value: number, _lng?: string): string => {
  if (value == null) return '0';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};
