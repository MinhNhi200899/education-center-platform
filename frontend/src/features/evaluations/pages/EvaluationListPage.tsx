import {
  Stack,
  Title,
  Paper,
  Table,
  Text,
  Badge,
  Group,
  Button,
  Pagination,
  Select,
  SimpleGrid,
} from '@mantine/core';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconPlus, IconEye, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import type { Evaluation } from '@/types';
import { EvaluationBulkModal } from '../components/EvaluationBulkModal';

const TYPE_COLORS: Record<string, string> = {
  daily: 'green',
  weekly: 'blue',
  monthly: 'violet',
  term: 'orange',
};

export function EvaluationListPage() {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [classId, setClassId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(String(new Date().getMonth() + 1));
  const [year, setYear] = useState<string | null>(String(new Date().getFullYear()));
  const [evaluationType, setEvaluationType] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const TYPE_LABELS = useMemo(
    () => ({
      daily: t('evaluations.types.daily'),
      weekly: t('evaluations.types.weekly'),
      monthly: t('evaluations.types.monthly'),
      term: t('evaluations.types.term'),
    }),
    [t]
  );

  const { data: classes } = useQuery({
    queryKey: ['classes-select-eval-list'],
    queryFn: async () => {
      const res = await api.get('/classes?limit=100');
      return res.data.data as Array<{ id: string; name: string }>;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['evaluations', page, classId, month, year, evaluationType],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (classId) params.set('classId', classId);
      if (month) params.set('month', month);
      if (year) params.set('year', year);
      if (evaluationType) params.set('evaluationType', evaluationType);
      const response = await api.get(`/evaluations?${params}`);
      return response.data;
    },
  });

  const MONTHS = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: t('common.monthShort', { n: i + 1 }),
      })),
    [t]
  );

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { value: String(y), label: String(y) };
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>{t('evaluations.list.title')}</Title>
          <Text c="dimmed" size="sm">
            {t('evaluations.list.subtitle')}
          </Text>
        </div>
        <Group>
          <Button
            variant="light"
            leftSection={<IconUsers size={16} />}
            onClick={() => setBulkOpen(true)}
          >
            {t('evaluations.list.bulk')}
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/evaluations/new')}
          >
            {t('evaluations.list.addNew')}
          </Button>
        </Group>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <Select
            label={t('evaluations.list.filter.class')}
            placeholder={t('evaluations.list.filter.allClasses')}
            clearable
            searchable
            data={(classes || []).map((c) => ({ value: c.id, label: c.name }))}
            value={classId}
            onChange={(v) => {
              setClassId(v);
              setPage(1);
            }}
          />
          <Select
            label={t('evaluations.list.filter.month')}
            placeholder={t('evaluations.list.filter.selectMonth')}
            clearable
            data={MONTHS}
            value={month}
            onChange={(v) => {
              setMonth(v);
              setPage(1);
            }}
          />
          <Select
            label={t('evaluations.list.filter.year')}
            placeholder={t('evaluations.list.filter.selectYear')}
            clearable
            data={years}
            value={year}
            onChange={(v) => {
              setYear(v);
              setPage(1);
            }}
          />
          <Select
            label={t('evaluations.list.filter.type')}
            placeholder={t('evaluations.list.filter.all')}
            clearable
            data={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            value={evaluationType}
            onChange={(v) => {
              setEvaluationType(v);
              setPage(1);
            }}
          />
        </SimpleGrid>
      </Paper>

      <Paper shadow="sm" radius="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('evaluations.list.table.date')}</Table.Th>
              <Table.Th>{t('evaluations.list.table.student')}</Table.Th>
              <Table.Th>{t('evaluations.list.table.class')}</Table.Th>
              <Table.Th>{t('evaluations.list.table.type')}</Table.Th>
              <Table.Th>{t('evaluations.list.table.participation')}</Table.Th>
              <Table.Th>{t('evaluations.list.table.homework')}</Table.Th>
              <Table.Th>{t('evaluations.list.table.behavior')}</Table.Th>
              <Table.Th>{t('evaluations.list.table.speakingScore')}</Table.Th>
              <Table.Th>{t('evaluations.list.table.writingScore')}</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={10}>
                  <Text c="dimmed" ta="center" py="lg">
                    {t('evaluations.list.loading')}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              data?.data?.map((evaluation: Evaluation) => (
                <Table.Tr key={evaluation.id}>
                  <Table.Td>
                    {formatDate(evaluation.evaluationDate)}
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{evaluation.student?.fullName || '—'}</Text>
                  </Table.Td>
                  <Table.Td>{evaluation.class?.name || '—'}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={TYPE_COLORS[evaluation.evaluationType] || 'gray'}
                      variant="light"
                    >
                      {TYPE_LABELS[evaluation.evaluationType as keyof typeof TYPE_LABELS] || evaluation.evaluationType}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline">{evaluation.participation ?? '—'}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline">{evaluation.homework ?? '—'}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline">{evaluation.behavior ?? '—'}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="blue" variant="light">
                      {evaluation.speakingScore ?? '—'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="pink" variant="light">
                      {evaluation.writingScore ?? '—'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={<IconEye size={14} />}
                      onClick={() => navigate(`/evaluations/${evaluation.id}`)}
                    >
                      {t('evaluations.list.view')}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        {!isLoading && data?.data?.length === 0 && (
          <Stack align="center" py="xl">
            <Text c="dimmed">{t('evaluations.list.empty')}</Text>
          </Stack>
        )}

        {data && data.meta.totalPages > 1 && (
          <Group justify="center" p="md">
            <Pagination total={data.meta.totalPages} value={page} onChange={setPage} />
          </Group>
        )}
      </Paper>

      <EvaluationBulkModal opened={bulkOpen} onClose={() => setBulkOpen(false)} />
    </Stack>
  );
}
