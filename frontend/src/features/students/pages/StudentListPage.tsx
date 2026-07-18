import { useRef, useState, useMemo } from 'react';
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
  CopyButton,
  Tooltip,
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
  IconCopy,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import {
  downloadCsv,
  parseCsvToRows,
  STUDENT_IMPORT_TEMPLATE_HEADERS,
  STUDENT_IMPORT_TEMPLATE_ROW,
} from '@/lib/csv-utils';
import type { Student, PaginatedResult } from '@/types';

export function StudentListPage() {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const resetRef = useRef<() => void>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; message: string }>>([]);

  const STATUS_COLORS = useMemo(
    () => ({
      active: 'green',
      inactive: 'yellow',
      archived: 'gray',
    }),
    []
  );

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
        title: t('students.list.import.successTitle'),
        message: t('students.list.import.successMessage', {
          imported: result.imported,
          failed: result.failed,
        }),
        color: result.failed > 0 ? 'yellow' : 'green',
      });
      if (result.failed === 0) {
        setImportModalOpen(false);
      }
    },
    onError: (error: any) => {
      notifications.show({
        title: t('students.list.import.failedTitle'),
        message: error.response?.data?.error?.message || t('common.error'),
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
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('students.list.exportFailed'),
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
      notifications.show({ title: t('common.error'), message: t('students.list.import.emptyFile'), color: 'red' });
      return;
    }
    importMutation.mutate(rows);
    resetRef.current?.();
  };

  const getStatusColor = (s: string) => STATUS_COLORS[s as keyof typeof STATUS_COLORS] || 'gray';

  const statusOptions = [
    { value: 'active', label: t('students.status.active') },
    { value: 'inactive', label: t('students.status.inactive') },
    { value: 'archived', label: t('students.status.archived') },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>{t('students.list.title')}</Title>
        <Group gap="sm">
          <Button
            variant="light"
            leftSection={<IconUpload size={16} />}
            onClick={() => {
              setImportErrors([]);
              setImportModalOpen(true);
            }}
          >
            {t('common.import')}
          </Button>
          <Button
            leftSection={<IconDownload size={16} />}
            variant="light"
            onClick={handleExport}
          >
            {t('common.export')}
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/students/new')}
          >
            {t('students.list.addNew')}
          </Button>
        </Group>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <Group gap="md">
          <TextInput
            placeholder={t('students.list.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder={t('students.list.filterByStatus')}
            data={statusOptions}
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
              <Table.Th>{t('students.list.table.name')}</Table.Th>
              <Table.Th>{t('students.list.table.dob')}</Table.Th>
              <Table.Th>{t('students.list.table.gender')}</Table.Th>
              <Table.Th>{t('students.list.table.phone')}</Table.Th>
              <Table.Th>{t('students.list.table.password')}</Table.Th>
              <Table.Th>{t('students.list.table.status')}</Table.Th>
              <Table.Th>{t('students.list.table.enrollmentDate')}</Table.Th>
              <Table.Th w={60}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.data.map((student) => (
              <Table.Tr key={student.id}>
                <Table.Td>
                  <Text fw={500}>{student.fullName}</Text>
                </Table.Td>
                <Table.Td>{formatDate(student.dateOfBirth)}</Table.Td>
                <Table.Td>{student.gender}</Table.Td>
                <Table.Td>{student.phone || '-'}</Table.Td>
                <Table.Td>
                  {student.loginPassword ? (
                    <Group gap={4} wrap="nowrap">
                      <Text ff="monospace" size="sm">
                        {student.loginPassword}
                      </Text>
                      <CopyButton value={student.loginPassword}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? t('common.copied') : t('common.copy')}>
                            <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} size="sm" onClick={copy}>
                              <IconCopy size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  ) : student.hasPortalAccess === false ? (
                    <Badge color="gray" variant="light">
                      {t('students.list.table.offline')}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(student.status)} variant="light">
                    {t(`students.status.${student.status}` as any)}
                  </Badge>
                </Table.Td>
                <Table.Td>{formatDate(student.enrollmentDate)}</Table.Td>
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
                        {t('common.viewDetails')}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconPencil size={14} />}
                        onClick={() => navigate(`/students/${student.id}/edit`)}
                      >
                        {t('common.edit')}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => archiveMutation.mutate(student.id)}
                      >
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
            <Text c="dimmed">{t('students.list.noStudents')}</Text>
            <Button variant="light" onClick={() => navigate('/students/new')}>
              {t('students.list.addFirst')}
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
        title={t('students.list.import.title')}
      
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('students.list.import.description')}
          </Text>
          <Button variant="light" leftSection={<IconDownload size={16} />} onClick={handleDownloadTemplate}>
            {t('students.list.import.downloadTemplate')}
          </Button>
          <FileButton resetRef={resetRef} accept=".csv,text/csv" onChange={handleFileUpload}>
            {(props) => (
              <Button {...props} loading={importMutation.isPending}>
                {t('students.list.import.uploadCsv')}
              </Button>
            )}
          </FileButton>
          {importErrors.length > 0 && (
            <Paper withBorder p="sm">
              <Text size="sm" fw={500} mb="xs">
                {t('students.list.import.errorsTitle')}
              </Text>
              <List size="sm">
                {importErrors.slice(0, 10).map((err) => (
                  <List.Item key={`${err.row}-${err.message}`}>
                    {t('students.list.import.rowError', { row: err.row, message: err.message })}
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
