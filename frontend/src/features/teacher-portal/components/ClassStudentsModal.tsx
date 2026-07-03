import {
  Modal,
  Stack,
  Group,
  Text,
  Table,
  Avatar,
  Badge,
  ScrollArea,
  Paper,
  Button,
  Checkbox,
  Anchor,
  Menu,
  ActionIcon,
} from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconDots, IconCash, IconReceipt, IconSend, IconCheck, IconQrcode } from '@tabler/icons-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useLocaleFormatters } from '@/lib/format';
import { SetStudentTuitionModal, type TuitionStudentTarget } from './SetStudentTuitionModal';
import { StudentAttendedSessionsModal } from './StudentAttendedSessionsModal';
import { ExportReceiptModal } from './ExportReceiptModal';

export interface TeacherClassSummary {
  classId: string;
  className: string;
  classroom?: string;
}

interface ClassStudentRow {
  studentId: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  sessionsAttended: number;
  monthlyFeeAmount: number | null;
  monthlyFeeNote: string | null;
  calculatedTuition: number | null;
  tuitionAmount: number | null;
  invoiceStatus: string | null;
  invoiceNumber: string | null;
  invoiceId: string | null;
  feeEditable: boolean;
}

interface Props {
  classInfo: TeacherClassSummary | null;
  opened: boolean;
  onClose: () => void;
}

function getCurrentMonthDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function toMonthKey(date: Date): string {
  return dayjs(date).format('YYYY-MM');
}

const INVOICE_STATUS_COLOR: Record<string, string> = {
  paid: 'green',
  issued: 'blue',
  overdue: 'red',
  draft: 'gray',
  cancelled: 'gray',
};

