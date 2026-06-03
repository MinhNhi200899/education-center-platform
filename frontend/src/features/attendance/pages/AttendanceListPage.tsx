import { Stack, Title, Paper, Table, Text, Badge, Group, Select, Pagination } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';
import api from '@/lib/api';
import type { AttendanceRecord, Class } from '@/types';

export function AttendanceListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [classId, setClassId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { data: classes } = useQuery({
    queryKey: ['classes-filter'],
    queryFn: async () => {
      const res = await api.get('/classes?limit=100');
      return res.data.data as Class[];
    },
  });

  const { data } = useQuery({
    queryKey: ['attendance', page, classId, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(classId && { classId }),
        ...(status && { status }),
      });
      const response = await api.get(`/attendance?${params}`);
      return response.data;
    },
  });

  const getStatusColor = (s: string) =>
    ({ present: 'green', absent: 'red', late: 'yellow', excused: 'blue' }[s] || 'gray');

  const statusVi = (s: string) =>
    ({ present: 'Có', absent: 'Vắng', late: 'Muộn', excused: 'Có phép' }[s] || s);

  return (
    <Stack gap="lg">
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/attendance')}>
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Title order={2}>Lịch sử điểm danh</Title>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <Group mb="md">
          <Select
            placeholder="Lọc theo lớp"
            data={classes?.map((c) => ({ value: c.id, label: c.name })) || []}
            clearable
            w={220}
            value={classId}
            onChange={setClassId}
          />
          <Select
            placeholder="Trạng thái"
            data={[
              { value: 'present', label: 'Có' },
              { value: 'absent', label: 'Vắng' },
              { value: 'late', label: 'Muộn' },
              { value: 'excused', label: 'Có phép' },
            ]}
            clearable
            w={150}
            value={status}
            onChange={setStatus}
          />
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Ngày</Table.Th>
              <Table.Th>Lớp</Table.Th>
              <Table.Th>Học sinh</Table.Th>
              <Table.Th>Trạng thái</Table.Th>
              <Table.Th>Lý do</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.data?.map((record: AttendanceRecord) => (
              <Table.Tr key={record.id}>
                <Table.Td>
                  {record.session?.sessionDate
                    ? new Date(record.session.sessionDate).toLocaleDateString('vi-VN')
                    : '-'}
                </Table.Td>
                <Table.Td>{record.session?.class?.name || '-'}</Table.Td>
                <Table.Td>
                  <Text fw={500}>{record.student?.fullName || '-'}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(record.status)} variant="light">
                    {statusVi(record.status)}
                  </Badge>
                </Table.Td>
                <Table.Td>{record.reason || '-'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {data?.data?.length === 0 && (
          <Stack align="center" py="xl">
            <Text c="dimmed">Chưa có bản ghi điểm danh</Text>
          </Stack>
        )}

        {data?.meta?.totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination total={data.meta.totalPages} value={page} onChange={setPage} />
          </Group>
        )}
      </Paper>
    </Stack>
  );
}
