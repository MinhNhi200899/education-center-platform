import { useState } from 'react';
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
import api from '@/lib/api';
import type { Teacher, PaginatedResult } from '@/types';

export function TeacherListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'yellow';
      case 'terminated': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Teachers</Title>
        <Group gap="sm">
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/teachers/new')}>
            Add Teacher
          </Button>
        </Group>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <TextInput
          placeholder="Search by name, email..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          mb="md"
        />

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Phone</Table.Th>
              <Table.Th>Specialization</Table.Th>
              <Table.Th>Status</Table.Th>
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
                    {teacher.status}
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
                        View Details
                      </Menu.Item>
                      <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => navigate(`/teachers/${teacher.id}/edit`)}>
                        Edit
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => archiveMutation.mutate(teacher.id)}>
                        Archive
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
            <Text c="dimmed">No teachers found</Text>
            <Button variant="light" onClick={() => navigate('/teachers/new')}>
              Add your first teacher
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