import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stack, Title, Group, Button, TextInput, Table, Badge, ActionIcon, Menu, Paper, Text, Pagination,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconPlus, IconSearch, IconDots, IconPencil, IconTrash, IconEye, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import type { Class, PaginatedResult } from '@/types';

export function ClassListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const STATUS_COLORS = useMemo(
    () => ({
      active: 'green',
      inactive: 'yellow',
      completed: 'blue',
      archived: 'gray',
    }),
    []
  );

  const LEVEL_LABELS = useMemo(
    () => ({
      beginner: t('classes.levels.beginner'),
      intermediate: t('classes.levels.intermediate'),
      advanced: t('classes.levels.advanced'),
    }),
    [t]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['classes', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '20', ...(search && { search }) });
      const response = await api.get(`/classes?${params}`);
      return response.data as PaginatedResult<Class>;
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });

  const getStatusColor = (status: string) => STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'gray';

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>{t('classes.list.title')}</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/classes/new')}>{t('classes.list.addNew')}</Button>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <TextInput placeholder={t('classes.list.searchPlaceholder')} leftSection={<IconSearch size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} mb="md" />

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('classes.list.table.name')}</Table.Th>
              <Table.Th>{t('classes.list.table.level')}</Table.Th>
              <Table.Th>{t('classes.list.table.capacity')}</Table.Th>
              <Table.Th>{t('classes.list.table.classroom')}</Table.Th>
              <Table.Th>{t('classes.list.table.status')}</Table.Th>
              <Table.Th>{t('classes.list.table.primaryTeacher')}</Table.Th>
              <Table.Th w={60}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.data.map((cls) => (
              <Table.Tr key={cls.id}>
                <Table.Td><Text fw={500}>{cls.name}</Text></Table.Td>
                <Table.Td><Badge variant="light">{LEVEL_LABELS[cls.academicLevel as keyof typeof LEVEL_LABELS] || cls.academicLevel}</Badge></Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <IconUsers size={14} />
                    <Text size="sm">{cls.currentEnrollment}/{cls.capacity}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>{cls.classroom || '-'}</Table.Td>
                <Table.Td><Badge color={getStatusColor(cls.status)} variant="light">{t(`classes.status.${cls.status}` as any)}</Badge></Table.Td>
                <Table.Td>{cls.primaryTeacher?.fullName || '-'}</Table.Td>
                <Table.Td>
                  <Menu shadow="md" position="bottom-end">
                    <Menu.Target><ActionIcon variant="subtle" color="gray"><IconDots size={16} /></ActionIcon></Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEye size={14} />} onClick={() => navigate(`/classes/${cls.id}`)}>{t('common.viewDetails')}</Menu.Item>
                      <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => navigate(`/classes/${cls.id}/edit`)}>{t('common.edit')}</Menu.Item>
                      <Menu.Divider />
                      <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => archiveMutation.mutate(cls.id)}>{t('common.archive')}</Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {data?.data.length === 0 && !isLoading && (
          <Stack align="center" py="xl">
            <Text c="dimmed">{t('classes.list.noClasses')}</Text>
            <Button variant="light" onClick={() => navigate('/classes/new')}>{t('classes.list.addFirst')}</Button>
          </Stack>
        )}

        {data && data.meta.totalPages > 1 && (
          <Group justify="center" p="md"><Pagination total={data.meta.totalPages} value={page} onChange={setPage} /></Group>
        )}
      </Paper>
    </Stack>
  );
}
