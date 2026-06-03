import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stack,
  Title,
  Group,
  Button,
  TextInput,
  Select,
  Table,
  Badge,
  ActionIcon,
  Menu,
  Paper,
  Text,
  Pagination,
  Modal,
  FileButton,
  List,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconPencil,
  IconTrash,
  IconEye,
  IconDownload,
  IconUpload,
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import {
  downloadCsv,
  parseCsvToRows,
  STUDENT_IMPORT_TEMPLATE_HEADERS,
  STUDENT_IMPORT_TEMPLATE_ROW,
} from '@/lib/csv-utils';
import type { Student, PaginatedResult } from '@/types';

export function StudentListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const resetRef = useRef<() => void>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; message: string }>>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search, status, user?.centerId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(status && { status }),
        ...(user?.centerId && { centerId: user.centerId }),
      });
      const response = await api.get(`/students?${params}`);
      return response.data as PaginatedResult<Student>;
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (rows: Record<string, string>[]) => {
      const response = await api.post('/students/import', {
        centerId: user?.centerId,
        rows,
      });
      return response.data.data as {
        imported: number;
        failed: number;
        errors: Array<{ row: number; message: string }>;
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setImportErrors(result.errors ?? []);
      notifications.show({
        title: 'Import complete',
        message: `${result.imported} imported, ${result.failed} failed`,
        color: result.failed > 0 ? 'yellow' : 'green',
      });
      if (result.failed === 0) {
        setImportModalOpen(false);
      }
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Import failed',
        message: error.response?.data?.error?.message || 'Could not import students',
        color: 'red',
      });
    },
  });

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(user?.centerId && { centerId: user.centerId }),
        ...(search && { search }),
        ...(status && { status }),
      });
      const response = await api.get(`/students/export?${params}`);
      const rows = response.data.data as Record<string, unknown>[];
      downloadCsv(
        `students-${new Date().toISOString().slice(0, 10)}.csv`,
        ['fullName', 'dateOfBirth', 'gender', 'phone', 'email', 'address', 'enrollmentDate', 'status', 'center'],
        rows
      );
    } catch (error: any) {
      notifications.show({
        title: 'Export failed',
        message: error.response?.data?.error?.message || 'Could not export students',
        color: 'red',
      });
    }
  };

  const handleDownloadTemplate = () => {
    downloadCsv('students-import-template.csv', STUDENT_IMPORT_TEMPLATE_HEADERS, [
      STUDENT_IMPORT_TEMPLATE_ROW,
    ]);
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file || !user?.centerId) return;
    const text = await file.text();
    const rows = parseCsvToRows(text);
    if (rows.length === 0) {
      notifications.show({ title: 'Error', message: 'No data rows found in file', color: 'red' });
      return;
    }
    importMutation.mutate(rows);
    resetRef.current?.();
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'active': return 'green';
      case 'inactive': return 'yellow';
      case 'archived': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Students</Title>
        <Group gap="sm">
          <Button
            variant="light"
            leftSection={<IconUpload size={16} />}
            onClick={() => {
              setImportErrors([]);
              setImportModalOpen(true);
            }}
          >
            Import
          </Button>
          <Button
            leftSection={<IconDownload size={16} />}
            variant="light"
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/students/new')}
          >
            Add Student
          </Button>
        </Group>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <Group gap="md">
          <TextInput
            placeholder="Search by name, email, phone..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by status"
            data={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'archived', label: 'Archived' },
            ]}
            value={status}
            onChange={setStatus}
            clearable
            w={200}
          />
        </Group>
      </Paper>

      <Paper shadow="sm" radius="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Date of Birth</Table.Th>
              <Table.Th>Gender</Table.Th>
              <Table.Th>Phone</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Enrollment Date</Table.Th>
              <Table.Th w={60}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.data.map((student) => (
              <Table.Tr key={student.id}>
                <Table.Td>
                  <Text fw={500}>{student.fullName}</Text>
                </Table.Td>
                <Table.Td>{new Date(student.dateOfBirth).toLocaleDateString()}</Table.Td>
                <Table.Td>{student.gender}</Table.Td>
                <Table.Td>{student.phone || '-'}</Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(student.status)} variant="light">
                    {student.status}
                  </Badge>
                </Table.Td>
                <Table.Td>{new Date(student.enrollmentDate).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  <Menu shadow="md" position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray">
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEye size={14} />}
                        onClick={() => navigate(`/students/${student.id}`)}
                      >
                        View Details
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconPencil size={14} />}
                        onClick={() => navigate(`/students/${student.id}/edit`)}
                      >
                        Edit
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => archiveMutation.mutate(student.id)}
                      >
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
            <Text c="dimmed">No students found</Text>
            <Button variant="light" onClick={() => navigate('/students/new')}>
              Add your first student
            </Button>
          </Stack>
        )}

        {data && data.meta.totalPages > 1 && (
          <Group justify="center" p="md">
            <Pagination
              total={data.meta.totalPages}
              value={page}
              onChange={setPage}
            />
          </Group>
        )}
      </Paper>

      <Modal
        opened={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Students"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Upload a CSV file with columns: fullName, dateOfBirth, gender, enrollmentDate (required), plus optional phone, email, address.
          </Text>
          <Button variant="light" leftSection={<IconDownload size={16} />} onClick={handleDownloadTemplate}>
            Download Template
          </Button>
          <FileButton resetRef={resetRef} accept=".csv,text/csv" onChange={handleFileUpload}>
            {(props) => (
              <Button {...props} loading={importMutation.isPending}>
                Upload CSV
              </Button>
            )}
          </FileButton>
          {importErrors.length > 0 && (
            <Paper withBorder p="sm">
              <Text size="sm" fw={500} mb="xs">
                Import errors
              </Text>
              <List size="sm">
                {importErrors.slice(0, 10).map((err) => (
                  <List.Item key={`${err.row}-${err.message}`}>
                    Row {err.row}: {err.message}
                  </List.Item>
                ))}
              </List>
            </Paper>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
