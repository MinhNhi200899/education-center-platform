import { useMemo, useState } from 'react';
import {
  Stack,
  Title,
  Paper,
  Grid,
  Text,
  Group,
  Button,
  Breadcrumbs,
  Anchor,
  Progress,
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
} from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconEdit, IconUsers, IconUser, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '@/lib/format';
import api from '@/lib/api';
import type { Class, PaginatedResult, Student, Teacher } from '@/types';

export function ClassDetailPage() {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [assignTeacherOpen, setAssignTeacherOpen] = useState(false);
  const [enrollStudentsOpen, setEnrollStudentsOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherLimit, setTeacherLimit] = useState(20);

  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentLimit, setStudentLimit] = useState(20);

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: async () => {
      const response = await api.get(`/classes/${id}`);
      return response.data.data as Class;
    },
    enabled: !!id,
  });

  const { data: teachersList, isLoading: isTeachersLoading } = useQuery({
    queryKey: ['teachers', { page: teacherPage, limit: teacherLimit, search: teacherSearch }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: teacherPage.toString(),
        limit: teacherLimit.toString(),
        ...(teacherSearch ? { search: teacherSearch } : {}),
      });
      const res = await api.get(`/teachers?${params.toString()}`);
      return res.data as PaginatedResult<Teacher>;
    },
    enabled: assignTeacherOpen,
  });

  const { data: studentsList, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['students', { page: studentPage, limit: studentLimit, search: studentSearch, centerId: cls?.centerId }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: studentPage.toString(),
        limit: studentLimit.toString(),
        ...(studentSearch ? { search: studentSearch } : {}),
        ...(cls?.centerId ? { centerId: cls.centerId } : {}),
      });
      const res = await api.get(`/students?${params.toString()}`);
      return res.data as PaginatedResult<Student>;
    },
    enabled: enrollStudentsOpen && !!cls?.centerId,
  });

  const enrolledStudentIds = useMemo(
    () => new Set((cls?.students ?? []).map((s) => s.id)),
    [cls?.students]
  );

  const visibleStudentRows = useMemo(() => {
    const rows = studentsList?.data ?? [];
    return rows.filter((s) => !enrolledStudentIds.has(s.id));
  }, [studentsList?.data, enrolledStudentIds]);

  const allVisibleSelected = useMemo(() => {
    if (visibleStudentRows.length === 0) return false;
    return visibleStudentRows.every((s) => selectedStudentIds.includes(s.id));
  }, [visibleStudentRows, selectedStudentIds]);

  const assignTeacherMutation = useMutation({
    mutationFn: async () => {
      if (!cls?.id || !selectedTeacherId) return;
      await api.post(`/classes/${cls.id}/teachers`, { teacherId: selectedTeacherId, role: 'primary' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['class', id] });
      notifications.show({ title: t('common.success'), message: t('classes.detail.assignTeacherSuccess'), color: 'green' });
      setAssignTeacherOpen(false);
      setSelectedTeacherId(null);
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('classes.detail.assignTeacherFailed'),
        color: 'red',
      });
    },
  });

  const removeTeacherMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      if (!cls?.id) return;
      await api.delete(`/classes/${cls.id}/teachers/${teacherId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['class', id] });
      notifications.show({ title: t('common.success'), message: t('classes.detail.removeTeacherSuccess'), color: 'green' });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('classes.detail.removeTeacherFailed'),
        color: 'red',
      });
    },
  });

  const enrollStudentsMutation = useMutation({
    mutationFn: async () => {
      if (!cls?.id || selectedStudentIds.length === 0) return;
      await api.post(`/classes/${cls.id}/students`, { studentIds: selectedStudentIds });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['class', id] });
      notifications.show({ title: t('common.success'), message: t('classes.detail.enrollStudentsSuccess'), color: 'green' });
      setEnrollStudentsOpen(false);
      setSelectedStudentIds([]);
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('classes.detail.enrollStudentsFailed'),
        color: 'red',
      });
    },
  });

  const withdrawStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      if (!cls?.id) return;
      await api.delete(`/classes/${cls.id}/students/${studentId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['class', id] });
      notifications.show({ title: t('common.success'), message: t('classes.detail.withdrawStudentSuccess'), color: 'green' });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('classes.detail.withdrawStudentFailed'),
        color: 'red',
      });
    },
  });

  const teacherLimitOptions = [20, 50, 100, 200].map((v) => ({ value: String(v), label: `${v}/${t('classes.detail.perPage')}` }));
  const studentLimitOptions = [20, 50, 100, 200].map((v) => ({ value: String(v), label: `${v}/${t('classes.detail.perPage')}` }));

  const LEVEL_LABELS = useMemo(
    () => ({
      beginner: t('classes.levels.beginner'),
      intermediate: t('classes.levels.intermediate'),
      advanced: t('classes.levels.advanced'),
    }),
    [t]
  );

  if (isLoading) return <Stack gap="md"><Title>{t('common.loading')}</Title></Stack>;
  if (!cls) return <Stack gap="md"><Title>{t('classes.detail.notFound')}</Title></Stack>;

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/classes">{t('classes.list.title')}</Anchor>
        <Text>{cls.name}</Text>
      </Breadcrumbs>

      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="md" align="center">
              <Title order={2}>{cls.name}</Title>
            </Group>
            <Text c="dimmed" size="sm" mt={4}>
              {t('classes.detail.academicLevel')}: {LEVEL_LABELS[cls.academicLevel as keyof typeof LEVEL_LABELS] || cls.academicLevel}
              {' • '}
              {t('classes.detail.classroom')}: {cls.classroom || '-'}
              {' • '}
              {t('classes.detail.startDate')}: {formatDate(cls.startDate)}
            </Text>
          </div>
          <Group gap="sm">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/classes')}>
              {t('common.back')}
            </Button>
            <Button leftSection={<IconEdit size={16} />} onClick={() => navigate(`/classes/${id}/edit`)}>
              {t('common.edit')}
            </Button>
          </Group>
        </Group>

        <Tabs defaultValue="overview" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="overview">{t('classes.detail.tabs.overview')}</Tabs.Tab>
            <Tabs.Tab value="teachers">{t('classes.detail.tabs.teachers')}</Tabs.Tab>
            <Tabs.Tab value="students">{t('classes.detail.tabs.students')}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="md">
                <Paper shadow="sm" p="lg" radius="md">
                  <Title order={4} mb="md">{t('classes.detail.info')}</Title>
                  <Grid>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed">{t('classes.detail.academicLevel')}</Text>
                      <Text fw={600}>{LEVEL_LABELS[cls.academicLevel as keyof typeof LEVEL_LABELS] || cls.academicLevel}</Text>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed">{t('classes.detail.classroom')}</Text>
                      <Text fw={600}>{cls.classroom || '-'}</Text>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed">{t('classes.detail.startDate')}</Text>
                      <Text fw={600}>{formatDate(cls.startDate)}</Text>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed">{t('classes.detail.endDate')}</Text>
                      <Text fw={600}>{cls.endDate ? formatDate(cls.endDate) : '-'}</Text>
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <Text size="sm" c="dimmed">{t('classes.detail.description')}</Text>
                      <Text fw={500}>{cls.description || '-'}</Text>
                    </Grid.Col>
                  </Grid>
                </Paper>

                <Paper shadow="sm" p="lg" radius="md" mt="md">
                  <Title order={4} mb="md">{t('classes.detail.enrollment')}</Title>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text size="sm">{t('classes.detail.current')}</Text>
                      <Text fw={700}>{cls.currentEnrollment}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">{t('classes.detail.capacity')}</Text>
                      <Text fw={700}>{cls.capacity}</Text>
                    </Group>
                    <Progress value={(cls.currentEnrollment / cls.capacity) * 100} size="lg" mt="sm" />
                    <Text size="xs" c="dimmed" ta="center">
                      {t('classes.detail.slotsAvailable', { count: cls.capacity - cls.currentEnrollment })}
                    </Text>
                  </Stack>
                </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="teachers" pt="md">
            <Paper shadow="sm" p="lg" radius="md">
              <Group justify="space-between" mb="md">
                <div>
                  <Title order={4}>{t('classes.detail.teachers')}</Title>
                  <Text size="sm" c="dimmed">{t('classes.detail.teachersHint')}</Text>
                </div>
                <Button leftSection={<IconPlus size={16} />} onClick={() => setAssignTeacherOpen(true)}>
                  {t('classes.detail.assignTeacher')}
                </Button>
              </Group>

              {(cls.teachers?.length ?? 0) === 0 ? (
                <Text c="dimmed">{t('classes.detail.noTeachers')}</Text>
              ) : (
                <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                  <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
                    <Table.Thead style={{ background: 'var(--mantine-color-gray-0)' }}>
                      <Table.Tr>
                        <Table.Th>{t('common.name')}</Table.Th>
                        <Table.Th w={60}></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {cls.teachers?.map((tch) => (
                        <Table.Tr key={tch.id}>
                          <Table.Td>
                            <Group gap="sm">
                              <ThemeIcon color="blue" variant="light" size="lg" radius="md"><IconUser size={16} /></ThemeIcon>
                              <Text fw={600}>{tch.fullName}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label={t('classes.detail.removeTeacher')}>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => removeTeacherMutation.mutate(tch.id)}
                                loading={removeTeacherMutation.isPending}
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

          <Tabs.Panel value="students" pt="md">
            <Paper shadow="sm" p="lg" radius="md">
              <Group justify="space-between" mb="md">
                <div>
                  <Title order={4}>{t('classes.detail.students')}</Title>
                  <Text size="sm" c="dimmed">{t('classes.detail.studentsHint')}</Text>
                </div>
                <Button leftSection={<IconPlus size={16} />} onClick={() => setEnrollStudentsOpen(true)}>
                  {t('classes.detail.enrollStudents')}
                </Button>
              </Group>

              {(cls.students?.length ?? 0) === 0 ? (
                <Text c="dimmed">{t('classes.detail.noStudents')}</Text>
              ) : (
                <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                  <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
                    <Table.Thead style={{ background: 'var(--mantine-color-gray-0)' }}>
                      <Table.Tr>
                        <Table.Th>{t('common.name')}</Table.Th>
                        <Table.Th w={60}></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {cls.students?.map((st) => (
                        <Table.Tr key={st.id}>
                          <Table.Td>
                            <Group gap="sm">
                              <ThemeIcon color="green" variant="light" size="md" radius="md"><IconUsers size={14} /></ThemeIcon>
                              <Text fw={600}>{st.fullName}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label={t('classes.detail.withdrawStudent')}>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => withdrawStudentMutation.mutate(st.id)}
                                loading={withdrawStudentMutation.isPending}
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
        opened={assignTeacherOpen}
        onClose={() => setAssignTeacherOpen(false)}
        title={t('classes.detail.assignTeacher')}
        centered
        size="70%"
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-end">
            <TextInput
              label={t('classes.detail.selectTeacher')}
              placeholder={t('classes.detail.searchTeacherPlaceholder')}
              value={teacherSearch}
              onChange={(e) => {
                setTeacherSearch(e.currentTarget.value);
                setTeacherPage(1);
              }}
              style={{ flex: 1 }}
            />
            <Select
              label={t('classes.detail.perPage')}
              data={teacherLimitOptions}
              value={String(teacherLimit)}
              onChange={(v) => {
                const next = parseInt(v || '20', 10);
                setTeacherLimit(next);
                setTeacherPage(1);
              }}
              w={160}
            />
          </Group>

          <ScrollArea h={420} offsetScrollbars>
            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
              <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
                <Table.Thead style={{ background: 'var(--mantine-color-gray-0)' }}>
                  <Table.Tr>
                    <Table.Th>{t('common.name')}</Table.Th>
                    <Table.Th>{t('common.email')}</Table.Th>
                    <Table.Th>{t('common.phone')}</Table.Th>
                    <Table.Th>{t('common.address')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {isTeachersLoading && (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Group justify="center" py="md">
                          <Loader size="sm" />
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )}
                  {(teachersList?.data ?? []).map((tch) => (
                    <Table.Tr
                      key={tch.id}
                      onClick={() => setSelectedTeacherId(tch.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Table.Td fw={selectedTeacherId === tch.id ? 700 : 400}>{tch.fullName}</Table.Td>
                      <Table.Td>{tch.email}</Table.Td>
                      <Table.Td>{tch.phone}</Table.Td>
                      <Table.Td>{tch.address || '-'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </ScrollArea>

          {teachersList && teachersList.meta.totalPages > 1 && (
            <Group justify="center">
              <Pagination total={teachersList.meta.totalPages} value={teacherPage} onChange={setTeacherPage} />
            </Group>
          )}

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAssignTeacherOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => assignTeacherMutation.mutate()}
              loading={assignTeacherMutation.isPending}
              disabled={!selectedTeacherId}
            >
              {t('common.apply')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={enrollStudentsOpen}
        onClose={() => setEnrollStudentsOpen(false)}
        title={t('classes.detail.enrollStudents')}
        centered
        size="70%"
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-end">
            <TextInput
              label={t('classes.detail.selectStudents')}
              placeholder={t('classes.detail.searchStudentPlaceholder')}
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.currentTarget.value);
                setStudentPage(1);
              }}
              style={{ flex: 1 }}
            />
            <Select
              label={t('classes.detail.perPage')}
              data={studentLimitOptions}
              value={String(studentLimit)}
              onChange={(v) => {
                const next = parseInt(v || '20', 10);
                setStudentLimit(next);
                setStudentPage(1);
              }}
              w={160}
            />
          </Group>

          <ScrollArea h={420} offsetScrollbars>
            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
              <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
                <Table.Thead style={{ background: 'var(--mantine-color-gray-0)' }}>
                  <Table.Tr>
                    <Table.Th w={52}>
                      <Tooltip label={t('classes.detail.selectAll')}>
                        <Checkbox
                          checked={allVisibleSelected}
                          indeterminate={
                            selectedStudentIds.length > 0 &&
                            selectedStudentIds.some((id) => visibleStudentRows.some((s) => s.id === id)) &&
                            !allVisibleSelected
                          }
                          onChange={(e) => {
                            const checked = e.currentTarget.checked;
                            if (checked) {
                              setSelectedStudentIds((prev) => {
                                const next = new Set(prev);
                                for (const s of visibleStudentRows) next.add(s.id);
                                return Array.from(next);
                              });
                            } else {
                              setSelectedStudentIds((prev) =>
                                prev.filter((id) => !visibleStudentRows.some((s) => s.id === id))
                              );
                            }
                          }}
                        />
                      </Tooltip>
                    </Table.Th>
                    <Table.Th>{t('common.name')}</Table.Th>
                    <Table.Th>{t('common.email')}</Table.Th>
                    <Table.Th>{t('common.phone')}</Table.Th>
                    <Table.Th>{t('common.address')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {isStudentsLoading && (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Group justify="center" py="md">
                          <Loader size="sm" />
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )}
                  {visibleStudentRows.map((s) => {
                    const checked = selectedStudentIds.includes(s.id);
                    return (
                      <Table.Tr
                        key={s.id}
                        onClick={() => {
                          setSelectedStudentIds((prev) => (checked ? prev.filter((x) => x !== s.id) : [...prev, s.id]));
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <Table.Td>
                          <Checkbox checked={checked} readOnly />
                        </Table.Td>
                        <Table.Td fw={checked ? 700 : 400}>{s.fullName}</Table.Td>
                        <Table.Td>{s.email || '-'}</Table.Td>
                        <Table.Td>{s.phone || '-'}</Table.Td>
                        <Table.Td>{s.address || '-'}</Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Paper>
          </ScrollArea>

          {studentsList && studentsList.meta.totalPages > 1 && (
            <Group justify="center">
              <Pagination total={studentsList.meta.totalPages} value={studentPage} onChange={setStudentPage} />
            </Group>
          )}

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setEnrollStudentsOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => enrollStudentsMutation.mutate()}
              loading={enrollStudentsMutation.isPending}
              disabled={selectedStudentIds.length === 0}
            >
              {t('common.apply')} ({selectedStudentIds.length})
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
