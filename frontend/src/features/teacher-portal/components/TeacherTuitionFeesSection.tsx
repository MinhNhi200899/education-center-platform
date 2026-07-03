import {
  Paper,
  Stack,
  Title,
  Text,
  Group,
  Select,
  Table,
  Button,
  Loader,
  Badge,
  Alert,
} from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { IconCash, IconLock, IconPencil } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useLocaleFormatters } from '@/lib/format';
import { SetStudentTuitionModal, type TuitionStudentTarget } from './SetStudentTuitionModal';
import {
  defaultFeeSettingMonthDate,
  FEE_MONTH_MAX_DATE,
  FEE_MONTH_MIN_DATE,
  isPastMonth,
  toMonthKey,
} from './tuition-month-utils';

interface TeacherClassOption {
  classId: string;
  className: string;
}

interface ClassStudentRow {
  studentId: string;
  fullName: string;
  sessionsAttended: number;
  monthlyFeeAmount: number | null;
  monthlyFeeNote: string | null;
  calculatedTuition: number | null;
  invoiceStatus: string | null;
  feeEditable: boolean;
}

export function TeacherTuitionFeesSection() {
  const { t } = useTranslation();
  const { formatVnd } = useLocaleFormatters();
  const [monthDate, setMonthDate] = useState<Date>(defaultFeeSettingMonthDate);
  const [classId, setClassId] = useState<string | null>(null);
  const [tuitionTargets, setTuitionTargets] = useState<TuitionStudentTarget[] | null>(null);

  const month = toMonthKey(monthDate);
  const viewingPast = isPastMonth(month);

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['teacher-portal-classes'],
    queryFn: async () => {
      const res = await api.get('/teacher-portal/classes');
      return res.data.data as TeacherClassOption[];
    },
  });

  useEffect(() => {
    if (!classes?.length) {
      setClassId(null);
      return;
    }
    if (!classId || !classes.some((c) => c.classId === classId)) {
      setClassId(classes[0].classId);
    }
  }, [classes, classId]);

  const { data, isLoading: studentsLoading } = useQuery({
    queryKey: ['teacher-class-students', classId, month],
    queryFn: async () => {
      const res = await api.get(`/teacher-portal/classes/${classId}/students?month=${month}`);
      return res.data.data as {
        className: string;
        monthEditable: boolean;
        students: ClassStudentRow[];
        summary: { sessionCountInMonth: number; monthEditable: boolean };
      };
    },
    enabled: !!classId,
  });

  const classOptions = useMemo(
    () => (classes ?? []).map((c) => ({ value: c.classId, label: c.className })),
    [classes]
  );

  const students = data?.students ?? [];
  const monthEditable = data?.monthEditable ?? !viewingPast;
  const editableStudents = students.filter((s) => s.feeEditable);
  const allHaveFee =
    editableStudents.length > 0 &&
    editableStudents.every((s) => s.monthlyFeeAmount != null);
  const commonFee = allHaveFee ? editableStudents[0].monthlyFeeAmount : null;

  const openBulkSet = () => {
    if (!editableStudents.length) return;
    setTuitionTargets(
      editableStudents.map((s) => ({
        studentId: s.studentId,
        fullName: s.fullName,
        monthlyFeeAmount: s.monthlyFeeAmount,
        monthlyFeeNote: s.monthlyFeeNote,
      }))
    );
  };

  return (
    <>
      <Paper shadow="sm" p="lg" radius="md">
        <Stack gap="md">
          <div>
            <Title order={3}>{t('portal.teacher.payments.tuitionSectionTitle')}</Title>
            <Text size="sm" c="dimmed">
              {t('portal.teacher.payments.tuitionSectionSubtitle')}
            </Text>
          </div>

          <Group align="flex-end" wrap="wrap">
            <MonthPickerInput
              label={t('portal.teacher.payments.tuitionMonth')}
              value={monthDate}
              onChange={(value) => {
                if (value) setMonthDate(new Date(value.getFullYear(), value.getMonth(), 1));
              }}
              minDate={FEE_MONTH_MIN_DATE}
              maxDate={FEE_MONTH_MAX_DATE}
              w={200}
            />
            <Select
              label={t('portal.teacher.payments.tuitionClass')}
              placeholder={t('portal.teacher.payments.tuitionClassPlaceholder')}
              data={classOptions}
              value={classId}
              onChange={setClassId}
              disabled={!classOptions.length}
              searchable
              w={260}
            />
          </Group>

          {viewingPast && (
            <Alert icon={<IconLock size={16} />} color="gray" variant="light">
              {t('portal.teacher.payments.tuitionPastMonthLocked')}
            </Alert>
          )}

          {!viewingPast && monthEditable && editableStudents.length < students.length && (
            <Alert icon={<IconLock size={16} />} color="yellow" variant="light">
              {t('portal.teacher.payments.tuitionSomeStudentsLocked')}
            </Alert>
          )}

          {classesLoading ? (
            <Loader size="sm" />
          ) : !classes?.length ? (
            <Text c="dimmed" size="sm">
              {t('portal.teacher.schedule.noClasses')}
            </Text>
          ) : studentsLoading ? (
            <Loader size="sm" />
          ) : !students.length ? (
            <Text c="dimmed" size="sm">
              {t('portal.teacher.payments.tuitionNoStudents')}
            </Text>
          ) : (
            <>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  {t('portal.teacher.payments.tuitionSummary', {
                    count: students.length,
                    sessions: data?.summary.sessionCountInMonth ?? 0,
                  })}
                  {commonFee != null &&
                    ` · ${t('portal.teacher.classes.studentsModal.monthlyFeeHint', {
                      amount: formatVnd(commonFee),
                    })}`}
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconCash size={14} />}
                  onClick={openBulkSet}
                  disabled={!monthEditable || editableStudents.length === 0}
                >
                  {t('portal.teacher.payments.tuitionSetAll')}
                </Button>
              </Group>

              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('portal.teacher.payments.tuitionStudent')}</Table.Th>
                    <Table.Th ta="right">{t('portal.teacher.classes.studentsModal.monthlyFeeLabel')}</Table.Th>
                    <Table.Th ta="center">{t('portal.teacher.classes.studentsModal.sessions')}</Table.Th>
                    <Table.Th ta="right">{t('portal.teacher.classes.studentsModal.tuition')}</Table.Th>
                    <Table.Th w={48} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {students.map((student) => (
                    <Table.Tr key={student.studentId}>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {student.fullName}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        {student.monthlyFeeAmount != null ? (
                          <Text size="sm">{formatVnd(student.monthlyFeeAmount)}</Text>
                        ) : (
                          <Badge size="sm" color="orange" variant="light">
                            {t('portal.teacher.payments.tuitionNotSet')}
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td ta="center">
                        <Text size="sm">{student.sessionsAttended}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        {student.calculatedTuition != null ? (
                          <Stack gap={0} align="flex-end">
                            <Text size="sm" fw={600}>
                              {formatVnd(student.calculatedTuition)}
                            </Text>
                            {student.monthlyFeeAmount != null && student.sessionsAttended > 0 && (
                              <Text size="xs" c="dimmed">
                                {t('portal.teacher.classes.studentsModal.tuitionFormula', {
                                  monthly: formatVnd(student.monthlyFeeAmount),
                                  attended: student.sessionsAttended,
                                })}
                              </Text>
                            )}
                          </Stack>
                        ) : (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {student.feeEditable ? (
                          <Button
                            variant="subtle"
                            size="compact-xs"
                            aria-label={t('portal.teacher.classes.studentsModal.setTuitionTitle')}
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
                            <IconPencil size={14} />
                          </Button>
                        ) : (
                          <IconLock size={14} color="var(--mantine-color-gray-5)" />
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </>
          )}
        </Stack>
      </Paper>

      {classId && (
        <SetStudentTuitionModal
          classId={classId}
          month={month}
          students={tuitionTargets}
          opened={!!tuitionTargets?.length}
          onClose={() => setTuitionTargets(null)}
          onSuccess={() => {
            setTuitionTargets(null);
          }}
        />
      )}
    </>
  );
}
