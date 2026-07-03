import {

  Modal,

  Stack,

  Text,

  Button,

  Group,

  Paper,

  Badge,

  Loader,

  ActionIcon,

  SimpleGrid,

  Textarea,

  TextInput,

  Collapse,

  FileInput,

  Image,

  Alert,

  List,

} from '@mantine/core';

import {

  IconCheck,

  IconX,

  IconClock,

  IconCamera,

  IconAlertCircle,

  IconClipboard,

  IconLock,

} from '@tabler/icons-react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifications } from '@mantine/notifications';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslation } from 'react-i18next';

import api from '@/lib/api';

import type { AttendanceStatus } from '@/types';

import type { TeacherScheduleSession } from './schedule-utils';



interface StudentRow {

  studentId: string;

  studentName: string;

  status: AttendanceStatus | null;

  reason: string | null;

}



interface Props {

  session: TeacherScheduleSession | null;

  opened: boolean;

  onClose: () => void;

  onSuccess?: () => void;

}



const SCREENSHOT_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif';



function imageFromClipboardEvent(event: ClipboardEvent): File | null {

  const items = event.clipboardData?.items;

  if (!items) return null;



  for (const item of items) {

    if (!item.type.startsWith('image/')) continue;

    const blob = item.getAsFile();

    if (!blob) continue;

    const ext = item.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';

    return new File([blob], `screenshot-${Date.now()}.${ext}`, { type: item.type });

  }

  return null;

}



