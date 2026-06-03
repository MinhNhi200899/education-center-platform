import {
  Stack,
  Title,
  Text,
  Group,
  Button,
  Select,
  Paper,
  Table,
  ScrollArea,
  ActionIcon,
  Badge,
} from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconDeviceFloppy, IconCalendarPlus } from '@tabler/icons-react';
import api from '@/lib/api';
import type { AttendanceStatus } from '@/types';

type CellKey = string;

interface MonthlyGrid {
  classId: string;
  className: string;
  year: number;
  month: number;
  sessions: Array<{ id: string; sessionDate: string; startTime: string }>;
  students: Array<{ id: string; fullName: string }>;
  cells: Record<
    string,
    {
      status: AttendanceStatus | null;
      reason: string | null;
    }
  >;
}

const statusCycle: (AttendanceStatus | null)[] = [null, 'present', 'absent'];

function cellColor(status: AttendanceStatus | null | undefined) {
  if (status === 'present') return '#d3f9d8';
  if (status === 'absent') return '#ffe3e3';
  if (status === 'late') return '#fff3bf';
  if (status === 'excused') return '#d0ebff';
  return '#f8f9fa';
}

function cellLabel(status: AttendanceStatus | null | undefined) {
  if (status === 'present') return 'C';
  if (status === 'absent') return 'V';
  if (status === 'late') return 'M';
  if (status === 'excused') return 'P';
  return '';
}

export function AttendanceMonthlyPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [localCells, setLocalCells] = useState<Record<CellKey, AttendanceStatus>>({});
  const [dragStatus, setDragStatus] = useState<AttendanceStatus | null>(null);
  const isDragging = useRef(false);

  const { data: grid, refetch } = useQuery({
    queryKey: ['attendance-monthly', classId, year, month],
    queryFn: async () => {
      const res = await api.get(
        `/attendance/monthly-grid?classId=${classId}&year=${year}&month=${month}`
      );
      return res.data.data as MonthlyGrid;
    },
    enabled: !!classId,
  });

  useEffect(() => {
    if (!grid) return;
    const merged: Record<CellKey, AttendanceStatus> = {};
    Object.entries(grid.cells).forEach(([key, cell]) => {
      if (cell.status) merged[key] = cell.status;
    });
    setLocalCells(merged);
  }, [grid]);

  const prepareMutation = useMutation({
    mutationFn: async () => {
      await api.post('/attendance/monthly/prepare', { classId, year, month });
    },
    onSuccess: () => {
      notifications.show({
        title: 'Đã tạo buổi học',
        message: 'Buổi học trong tháng đã được sinh từ lịch lớp',
        color: 'green',
      });
      refetch();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!classId || !grid) return;
      const records = Object.entries(localCells).map(([key, status]) => {
        const [studentId, sessionId] = key.split(':');
        return { studentId, sessionId, status };
      });
      await api.post('/attendance/monthly-bulk', { classId, records });
    },
    onSuccess: () => {
      notifications.show({ title: 'Đã lưu', message: 'Điểm danh tháng đã lưu', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['attendance-monthly'] });
    },
  });

  const setCell = useCallback((studentId: string, sessionId: string, status: AttendanceStatus | null) => {
    const key = `${studentId}:${sessionId}`;
    setLocalCells((prev) => {
      const next = { ...prev };
      if (status === null) delete next[key];
      else next[key] = status;
      return next;
    });
  }, []);

  const cycleCell = (studentId: string, sessionId: string) => {
    const key = `${studentId}:${sessionId}`;
    const current = localCells[key] || null;
    const idx = statusCycle.indexOf(current);
    const next = statusCycle[(idx + 1) % statusCycle.length];
    setCell(studentId, sessionId, next);
  };

  const onCellMouseDown = (studentId: string, sessionId: string) => {
    const key = `${studentId}:${sessionId}`;
    const next =
      localCells[key] === 'present' ? 'absent' : ('present' as AttendanceStatus);
    setDragStatus(next);
    isDragging.current = true;
    setCell(studentId, sessionId, next);
  };

  const onCellMouseEnter = (studentId: string, sessionId: string) => {
    if (!isDragging.current || !dragStatus) return;
    setCell(studentId, sessionId, dragStatus);
  };

  return (
    <Stack gap="md" onMouseUp={() => { isDragging.current = false; setDragStatus(null); }}>
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/attendance')}>
          <IconArrowLeft size={20} />
        </ActionIcon>
        <div style={{ flex: 1 }}>
          <Title order={2}>Điểm danh cả tháng</Title>
          <Text c="dimmed">{grid?.className || '...'}</Text>
        </div>
      </Group>

      <Paper p="md" radius="md" withBorder>
        <Group>
          <Select
            label="Năm"
            data={['2024', '2025', '2026', '2027'].map((y) => ({ value: y, label: y }))}
            value={String(year)}
            onChange={(v) => v && setYear(parseInt(v, 10))}
            w={100}
          />
          <Select
            label="Tháng"
            data={Array.from({ length: 12 }, (_, i) => ({
              value: String(i + 1),
              label: `Tháng ${i + 1}`,
            }))}
            value={String(month)}
            onChange={(v) => v && setMonth(parseInt(v, 10))}
            w={120}
          />
          <Button
            leftSection={<IconCalendarPlus size={16} />}
            variant="light"
            loading={prepareMutation.isPending}
            onClick={() => prepareMutation.mutate()}
            mt={24}
          >
            Tạo buổi từ lịch lớp
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            mt={24}
            disabled={!grid?.sessions?.length}
          >
            Lưu tháng
          </Button>
        </Group>
        <Group mt="xs" gap="xs">
          <Badge color="green">C = Có</Badge>
          <Badge color="red">V = Vắng</Badge>
          <Text size="xs" c="dimmed">
            Click ô để đổi; giữ chuột và kéo để điền hàng loạt
          </Text>
        </Group>
      </Paper>

      {!grid?.sessions?.length ? (
        <Text c="dimmed" ta="center" py="xl">
          Chưa có buổi học trong tháng. Bấm &quot;Tạo buổi từ lịch lớp&quot; trước.
        </Text>
      ) : (
        <ScrollArea>
          <Table striped withTableBorder withColumnBorders style={{ minWidth: 800 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 2 }}>
                  Học sinh
                </Table.Th>
                {grid.sessions.map((s) => (
                  <Table.Th key={s.id} style={{ minWidth: 36, textAlign: 'center', fontSize: 11 }}>
                    {new Date(s.sessionDate).getDate()}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {grid.students.map((student) => (
                <Table.Tr key={student.id}>
                  <Table.Td
                    style={{
                      position: 'sticky',
                      left: 0,
                      background: '#fff',
                      zIndex: 1,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {student.fullName}
                  </Table.Td>
                  {grid.sessions.map((session) => {
                    const key = `${student.id}:${session.id}`;
                    const status = localCells[key];
                    return (
                      <Table.Td
                        key={session.id}
                        style={{
                          padding: 2,
                          textAlign: 'center',
                          background: cellColor(status),
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        onMouseDown={() => onCellMouseDown(student.id, session.id)}
                        onMouseEnter={() => onCellMouseEnter(student.id, session.id)}
                        onClick={() => cycleCell(student.id, session.id)}
                      >
                        <Text size="xs" fw={700}>
                          {cellLabel(status)}
                        </Text>
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Stack>
  );
}
