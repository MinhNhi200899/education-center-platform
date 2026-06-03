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
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconPlus, IconEye, IconUsers } from '@tabler/icons-react';
import api from '@/lib/api';
import type { Evaluation, EvaluationType } from '@/types';
import { EvaluationBulkModal } from '../components/EvaluationBulkModal';

const TYPE_LABELS: Record<EvaluationType, string> = {
  daily: 'Buổi học',
  weekly: 'Tuần',
  monthly: 'Tháng',
  term: 'Học kỳ',
};

const TYPE_COLORS: Record<string, string> = {
  daily: 'green',
  weekly: 'blue',
  monthly: 'violet',
  term: 'orange',
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

export function EvaluationListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [classId, setClassId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(String(new Date().getMonth() + 1));
  const [year, setYear] = useState<string | null>(String(new Date().getFullYear()));
  const [evaluationType, setEvaluationType] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

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

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { value: String(y), label: String(y) };
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Nhận xét học sinh</Title>
          <Text c="dimmed" size="sm">
            Theo dõi điểm Nói/Viết, thái độ và lịch sử theo tháng
          </Text>
        </div>
        <Group>
          <Button
            variant="light"
            leftSection={<IconUsers size={16} />}
            onClick={() => setBulkOpen(true)}
          >
            Nhận xét cả lớp
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/evaluations/new')}
          >
            Thêm nhận xét
          </Button>
        </Group>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <Select
            label="Lớp"
            placeholder="Tất cả lớp"
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
            label="Tháng"
            placeholder="Chọn tháng"
            clearable
            data={MONTHS}
            value={month}
            onChange={(v) => {
              setMonth(v);
              setPage(1);
            }}
          />
          <Select
            label="Năm"
            placeholder="Chọn năm"
            clearable
            data={years}
            value={year}
            onChange={(v) => {
              setYear(v);
              setPage(1);
            }}
          />
          <Select
            label="Loại"
            placeholder="Tất cả"
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
              <Table.Th>Ngày</Table.Th>
              <Table.Th>Học sinh</Table.Th>
              <Table.Th>Lớp</Table.Th>
              <Table.Th>Loại</Table.Th>
              <Table.Th>Tham gia</Table.Th>
              <Table.Th>BTVN</Table.Th>
              <Table.Th>Thái độ</Table.Th>
              <Table.Th>Điểm Nói</Table.Th>
              <Table.Th>Điểm Viết</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={10}>
                  <Text c="dimmed" ta="center" py="lg">
                    Đang tải...
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              data?.data?.map((evaluation: Evaluation) => (
                <Table.Tr key={evaluation.id}>
                  <Table.Td>
                    {new Date(evaluation.evaluationDate).toLocaleDateString('vi-VN')}
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
                      {TYPE_LABELS[evaluation.evaluationType] || evaluation.evaluationType}
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
                      Xem
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        {!isLoading && data?.data?.length === 0 && (
          <Stack align="center" py="xl">
            <Text c="dimmed">Chưa có nhận xét nào trong khoảng đã chọn</Text>
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