export function MarkAttendanceModal({ session, opened, onClose, onSuccess }: Props) {

  const { t } = useTranslation();

  const queryClient = useQueryClient();

  const pasteZoneRef = useRef<HTMLDivElement>(null);

  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});

  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});

  const [sessionNote, setSessionNote] = useState('');

  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const [existingScreenshotUrl, setExistingScreenshotUrl] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);



  const { data, isLoading } = useQuery({

    queryKey: ['attendance-session', session?.id],

    queryFn: async () => {

      const res = await api.get(`/attendance/session/${session!.id}`);

      return res.data.data as {

        sessionNote: string | null;

        attendanceScreenshotUrl: string | null;

        attendanceLocked: boolean;

        students: StudentRow[];

      };

    },

    enabled: opened && !!session?.id,

  });



  const students = data?.students;

  const attendanceLocked = data?.attendanceLocked ?? false;



  useEffect(() => {

    if (!students) return;

    const initial: Record<string, AttendanceStatus> = {};

    const notes: Record<string, string> = {};

    students.forEach((s) => {

      if (s.status) initial[s.studentId] = s.status;

      if (s.reason) notes[s.studentId] = s.reason;

    });

    setRecords(initial);

    setStudentNotes(notes);

  }, [students]);



  useEffect(() => {

    setSessionNote(data?.sessionNote ?? '');

    setExistingScreenshotUrl(data?.attendanceScreenshotUrl ?? null);

  }, [data?.sessionNote, data?.attendanceScreenshotUrl]);



  useEffect(() => {

    if (!opened) {

      setScreenshotFile(null);

      setPreviewUrl(null);

      setConfirmOpen(false);

      return;

    }

    if (screenshotFile) {

      const objectUrl = URL.createObjectURL(screenshotFile);

      setPreviewUrl(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);

    }

    setPreviewUrl(existingScreenshotUrl);

    return undefined;

  }, [opened, screenshotFile, existingScreenshotUrl]);



  const hasScreenshot = Boolean(screenshotFile || existingScreenshotUrl);



  const statusSummary = useMemo(() => {

    if (!students?.length) return { present: 0, late: 0, absent: 0, excused: 0 };

    const counts = { present: 0, late: 0, absent: 0, excused: 0 };

    students.forEach((s) => {

      const status = records[s.studentId] ?? 'present';

      if (status in counts) counts[status as keyof typeof counts] += 1;

    });

    return counts;

  }, [students, records]);



  const applyScreenshotFile = useCallback((file: File) => {

    setScreenshotFile(file);

    setExistingScreenshotUrl(null);

  }, []);



  const handlePaste = useCallback(

    (event: ClipboardEvent) => {

      if (attendanceLocked) return;

      const file = imageFromClipboardEvent(event);

      if (!file) return;

      event.preventDefault();

      applyScreenshotFile(file);

      notifications.show({

        title: t('common.success'),

        message: t('portal.teacher.schedule.attendance.screenshotPasted'),

        color: 'green',

      });

    },

    [applyScreenshotFile, attendanceLocked, t]

  );



  useEffect(() => {

    if (!opened || attendanceLocked) return;

    document.addEventListener('paste', handlePaste);

    return () => document.removeEventListener('paste', handlePaste);

  }, [opened, attendanceLocked, handlePaste]);



  useEffect(() => {

    if (opened && !attendanceLocked) {

      pasteZoneRef.current?.focus();

    }

  }, [opened, attendanceLocked]);



  const saveMutation = useMutation({

    mutationFn: async () => {

      if (!session || !students?.length || attendanceLocked) {
        throw new Error(t('portal.teacher.schedule.attendance.alreadyLocked'));
      }

      let attendanceScreenshotUrl = '';

      if (screenshotFile) {

        const formData = new FormData();

        formData.append('file', screenshotFile);

        const uploadRes = await api.post('/uploads/attendance-screenshot', formData);

        attendanceScreenshotUrl = (uploadRes.data.data as { url: string }).url;

      }



      if (!attendanceScreenshotUrl) {

        throw new Error(t('portal.teacher.schedule.attendance.screenshotRequired'));

      }



      const payload = {

        sessionId: session.id,

        sessionNote: sessionNote.trim() || undefined,

        attendanceScreenshotUrl,

        records: students.map((s) => ({

          studentId: s.studentId,

          status: records[s.studentId] ?? ('present' as AttendanceStatus),

          reason: studentNotes[s.studentId]?.trim() || undefined,

        })),

      };

      await api.post('/attendance/session', payload);

    },

    onSuccess: () => {

      notifications.show({

        title: t('common.success'),

        message: t('portal.teacher.schedule.attendance.success'),

        color: 'green',

      });

      queryClient.invalidateQueries({ queryKey: ['attendance-session', session?.id] });
      queryClient.invalidateQueries({ queryKey: ['teacher-portal-schedule'] });

      setConfirmOpen(false);

      onSuccess?.();

      onClose();

    },

    onError: (err: { response?: { data?: { error?: { message?: string } } }; message?: string }) => {

      notifications.show({

        title: t('common.error'),

        message:

          err.response?.data?.error?.message ??

          err.message ??

          t('portal.teacher.schedule.attendance.failed'),

        color: 'red',

      });

      setConfirmOpen(false);

    },

  });



  if (!session) return null;



  const setStatus = (studentId: string, status: AttendanceStatus) => {

    if (attendanceLocked) return;

    setRecords((prev) => ({ ...prev, [studentId]: status }));

  };



  const handleRequestSave = () => {

    if (!hasScreenshot) {

      notifications.show({

        title: t('common.error'),

        message: t('portal.teacher.schedule.attendance.screenshotRequired'),

        color: 'red',

      });

      return;

    }

    setConfirmOpen(true);

  };



  return (

    <>

      <Modal

        opened={opened}

        onClose={onClose}

        title={t('portal.teacher.schedule.attendance.title')}

        size="lg"

        centered

      >

        <Stack gap="md">

          <div>

            <Text fw={600}>{session.className}</Text>

            <Text size="sm" c="dimmed">

              {session.sessionDate} · {session.startTime}–{session.endTime}

            </Text>

            <Text size="xs" c="dimmed" mt={4}>

              {t('portal.teacher.schedule.attendance.hint')}

            </Text>

          </div>



          {attendanceLocked && (

            <Alert icon={<IconLock size={16} />} color="gray" variant="light">

              {t('portal.teacher.schedule.attendance.alreadyLocked')}

            </Alert>

          )}



          <Textarea

            label={t('portal.teacher.schedule.attendance.sessionNoteLabel')}

            placeholder={t('portal.teacher.schedule.attendance.sessionNotePlaceholder')}

            minRows={2}

            value={sessionNote}

            onChange={(e) => setSessionNote(e.currentTarget.value)}

            readOnly={attendanceLocked}

          />



          {isLoading ? (

            <Loader size="sm" />

          ) : !students?.length ? (

            <Text c="dimmed">{t('portal.teacher.schedule.assignHomework.noStudents')}</Text>

          ) : (

            <Stack gap="xs">

              {students.map((s) => {

                const status = records[s.studentId] ?? 'present';

                const showNote = status !== 'present' || !!studentNotes[s.studentId];

                return (

                  <Paper key={s.studentId} withBorder p="sm" radius="md">

                    <Group justify="space-between" wrap="nowrap">

                      <Text fw={500} size="sm">

                        {s.studentName}

                      </Text>

                      <Group gap={4} wrap="nowrap">

                        <ActionIcon

                          variant={status === 'present' ? 'filled' : 'light'}

                          color="green"

                          size="sm"

                          disabled={attendanceLocked}

                          onClick={() => setStatus(s.studentId, 'present')}

                          aria-label={t('attendance.status.present')}

                        >

                          <IconCheck size={14} />

                        </ActionIcon>

                        <ActionIcon

                          variant={status === 'late' ? 'filled' : 'light'}

                          color="yellow"

                          size="sm"

                          disabled={attendanceLocked}

                          onClick={() => setStatus(s.studentId, 'late')}

                          aria-label={t('attendance.status.late')}

                        >

                          <IconClock size={14} />

                        </ActionIcon>

                        <ActionIcon

                          variant={status === 'absent' ? 'filled' : 'light'}

                          color="red"

                          size="sm"

                          disabled={attendanceLocked}

                          onClick={() => setStatus(s.studentId, 'absent')}

                          aria-label={t('attendance.status.absent')}

                        >

                          <IconX size={14} />

                        </ActionIcon>

                        <Badge size="sm" variant="light">

                          {t(`attendance.status.${status}`)}

                        </Badge>

                      </Group>

                    </Group>

                    <Collapse in={showNote}>

                      <TextInput

                        mt="xs"

                        size="xs"

                        placeholder={t('portal.teacher.schedule.attendance.studentNotePlaceholder')}

                        value={studentNotes[s.studentId] ?? ''}

                        onChange={(e) => {
                          const value = e.currentTarget.value;
                          setStudentNotes((prev) => ({
                            ...prev,
                            [s.studentId]: value,
                          }));
                        }}

                        readOnly={attendanceLocked}

                      />

                    </Collapse>

                  </Paper>

                );

              })}

            </Stack>

          )}



          {!attendanceLocked && (

            <SimpleGrid cols={3}>

              <Button

                variant="light"

                color="green"

                size="xs"

                onClick={() => {

                  if (!students) return;

                  const all: Record<string, AttendanceStatus> = {};

                  students.forEach((s) => {

                    all[s.studentId] = 'present';

                  });

                  setRecords(all);

                }}

              >

                {t('portal.teacher.schedule.attendance.markAllPresent')}

              </Button>

            </SimpleGrid>

          )}



          <Stack gap="xs">

            <Text size="sm" fw={500}>

              {t('portal.teacher.schedule.attendance.screenshotLabel')}

            </Text>

            {!attendanceLocked && (

              <SimpleGrid cols={{ base: 1, sm: 2 }}>

                <FileInput

                  placeholder={t('portal.teacher.schedule.attendance.screenshotPlaceholder')}

                  accept={SCREENSHOT_ACCEPT}

                  leftSection={<IconCamera size={16} />}

                  value={screenshotFile}

                  onChange={(file) => {

                    if (file) applyScreenshotFile(file);

                    else setScreenshotFile(null);

                  }}

                  clearable

                />

                <Paper

                  ref={pasteZoneRef}

                  withBorder

                  p="md"

                  radius="md"

                  tabIndex={0}

                  onPaste={(e) => handlePaste(e.nativeEvent)}

                  onClick={() => pasteZoneRef.current?.focus()}

                  style={{

                    cursor: 'pointer',

                    borderStyle: 'dashed',

                    minHeight: 72,

                    display: 'flex',

                    alignItems: 'center',

                    justifyContent: 'center',

                  }}

                >

                  <Stack gap={4} align="center">

                    <IconClipboard size={22} stroke={1.5} color="var(--mantine-color-blue-6)" />

                    <Text size="sm" ta="center" fw={500}>

                      {t('portal.teacher.schedule.attendance.screenshotPasteZone')}

                    </Text>

                    <Text size="xs" c="dimmed" ta="center">

                      {t('portal.teacher.schedule.attendance.screenshotPasteShortcut')}

                    </Text>

                  </Stack>

                </Paper>

              </SimpleGrid>

            )}

            {!attendanceLocked && (

              <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">

                {t('portal.teacher.schedule.attendance.screenshotHint')}

              </Alert>

            )}

            {previewUrl && (

              <Paper withBorder p="xs" radius="md">

                <Text size="xs" c="dimmed" mb={6}>

                  {t('portal.teacher.schedule.attendance.screenshotPreview')}

                </Text>

                <Image src={previewUrl} alt="Attendance screenshot" radius="sm" mah={240} fit="contain" />

              </Paper>

            )}

          </Stack>



          <Group justify="flex-end">

            <Button variant="light" onClick={onClose}>

              {attendanceLocked ? t('common.close') : t('common.cancel')}

            </Button>

            {!attendanceLocked && (

              <Button

                onClick={handleRequestSave}

                loading={saveMutation.isPending}

                disabled={!students?.length || !hasScreenshot}

              >

                {t('portal.teacher.schedule.attendance.submit')}

              </Button>

            )}

          </Group>

        </Stack>

      </Modal>



      <Modal

        opened={confirmOpen}

        onClose={() => setConfirmOpen(false)}

        title={t('portal.teacher.schedule.attendance.confirmTitle')}

        centered

        size="sm"

      >

        <Stack gap="md">

          <Text size="sm">{t('portal.teacher.schedule.attendance.confirmMessage')}</Text>

          <Alert color="orange" variant="light" icon={<IconAlertCircle size={16} />}>

            {t('portal.teacher.schedule.attendance.confirmWarning')}

          </Alert>

          <List size="sm" spacing={4}>

            <List.Item>

              {t('portal.teacher.schedule.attendance.confirmPresent', { count: statusSummary.present })}

            </List.Item>

            <List.Item>

              {t('portal.teacher.schedule.attendance.confirmLate', { count: statusSummary.late })}

            </List.Item>

            <List.Item>

              {t('portal.teacher.schedule.attendance.confirmAbsent', { count: statusSummary.absent })}

            </List.Item>

          </List>

          {previewUrl && (

            <Image src={previewUrl} alt="Screenshot preview" radius="sm" mah={160} fit="contain" />

          )}

          <Group justify="flex-end">

            <Button variant="light" onClick={() => setConfirmOpen(false)}>

              {t('common.cancel')}

            </Button>

            <Button

              color="blue"

              loading={saveMutation.isPending}

              onClick={() => saveMutation.mutate()}

            >

              {t('portal.teacher.schedule.attendance.confirmSubmit')}

            </Button>

          </Group>

        </Stack>

      </Modal>

    </>

  );

}


