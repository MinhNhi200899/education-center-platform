import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stack, Title, Group, Button, TextInput, Table, Badge, ActionIcon, Menu, Paper, Text, Pagination,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconPlus, IconSearch, IconDots, IconPencil, IconTrash, IconEye, IconUsers } from '@tabler/icons-react';
import api from '@/lib/api';
import type { Class, PaginatedResult } from '@/types';

export function ClassListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

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

  const getStatusColor = (status: string) => ({
    active: 'green', inactive: 'yellow', completed: 'blue', archived: 'gray',
  }[status] || 'gray');

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Classes</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/classes/new')}>Add Class</Button>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <TextInput placeholder="Search by name..." leftSection={<IconSearch size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} mb="md" />

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Level</Table.Th>
              <Table.Th>Capacity</Table.Th>
              <Table.Th>Classroom</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Primary Teacher</Table.Th>
              <Table.Th w={60}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.data.map((cls) => (
              <Table.Tr key={cls.id}>
                <Table.Td><Text fw={500}>{cls.name}</Text></Table.Td>
                <Table.Td><Badge variant="light">{cls.academicLevel}</Badge></Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <IconUsers size={14} />
                    <Text size="sm">{cls.currentEnrollment}/{cls.capacity}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>{cls.classroom || '-'}</Table.Td>
                <Table.Td><Badge color={getStatusColor(cls.status)} variant="light">{cls.status}</Badge></Table.Td>
                <Table.Td>{cls.primaryTeacher?.fullName || '-'}</Table.Td>
                <Table.Td>
                  <Menu shadow="md" position="bottom-end">
                    <Menu.Target><ActionIcon variant="subtle" color="gray"><IconDots size={16} /></ActionIcon></Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEye size={14} />} onClick={() => navigate(`/classes/${cls.id}`)}>View Details</Menu.Item>
                      <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => navigate(`/classes/${cls.id}/edit`)}>Edit</Menu.Item>
                      <Menu.Divider />
                      <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => archiveMutation.mutate(cls.id)}>Archive</Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {data?.data.length === 0 && !isLoading && (
          <Stack align="center" py="xl">
            <Text c="dimmed">No classes found</Text>
            <Button variant="light" onClick={() => navigate('/classes/new')}>Add your first class</Button>
          </Stack>
        )}

        {data && data.meta.totalPages > 1 && (
          <Group justify="center" p="md"><Pagination total={data.meta.totalPages} value={page} onChange={setPage} /></Group>
        )}
      </Paper>
    </Stack>
  );
}