import { Group, Select } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Class, PaginatedResult } from '@/types';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

function yearOptions() {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2].map((year) => ({
    value: String(year),
    label: String(year),
  }));
}

export interface RevenueFilterValues {
  year: number;
  month: number;
  classId: string | null;
}

interface Props {
  values: RevenueFilterValues;
  onChange: (values: RevenueFilterValues) => void;
  showClassFilter?: boolean;
}

export function RevenueFiltersBar({ values, onChange, showClassFilter = true }: Props) {
  const { data: classesData } = useQuery({
    queryKey: ['classes', 'filter'],
    queryFn: async () => {
      const res = await api.get('/classes?limit=100');
      return res.data as PaginatedResult<Class>;
    },
    enabled: showClassFilter,
  });

  const classOptions = [
    { value: '', label: 'Tất cả lớp' },
    ...(classesData?.data?.map((c) => ({ value: c.id, label: c.name })) || []),
  ];

  return (
    <Group gap="md">
      <Select
        label="Năm"
        data={yearOptions()}
        value={String(values.year)}
        onChange={(v) => v && onChange({ ...values, year: Number(v) })}
        w={120}
      />
      <Select
        label="Tháng"
        data={MONTHS}
        value={String(values.month)}
        onChange={(v) => v && onChange({ ...values, month: Number(v) })}
        w={140}
      />
      {showClassFilter && (
        <Select
          label="Lớp"
          data={classOptions}
          value={values.classId || ''}
          onChange={(v) => onChange({ ...values, classId: v || null })}
          w={220}
          searchable
          clearable
        />
      )}
    </Group>
  );
}
