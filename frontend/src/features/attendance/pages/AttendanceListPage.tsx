import { Stack, Title, Paper, Table, Text, Badge, Group, Select, Pagination } from '@mantine/core';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import type { AttendanceRecord, Class } from '@/types';

export function AttendanceListPage() {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
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

  const getStatusColor = useMemo(
    () => ({ present: 'green', absent: 'red', late: 'yellow', excused: 'blue' }),
    []
  );

  const statusOptions = [
    { value: 'present', label: t('attendance.status.present') },
    { value: 'absent', label: t('attendance.status.absent') },
    { value: 'late', label: t('attendance.status.late') },
    { value: 'excused', label: t('attendance.status.excused') },
  ];

  return (
    <Stack gap="lg">
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/attendance')}>
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Title order={2}>{t('attendance.history.title')}</Title>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <Group mb="md">
          <Select
            placeholder={t('attendance.history.filterByClass')}
            data={classes?.map((c) => ({ value: c.id, label: c.name })) || []}
            clearable
            w={220}
            value={classId}
            onChange={setClassId}
          />
          <Select
            placeholder={t('attendance.history.filterByStatus')}
            data={statusOptions}
            clearable
            w={150}
            value={status}
            onChange={setStatus}
          />
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('attendance.history.table.date')}</Table.Th>
              <Table.Th>{t('attendance.history.table.class')}</Table.Th>
              <Table.Th>{t('attendance.history.table.student')}</Table.Th>
              <Table.Th>{t('attendance.history.table.status')}</Table.Th>
              <Table.Th>{t('attendance.history.table.reason')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.data?.map((record: AttendanceRecord) => (
              <Table.Tr key={record.id}>
                <Table.Td>
                  {record.session?.sessionDate
                    ? formatDate(record.session.sessionDate)
                    : '-'}
                </Table.Td>
                <Table.Td>{record.session?.class?.name || '-'}</Table.Td>
                <Table.Td>
                  <Text fw={500}>{record.student?.fullName || '-'}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor[record.status as keyof typeof getStatusColor] || 'gray'} variant="light">
                    {t(`attendance.status.${record.status}` as any)}
                  </Badge>
                </Table.Td>
                <Table.Td>{record.reason || '-'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {data?.data?.length === 0 && (
          <Stack align="center" py="xl">
            <Text c="dimmed">{t('attendance.history.empty')}</Text>
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
