import { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Table,
  Badge,
  Loader,
  ScrollArea,
  Paper,
  Image,
  Group,
  UnstyledButton,
} from '@mantine/core';
import { IconPhoto } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

interface SessionRow {
  sessionId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  sessionStatus: string;
  sessionNotes: string | null;
  attendanceScreenshotUrl: string | null;
  attendanceStatus: string | null;
  attendanceReason: string | null;
}

interface Props {
  classId: string;
  month: string;
  student: { studentId: string; fullName: string } | null;
  opened: boolean;
  onClose: () => void;
}

const ATTENDANCE_COLOR: Record<string, string> = {
  present: 'green',
  late: 'yellow',
  absent: 'red',
  excused: 'gray',
};

export function StudentAttendedSessionsModal({
  classId,
  month,
  student,
  opened,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    label: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-student-sessions', classId, student?.studentId, month],
    queryFn: async () => {
      const res = await api.get(
        `/teacher-portal/classes/${classId}/students/${student!.studentId}/sessions?month=${month}`
      );
      return res.data.data as {
        fullName: string;
        month: string;
        attendedCount: number;
        totalSessions: number;
        sessions: SessionRow[];
      };
    },
    enabled: opened && !!student?.studentId,
  });

  const attendedSessions =
    data?.sessions.filter(
      (s) => s.attendanceStatus === 'present' || s.attendanceStatus === 'late'
    ) ?? [];

  const handleClose = () => {
    setPreviewImage(null);
    onClose();
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title={t('portal.teacher.classes.studentsModal.sessionsDetailTitle', {
          name: student?.fullName ?? '',
        })}
        centered
        size="85%"
        styles={{
          content: { height: '85vh', display: 'flex', flexDirection: 'column' },
          body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
        }}
      >
        <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
          {data && (
            <Text size="sm" c="dimmed">
              {t('portal.teacher.classes.studentsModal.sessionsDetailSummary', {
                attended: data.attendedCount,
                total: data.totalSessions,
              })}
            </Text>
          )}

          {isLoading ? (
            <Loader size="sm" />
          ) : attendedSessions.length === 0 ? (
            <Paper withBorder p="xl" radius="md">
              <Text ta="center" c="dimmed">
                {t('portal.teacher.classes.studentsModal.noAttendedSessions')}
              </Text>
            </Paper>
          ) : (
            <ScrollArea style={{ flex: 1 }} type="auto">
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('portal.teacher.classes.studentsModal.sessionDate')}</Table.Th>
                    <Table.Th>{t('portal.teacher.classes.studentsModal.sessionTime')}</Table.Th>
                    <Table.Th>{t('portal.teacher.classes.studentsModal.sessionStatus')}</Table.Th>
                    <Table.Th>{t('portal.teacher.classes.studentsModal.sessionScreenshot')}</Table.Th>
                    <Table.Th>{t('portal.teacher.classes.studentsModal.sessionNote')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {attendedSessions.map((session) => {
                    const imageLabel = `${session.sessionDate} · ${session.startTime}–${session.endTime}`;
                    return (
                      <Table.Tr key={session.sessionId}>
                        <Table.Td>
                          <Text size="sm">{session.sessionDate}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {session.startTime}–{session.endTime}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {session.attendanceStatus ? (
                            <Badge
                              color={ATTENDANCE_COLOR[session.attendanceStatus] ?? 'gray'}
                              variant="light"
                              size="sm"
                            >
                              {t(`attendance.status.${session.attendanceStatus}`, {
                                defaultValue: session.attendanceStatus,
                              })}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </Table.Td>
                        <Table.Td>
                          {session.attendanceScreenshotUrl ? (
                            <UnstyledButton
                              onClick={() =>
                                setPreviewImage({
                                  url: session.attendanceScreenshotUrl!,
                                  label: imageLabel,
                                })
                              }
                            >
                              <Group gap="sm" wrap="nowrap">
                                <Image
                                  src={session.attendanceScreenshotUrl}
                                  alt={t('portal.teacher.classes.studentsModal.sessionScreenshot')}
                                  w={72}
                                  h={52}
                                  radius="sm"
                                  fit="cover"
                                  style={{
                                    border: '1px solid var(--mantine-color-gray-3)',
                                    cursor: 'pointer',
                                  }}
                                />
                                <Text size="sm" c="blue" style={{ cursor: 'pointer' }}>
                                  {t('portal.teacher.classes.studentsModal.viewScreenshot')}
                                </Text>
                              </Group>
                            </UnstyledButton>
                          ) : (
                            <Group gap={4} wrap="nowrap">
                              <IconPhoto size={16} color="var(--mantine-color-gray-5)" />
                              <Text size="sm" c="dimmed">
                                —
                              </Text>
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {session.attendanceReason || session.sessionNotes || '—'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      </Modal>

      <Modal
        opened={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title={t('portal.teacher.classes.studentsModal.screenshotPreviewTitle', {
          label: previewImage?.label ?? '',
        })}
        centered
        size="75%"
        styles={{
          content: { height: '75vh', display: 'flex', flexDirection: 'column' },
          body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
        }}
      >
        {previewImage && (
          <ScrollArea style={{ flex: 1 }} type="auto">
            <Image
              src={previewImage.url}
              alt={previewImage.label}
              fit="contain"
              mah="calc(75vh - 80px)"
              mx="auto"
              radius="md"
            />
          </ScrollArea>
        )}
      </Modal>
    </>
  );
}
