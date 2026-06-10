import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stack,
  Title,
  Group,
  Button,
  TextInput,
  Table,
  Badge,
  ActionIcon,
  Menu,
  Paper,
  Text,
  Pagination,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconPencil,
  IconTrash,
  IconEye,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import type { Teacher, PaginatedResult } from '@/types';

export function TeacherListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const STATUS_COLORS = useMemo(
    () => ({
      active: 'green',
      inactive: 'yellow',
      terminated: 'red',
    }),
    []
  );

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });
      const response = await api.get(`/teachers?${params}`);
      return response.data as PaginatedResult<Teacher>;
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teachers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });

  const getStatusColor = (status: string) => STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'gray';

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>{t('teachers.list.title')}</Title>
        <Group gap="sm">
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/teachers/new')}>
            {t('teachers.list.addNew')}
          </Button>
        </Group>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <TextInput
          placeholder={t('teachers.list.searchPlaceholder')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          mb="md"
        />

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('teachers.list.table.name')}</Table.Th>
              <Table.Th>{t('teachers.list.table.email')}</Table.Th>
              <Table.Th>{t('teachers.list.table.phone')}</Table.Th>
              <Table.Th>{t('teachers.list.table.specialization')}</Table.Th>
              <Table.Th>{t('teachers.list.table.status')}</Table.Th>
              <Table.Th w={60}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.data.map((teacher) => (
              <Table.Tr key={teacher.id}>
                <Table.Td>
                  <Text fw={500}>{teacher.fullName}</Text>
                </Table.Td>
                <Table.Td>{teacher.email}</Table.Td>
                <Table.Td>{teacher.phone}</Table.Td>
                <Table.Td>{teacher.specialization || '-'}</Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(teacher.status)} variant="light">
                    {t(`teachers.status.${teacher.status}` as any)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Menu shadow="md" position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray">
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEye size={14} />} onClick={() => navigate(`/teachers/${teacher.id}`)}>
                        {t('common.viewDetails')}
                      </Menu.Item>
                      <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => navigate(`/teachers/${teacher.id}/edit`)}>
                        {t('common.edit')}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => archiveMutation.mutate(teacher.id)}>
                        {t('common.archive')}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {data?.data.length === 0 && !isLoading && (
          <Stack align="center" py="xl">
            <Text c="dimmed">{t('teachers.list.noTeachers')}</Text>
            <Button variant="light" onClick={() => navigate('/teachers/new')}>
              {t('teachers.list.addFirst')}
            </Button>
          </Stack>
        )}

        {data && data.meta.totalPages > 1 && (
          <Group justify="center" p="md">
            <Pagination total={data.meta.totalPages} value={page} onChange={setPage} />
          </Group>
        )}
      </Paper>
    </Stack>
  );
}
