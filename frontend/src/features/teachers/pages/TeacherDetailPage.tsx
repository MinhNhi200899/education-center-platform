import { useMemo, useState } from 'react';
import {
  Stack,
  Title,
  Paper,
  Grid,
  Text,
  Badge,
  Group,
  Button,
  Breadcrumbs,
  Anchor,
  ThemeIcon,
  Modal,
  Select,
  ActionIcon,
  Tooltip,
  Table,
  ScrollArea,
  TextInput,
  Pagination,
  Checkbox,
  Loader,
  Tabs,
  CopyButton,
} from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconEdit, IconSchool, IconPlus, IconTrash, IconCopy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import type { Class, PaginatedResult, Teacher } from '@/types';

export function TeacherDetailPage() {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [assignClassOpen, setAssignClassOpen] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [classSearch, setClassSearch] = useState('');
  const [classPage, setClassPage] = useState(1);
  const [classLimit, setClassLimit] = useState(20);

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', id],
    queryFn: async () => {
      const response = await api.get(`/teachers/${id}`);
      return response.data.data as Teacher;
    },
    enabled: !!id,
  });

  const { data: classesList, isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes', { page: classPage, limit: classLimit, search: classSearch, centerId: teacher?.centerId }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: classPage.toString(),
        limit: classLimit.toString(),
        ...(classSearch ? { search: classSearch } : {}),
        ...(teacher?.centerId ? { centerId: teacher.centerId } : {}),
      });
      const res = await api.get(`/classes?${params.toString()}`);
      return res.data as PaginatedResult<Class>;
    },
    enabled: assignClassOpen && !!teacher?.centerId,
  });

  const assignedClassIds = useMemo(
    () => new Set((teacher?.classes ?? []).map((a) => a.class.id)),
    [teacher?.classes]
  );

  const visibleClassRows = useMemo(() => {
    const rows = classesList?.data ?? [];
    return rows.filter((c) => !assignedClassIds.has(c.id));
  }, [classesList?.data, assignedClassIds]);

  const allVisibleSelected = useMemo(() => {
    if (visibleClassRows.length === 0) return false;
    return visibleClassRows.every((c) => selectedClassIds.includes(c.id));
  }, [visibleClassRows, selectedClassIds]);

  const assignClassesMutation = useMutation({
    mutationFn: async () => {
      if (!id || selectedClassIds.length === 0) return;
      await api.post(`/teachers/${id}/classes/bulk`, {
        classes: selectedClassIds.map((classId) => ({ classId, role: 'primary' })),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teacher', id] });
      notifications.show({ title: t('common.success'), message: t('teachers.detail.assignClassSuccess'), color: 'green' });
      setAssignClassOpen(false);
      setSelectedClassIds([]);
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('teachers.detail.assignClassFailed'),
        color: 'red',
      });
    },
  });

  const unassignClassMutation = useMutation({
    mutationFn: async (classId: string) => {
      if (!id) return;
      await api.delete(`/teachers/${id}/classes/${classId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teacher', id] });
      notifications.show({ title: t('common.success'), message: t('teachers.detail.removeClassSuccess'), color: 'green' });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('teachers.detail.removeClassFailed'),
        color: 'red',
      });
    },
  });

  const classLimitOptions = [20, 50, 100].map((v) => ({
    value: String(v),
    label: `${v}/${t('teachers.detail.perPage')}`,
  }));

  const LEVEL_LABELS = useMemo(
    () => ({
      beginner: t('classes.levels.beginner'),
      intermediate: t('classes.levels.intermediate'),
      advanced: t('classes.levels.advanced'),
    }),
    [t]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'yellow';
      case 'terminated': return 'red';
      default: return 'gray';
    }
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((x) => x !== classId) : [...prev, classId]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleClassRows.map((c) => c.id));
      setSelectedClassIds((prev) => prev.filter((x) => !visibleIds.has(x)));
    } else {
      const toAdd = visibleClassRows.map((c) => c.id);
      setSelectedClassIds((prev) => [...new Set([...prev, ...toAdd])]);
    }
  };

  if (isLoading) return <Stack gap="md"><Title>{t('common.loading')}</Title></Stack>;
  if (!teacher) return <Stack gap="md"><Title>{t('teachers.detail.notFound')}</Title></Stack>;

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/teachers">{t('teachers.list.title')}</Anchor>
        <Text>{teacher.fullName}</Text>
      </Breadcrumbs>

      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>{teacher.fullName}</Title>
          <Group gap="sm">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/teachers')}>
              {t('common.back')}
            </Button>
            <Button leftSection={<IconEdit size={16} />} onClick={() => navigate(`/teachers/${id}/edit`)}>
              {t('common.edit')}
            </Button>
          </Group>
        </Group>

        <Tabs defaultValue="overview" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="overview">{t('teachers.detail.tabs.overview')}</Tabs.Tab>
            <Tabs.Tab value="classes">{t('teachers.detail.tabs.classes')}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="md">
            <Paper shadow="sm" p="lg" radius="md">
              <Title order={4} mb="md">{t('teachers.detail.personalInfo')}</Title>
              <Grid>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">{t('teachers.detail.fullName')}</Text>
                  <Text fw={600}>{teacher.fullName}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">{t('teachers.detail.dob')}</Text>
                  <Text fw={600}>{formatDate(teacher.dateOfBirth)}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">{t('teachers.detail.gender')}</Text>
                  <Text fw={600}>{t(`students.form.${teacher.gender}` as any)}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">{t('teachers.detail.status')}</Text>
                  <Badge color={getStatusColor(teacher.status)}>
                    {t(`teachers.status.${teacher.status}` as any)}
                  </Badge>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">{t('teachers.detail.email')}</Text>
                  <Text fw={600}>{teacher.email}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">{t('teachers.detail.phone')}</Text>
                  <Text fw={600}>{teacher.phone}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">{t('teachers.form.password')}</Text>
                  {teacher.loginPassword ? (
                    <Group gap={4} wrap="nowrap">
                      <Text fw={600} ff="monospace">{teacher.loginPassword}</Text>
                      <CopyButton value={teacher.loginPassword}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? t('common.copied') : t('common.copy')}>
                            <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} size="sm" onClick={copy}>
                              <IconCopy size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  ) : (
                    <Text fw={600}>-</Text>
                  )}
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">{t('teachers.detail.qualification')}</Text>
                  <Text fw={600}>{teacher.qualification || '-'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">{t('teachers.detail.specialization')}</Text>
                  <Text fw={600}>{teacher.specialization || '-'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">{t('teachers.detail.hireDate')}</Text>
                  <Text fw={600}>{teacher.hireDate ? formatDate(teacher.hireDate) : '-'}</Text>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Text size="sm" c="dimmed">{t('teachers.form.address')}</Text>
                  <Text fw={600}>{teacher.address || '-'}</Text>
                </Grid.Col>
                {teacher.notes && (
                  <Grid.Col span={12}>
                    <Text size="sm" c="dimmed">{t('teachers.form.notes')}</Text>
                    <Text fw={500}>{teacher.notes}</Text>
                  </Grid.Col>
                )}
              </Grid>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="classes" pt="md">
            <Paper shadow="sm" p="lg" radius="md">
              <Group justify="space-between" mb="md">
                <div>
                  <Title order={4}>{t('teachers.detail.currentClasses')}</Title>
                  <Text size="sm" c="dimmed">{t('teachers.detail.classesHint')}</Text>
                </div>
                <Button leftSection={<IconPlus size={16} />} onClick={() => setAssignClassOpen(true)}>
                  {t('teachers.detail.assignClass')}
                </Button>
              </Group>

              {(teacher.classes?.length ?? 0) === 0 ? (
                <Text c="dimmed">{t('teachers.detail.noClasses')}</Text>
              ) : (
                <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                  <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
                    <Table.Thead style={{ background: 'var(--mantine-color-gray-0)' }}>
                      <Table.Tr>
                        <Table.Th>{t('classes.list.table.name')}</Table.Th>
                        <Table.Th>{t('classes.list.table.level')}</Table.Th>
                        <Table.Th>{t('classes.list.table.status')}</Table.Th>
                        <Table.Th w={60}></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {teacher.classes?.map((assignment) => (
                        <Table.Tr key={assignment.id}>
                          <Table.Td>
                            <Group gap="sm">
                              <ThemeIcon color="blue" variant="light" size="lg" radius="md">
                                <IconSchool size={16} />
                              </ThemeIcon>
                              <Anchor
                                component={Link}
                                to={`/classes/${assignment.class.id}`}
                                fw={600}
                                underline="hover"
                              >
                                {assignment.class.name}
                              </Anchor>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            {LEVEL_LABELS[assignment.class.academicLevel as keyof typeof LEVEL_LABELS] || assignment.class.academicLevel}
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" color={assignment.class.status === 'active' ? 'green' : 'gray'}>
                              {t(`classes.status.${assignment.class.status}` as any)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label={t('teachers.detail.removeClass')}>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => unassignClassMutation.mutate(assignment.class.id)}
                                loading={unassignClassMutation.isPending}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Paper>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Modal
        opened={assignClassOpen}
        onClose={() => setAssignClassOpen(false)}
        title={t('teachers.detail.assignClass')}
        centered
        size="70%"
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-end">
            <TextInput
              label={t('teachers.detail.selectClass')}
              placeholder={t('teachers.detail.searchClassPlaceholder')}
              value={classSearch}
              onChange={(e) => {
                setClassSearch(e.currentTarget.value);
                setClassPage(1);
              }}
              style={{ flex: 1 }}
            />
            <Select
              label={t('teachers.detail.perPage')}
              data={classLimitOptions}
              value={String(classLimit)}
              onChange={(v) => {
                setClassLimit(parseInt(v || '20', 10));
                setClassPage(1);
              }}
              w={160}
            />
          </Group>

          <ScrollArea h={420} offsetScrollbars>
            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
              <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
                <Table.Thead style={{ background: 'var(--mantine-color-gray-0)' }}>
                  <Table.Tr>
                    <Table.Th w={40}>
                      <Checkbox
                        checked={allVisibleSelected}
                        indeterminate={!allVisibleSelected && visibleClassRows.some((c) => selectedClassIds.includes(c.id))}
                        onChange={toggleSelectAllVisible}
                        aria-label={t('teachers.detail.selectAll')}
                      />
                    </Table.Th>
                    <Table.Th>{t('classes.list.table.name')}</Table.Th>
                    <Table.Th>{t('classes.list.table.level')}</Table.Th>
                    <Table.Th>{t('classes.list.table.capacity')}</Table.Th>
                    <Table.Th>{t('classes.list.table.classroom')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {isClassesLoading && (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Group justify="center" py="md">
                          <Loader size="sm" />
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )}
                  {!isClassesLoading && visibleClassRows.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text c="dimmed" ta="center" py="md">{t('teachers.detail.noClassesAvailable')}</Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                  {visibleClassRows.map((cls) => (
                    <Table.Tr
                      key={cls.id}
                      onClick={() => toggleClassSelection(cls.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedClassIds.includes(cls.id)}
                          onChange={() => toggleClassSelection(cls.id)}
                        />
                      </Table.Td>
                      <Table.Td fw={600}>{cls.name}</Table.Td>
                      <Table.Td>{LEVEL_LABELS[cls.academicLevel] || cls.academicLevel}</Table.Td>
                      <Table.Td>{cls.currentEnrollment}/{cls.capacity}</Table.Td>
                      <Table.Td>{cls.classroom || '-'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </ScrollArea>

          {classesList && classesList.meta.totalPages > 1 && (
            <Group justify="center">
              <Pagination total={classesList.meta.totalPages} value={classPage} onChange={setClassPage} />
            </Group>
          )}

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAssignClassOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => assignClassesMutation.mutate()}
              loading={assignClassesMutation.isPending}
              disabled={selectedClassIds.length === 0}
            >
              {t('common.apply')} ({selectedClassIds.length})
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
