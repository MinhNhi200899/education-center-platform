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
import type { RevenueReportData } from '../types';

const PIE_COLORS = ['#12b886', '#228be6', '#7950f2', '#fab005', '#fa5252', '#15aabf'];

const formatVnd = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

interface Props {
  data: RevenueReportData | undefined;
  view: RevenueReportData['view'];
  onClassClick?: (classId: string, className: string) => void;
  height?: number;
}

export function RevenuePieByClass({ data, onClassClick, height = 280 }: Pick<Props, 'data' | 'onClassClick' | 'height'>) {
  const chartData =
    data?.byClass?.map((c) => ({
      name: c.className,
      value: c.revenue,
      classId: c.classId,
    })) || [];

  if (chartData.length === 0) {
    return (
      <Paper withBorder p="md" radius="md" h={height}>
        <Group justify="center" h="100%">
          <Text c="dimmed" size="sm">
            Chưa có dữ liệu doanh thu theo lớp
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
          {chartData.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatVnd(toNumber(v))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RevenueTrendChart({ data, view, height = 280 }: Pick<Props, 'data' | 'view' | 'height'>) {
  const trend = data?.trend || [];
  const chartData = trend.map((t) => ({
    label: t.label || t.date,
    amount: t.amount,
  }));

  if (chartData.length === 0) {
    return (
      <Paper withBorder p="md" radius="md" h={height}>
        <Group justify="center" h="100%">
          <Text c="dimmed" size="sm">
            Chưa có dữ liệu xu hướng
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
          <YAxis tickFormatter={(v) => `${(toNumber(v) / 1e6).toFixed(0)}M`} />
          <Tooltip formatter={(v) => formatVnd(toNumber(v))} />
          <Bar dataKey="amount" name="Doanh thu" fill="#228be6" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${(toNumber(v) / 1e6).toFixed(0)}M`} />
          <Tooltip formatter={(v) => formatVnd(toNumber(v))} />
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
  const rows = data?.byStudent || [];

  if (rows.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        Chưa có dữ liệu doanh thu theo học sinh trong kỳ đã chọn
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {rows.map((row, idx) => (
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
              {row.paymentCount} giao dịch
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
  const rows = data?.byClass || [];

  if (rows.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        Chưa có dữ liệu theo lớp
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {rows.map((row) => (
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

export { formatVnd };