export function ClassStudentsModal({ classInfo, opened, onClose }: Props) {
  const { t } = useTranslation();
  const { formatVnd } = useLocaleFormatters();
  const [monthDate, setMonthDate] = useState<Date>(getCurrentMonthDate);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tuitionTargets, setTuitionTargets] = useState<TuitionStudentTarget[] | null>(null);
  const [sessionsStudent, setSessionsStudent] = useState<{
    studentId: string;
    fullName: string;
  } | null>(null);
  const [receiptStudent, setReceiptStudent] = useState<{
    studentId: string;
    fullName: string;
  } | null>(null);
  const [sendingStudentId, setSendingStudentId] = useState<string | null>(null);
  const [confirmingStudentId, setConfirmingStudentId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const month = toMonthKey(monthDate);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['teacher-class-students', classInfo?.classId, month],
    queryFn: async () => {
      const res = await api.get(
        `/teacher-portal/classes/${classInfo!.classId}/students?month=${month}`
      );
      return res.data.data as {
        classId: string;
        className: string;
        month: string;
        sessionCountInMonth: number;
        students: ClassStudentRow[];
        summary: {
          studentCount: number;
          sessionCountInMonth: number;
          totalTuition: number;
          totalExpected: number;
          totalCollected: number;
          paidCount: number;
          unpaidCount: number;
          pendingCount: number;
          invoicedCount: number;
        };
      };
    },
    enabled: opened && !!classInfo?.classId,
  });

  const sendReceiptMutation = useMutation({
    mutationFn: async (student: { studentId: string; fullName: string }) => {
      const res = await api.post(
        `/teacher-portal/classes/${classInfo!.classId}/students/${student.studentId}/send-receipt`,
        { month }
      );
      return { ...res.data.data, fullName: student.fullName };
    },
    onSuccess: (data) => {
      notifications.show({
        title: t('portal.teacher.classes.studentsModal.sendToStudentSuccess', {
          name: data.fullName,
        }),
        message: data.share?.note ?? data.share?.messageTemplate,
        color: 'green',
      });
      refetch();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message:
          error.response?.data?.error?.message ??
          t('portal.teacher.classes.studentsModal.sendToStudentFailed'),
        color: 'red',
      });
    },
    onSettled: () => setSendingStudentId(null),
  });

  const bulkSendMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(
        `/teacher-portal/classes/${classInfo!.classId}/send-receipts/bulk`,
        { month }
      );
      return res.data.data as {
        sent: { studentId: string; fullName: string }[];
        skipped: { studentId: string; fullName: string; reason: string }[];
        failed: { studentId: string; fullName: string; error: string }[];
        summary: { sentCount: number; skippedCount: number; failedCount: number };
      };
    },
    onSuccess: (result) => {
      notifications.show({
        title: t('portal.teacher.classes.studentsModal.bulkSendSuccess', {
          count: result.summary.sentCount,
        }),
        message:
          result.summary.failedCount > 0
            ? t('portal.teacher.classes.studentsModal.bulkSendPartial', {
                failed: result.summary.failedCount,
              })
            : undefined,
        color: result.summary.failedCount > 0 ? 'orange' : 'green',
      });
      refetch();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message:
          error.response?.data?.error?.message ??
          t('portal.teacher.classes.studentsModal.bulkSendFailed'),
        color: 'red',
      });
    },
  });

  const confirmPaidMutation = useMutation({
    mutationFn: async (student: { studentId: string; fullName: string }) => {
      const res = await api.post(
        `/teacher-portal/classes/${classInfo!.classId}/students/${student.studentId}/confirm-paid`,
        { month }
      );
      return { ...res.data.data, fullName: student.fullName };
    },
    onSuccess: (data) => {
      notifications.show({
        title: t('portal.teacher.classes.studentsModal.confirmPaidSuccess', {
          name: data.fullName,
        }),
        message: '',
        color: 'green',
      });
      refetch();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message:
          error.response?.data?.error?.message ??
          t('portal.teacher.classes.studentsModal.confirmPaidFailed'),
        color: 'red',
      });
    },
    onSettled: () => setConfirmingStudentId(null),
  });

  const studentIds = useMemo(
    () => data?.students.map((s) => s.studentId) ?? [],
    [data?.students]
  );

  const allSelected =
    studentIds.length > 0 && studentIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [month, classInfo?.classId, opened]);

  const handleMonthChange = (value: Date | null) => {
    if (value) setMonthDate(new Date(value.getFullYear(), value.getMonth(), 1));
  };

  const toggleStudent = (studentId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(studentIds) : new Set());
  };

  const openBulkTuition = () => {
    if (!data) return;
    const targets = data.students
      .filter((s) => selectedIds.has(s.studentId) && s.feeEditable)
      .map((s) => ({
        studentId: s.studentId,
        fullName: s.fullName,
        monthlyFeeAmount: s.monthlyFeeAmount,
        monthlyFeeNote: s.monthlyFeeNote,
      }));
    if (!targets.length) {
      notifications.show({
        title: t('common.error'),
        message: t('portal.teacher.payments.tuitionEditNotAllowed'),
        color: 'orange',
      });
      return;
    }
    setTuitionTargets(targets);
  };

  const displayTuition = (student: ClassStudentRow) => {
    if (student.calculatedTuition != null) return formatVnd(student.calculatedTuition);
    if (student.tuitionAmount != null) return formatVnd(student.tuitionAmount);
    return '—';
  };

  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    if (paymentFilter === 'paid') {
      return data.students.filter((s) => s.invoiceStatus === 'paid');
    }
    if (paymentFilter === 'unpaid') {
      return data.students.filter(
        (s) =>
          s.invoiceStatus === 'issued' ||
          s.invoiceStatus === 'overdue' ||
          (!s.invoiceStatus && s.monthlyFeeAmount != null && s.sessionsAttended > 0)
      );
    }
    return data.students;
  }, [data?.students, paymentFilter]);

  const canBulkSend = useMemo(() => {
    return (
      data?.students.some(
        (s) =>
          s.invoiceStatus !== 'paid' &&
          s.monthlyFeeAmount != null &&
          s.sessionsAttended > 0
      ) ?? false
    );
  }, [data?.students]);

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={classInfo?.className ?? t('portal.teacher.classes.studentsModal.title')}
        centered
        size="85%"
        styles={{
          content: { height: '85vh', display: 'flex', flexDirection: 'column' },
          body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
        }}
      >
        <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
          <Group justify="space-between" align="flex-end" wrap="wrap">
            <div>
              {classInfo?.classroom && (
                <Text size="sm" c="dimmed">
                  {t('portal.teacher.schedule.room', { room: classInfo.classroom })}
                </Text>
              )}
              {data && (
                <>
                  <Text size="sm" c="dimmed" mt={4}>
                    {t('portal.teacher.classes.studentsModal.summary', {
                      count: data.summary.studentCount,
                      total: formatVnd(data.summary.totalTuition),
                      sessions: data.summary.sessionCountInMonth,
                    })}
                  </Text>
                  <Group gap="xs" mt={6}>
                    <Badge color="green" variant="light" size="sm">
                      {t('portal.teacher.classes.studentsModal.collectionPaid', {
                        paid: data.summary.paidCount,
                        total: data.summary.studentCount,
                      })}
                    </Badge>
                    <Badge color="orange" variant="light" size="sm">
                      {t('portal.teacher.classes.studentsModal.collectionRemaining', {
                        amount: formatVnd(
                          Math.max(0, data.summary.totalExpected - data.summary.totalCollected)
                        ),
                      })}
                    </Badge>
                  </Group>
                </>
              )}
            </div>
            <Group align="flex-end">
              <Button
                variant="light"
                size="sm"
                leftSection={<IconQrcode size={16} />}
                disabled={!canBulkSend || bulkSendMutation.isPending}
                loading={bulkSendMutation.isPending}
                onClick={() => bulkSendMutation.mutate()}
              >
                {t('portal.teacher.classes.studentsModal.bulkSendQr')}
              </Button>
              <Button.Group>
                <Button
                  variant={paymentFilter === 'all' ? 'filled' : 'default'}
                  size="sm"
                  onClick={() => setPaymentFilter('all')}
                >
                  {t('portal.teacher.classes.studentsModal.filterAll')}
                </Button>
                <Button
                  variant={paymentFilter === 'unpaid' ? 'filled' : 'default'}
                  size="sm"
                  onClick={() => setPaymentFilter('unpaid')}
                >
                  {t('portal.teacher.classes.studentsModal.filterUnpaid')}
                </Button>
                <Button
                  variant={paymentFilter === 'paid' ? 'filled' : 'default'}
                  size="sm"
                  onClick={() => setPaymentFilter('paid')}
                >
                  {t('portal.teacher.classes.studentsModal.filterPaid')}
                </Button>
              </Button.Group>
              <Button
                variant="filled"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={openBulkTuition}
              >
                {t('portal.teacher.classes.studentsModal.setTuitionSelected', {
                  count: selectedIds.size,
                })}
              </Button>
              <MonthPickerInput
                label={t('portal.teacher.classes.studentsModal.filterMonth')}
                placeholder={t('portal.teacher.classes.studentsModal.filterMonth')}
                value={monthDate}
                onChange={handleMonthChange}
                maxLevel="year"
                w={220}
              />
            </Group>
          </Group>

          {isLoading ? (
            <Text c="dimmed">{t('portal.teacher.classes.studentsModal.loading')}</Text>
          ) : (data?.students.length ?? 0) === 0 ? (
            <Paper withBorder p="xl" radius="md">
              <Text ta="center" c="dimmed">
                {t('portal.teacher.classes.studentsModal.empty')}
              </Text>
            </Paper>
          ) : filteredStudents.length === 0 ? (
            <Paper withBorder p="xl" radius="md">
              <Text ta="center" c="dimmed">
                {t('portal.teacher.classes.studentsModal.emptyFilter')}
              </Text>
            </Paper>
          ) : (
            <ScrollArea style={{ flex: 1 }} type="auto">
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}>
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={(e) => toggleAll(e.currentTarget.checked)}
                        aria-label={t('portal.teacher.classes.studentsModal.selectAll')}
                      />
                    </Table.Th>
                    <Table.Th>{t('portal.teacher.classes.studentsModal.student')}</Table.Th>
                    <Table.Th>{t('portal.teacher.classes.studentsModal.phone')}</Table.Th>
                    <Table.Th ta="center">
                      {t('portal.teacher.classes.studentsModal.sessions')}
                    </Table.Th>
                    <Table.Th ta="right">{t('portal.teacher.classes.studentsModal.tuition')}</Table.Th>
                    <Table.Th>{t('portal.teacher.classes.studentsModal.status')}</Table.Th>
                    <Table.Th w={56} ta="center">{t('portal.teacher.classes.studentsModal.actions')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredStudents.map((student) => (
                    <Table.Tr key={student.studentId}>
                      <Table.Td>
                        <Checkbox
                          checked={selectedIds.has(student.studentId)}
                          onChange={(e) =>
                            toggleStudent(student.studentId, e.currentTarget.checked)
                          }
                          aria-label={student.fullName}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Avatar src={student.avatarUrl ?? undefined} radius="xl" size="sm">
                            {student.fullName.charAt(0)}
                          </Avatar>
                          <Anchor
                            component="button"
                            type="button"
                            fw={500}
                            underline="hover"
                            onClick={() =>
                              setSessionsStudent({
                                studentId: student.studentId,
                                fullName: student.fullName,
                              })
                            }
                          >
                            {student.fullName}
                          </Anchor>
                        </Group>
                      </Table.Td>
                      <Table.Td>{student.phone || '—'}</Table.Td>
                      <Table.Td ta="center">
                        <Anchor
                          component="button"
                          type="button"
                          size="sm"
                          underline="hover"
                          onClick={() =>
                            setSessionsStudent({
                              studentId: student.studentId,
                              fullName: student.fullName,
                            })
                          }
                        >
                          {t('portal.teacher.classes.studentsModal.sessionsCount', {
                            attended: student.sessionsAttended,
                            total: data!.sessionCountInMonth,
                          })}
                        </Anchor>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Stack gap={2} align="flex-end">
                          <Text fw={600}>{displayTuition(student)}</Text>
                          {student.monthlyFeeAmount != null && student.calculatedTuition != null && (
                              <Text size="xs" c="dimmed">
                                {t('portal.teacher.classes.studentsModal.tuitionFormula', {
                                  monthly: formatVnd(student.monthlyFeeAmount),
                                  attended: student.sessionsAttended,
                                })}
                              </Text>
                            )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        {student.invoiceStatus ? (
                          <Badge
                            color={INVOICE_STATUS_COLOR[student.invoiceStatus] ?? 'gray'}
                            variant="light"
                            size="sm"
                          >
                            {t(`payments.status.${student.invoiceStatus}`, {
                              defaultValue: student.invoiceStatus,
                            })}
                          </Badge>
                        ) : (
                          <Text size="sm" c="dimmed">
                            {t('portal.teacher.classes.studentsModal.noInvoice')}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td ta="center">
                        <Menu shadow="md" position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" aria-label={t('portal.teacher.classes.studentsModal.actions')}>
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconCash size={14} />}
                              disabled={!student.feeEditable}
                              onClick={() =>
                                setTuitionTargets([
                                  {
                                    studentId: student.studentId,
                                    fullName: student.fullName,
                                    monthlyFeeAmount: student.monthlyFeeAmount,
                                    monthlyFeeNote: student.monthlyFeeNote,
                                  },
                                ])
                              }
                            >
                              {t('portal.teacher.classes.studentsModal.setTuition')}
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconReceipt size={14} />}
                              disabled={
                                student.monthlyFeeAmount == null ||
                                student.sessionsAttended === 0
                              }
                              onClick={() =>
                                setReceiptStudent({
                                  studentId: student.studentId,
                                  fullName: student.fullName,
                                })
                              }
                            >
                              {t('portal.teacher.classes.studentsModal.exportReceipt')}
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconSend size={14} />}
                              disabled={
                                student.monthlyFeeAmount == null ||
                                student.sessionsAttended === 0 ||
                                student.invoiceStatus === 'paid' ||
                                (sendReceiptMutation.isPending &&
                                  sendingStudentId === student.studentId)
                              }
                              onClick={() => {
                                setSendingStudentId(student.studentId);
                                sendReceiptMutation.mutate({
                                  studentId: student.studentId,
                                  fullName: student.fullName,
                                });
                              }}
                            >
                              {t('portal.teacher.classes.studentsModal.sendToStudent')}
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconCheck size={14} />}
                              disabled={
                                student.invoiceStatus === 'paid' ||
                                student.monthlyFeeAmount == null ||
                                student.sessionsAttended === 0 ||
                                (confirmPaidMutation.isPending &&
                                  confirmingStudentId === student.studentId)
                              }
                              onClick={() => {
                                setConfirmingStudentId(student.studentId);
                                confirmPaidMutation.mutate({
                                  studentId: student.studentId,
                                  fullName: student.fullName,
                                });
                              }}
                            >
                              {t('portal.teacher.classes.studentsModal.confirmPaid')}
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      </Modal>

      <SetStudentTuitionModal
        classId={classInfo?.classId ?? ''}
        month={month}
        students={tuitionTargets}
        opened={!!tuitionTargets?.length}
        onClose={() => setTuitionTargets(null)}
        onSuccess={() => setSelectedIds(new Set())}
      />

      <StudentAttendedSessionsModal
        classId={classInfo?.classId ?? ''}
        month={month}
        student={sessionsStudent}
        opened={!!sessionsStudent}
        onClose={() => setSessionsStudent(null)}
      />

      <ExportReceiptModal
        classId={classInfo?.classId ?? ''}
        month={month}
        student={receiptStudent}
        opened={!!receiptStudent}
        onClose={() => setReceiptStudent(null)}
        onSuccess={() => refetch()}
      />
    </>
  );
}
