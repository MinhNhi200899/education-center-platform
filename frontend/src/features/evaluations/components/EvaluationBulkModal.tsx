import {
  Modal,
  Stack,
  Select,
  TextInput,
  Button,
  Group,
  Text,
  Table,
  Slider,
  NumberInput,
  Textarea,
  ScrollArea,
  Badge,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconUsers } from '@tabler/icons-react';
import api from '@/lib/api';
import type { EvaluationType } from '@/types';

interface StudentOption {
  id: string;
  fullName: string;
}

interface RowState {
  studentId: string;
  studentName: string;
  participation: number;
  homework: number;
  behavior: number;
  speakingScore: number;
  writingScore: number;
  comments: string;
}

const TYPE_OPTIONS: { value: EvaluationType; label: string }[] = [
  { value: 'daily', label: 'Buổi học' },
  { value: 'weekly', label: 'Tuần' },
  { value: 'monthly', label: 'Tháng' },
  { value: 'term', label: 'Học kỳ' },
];

interface Props {
  opened: boolean;
  onClose: () => void;
}

export function EvaluationBulkModal({ opened, onClose }: Props) {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState<string | null>(null);
  const [evaluationType, setEvaluationType] = useState<EvaluationType>('daily');
  const [evaluationDate, setEvaluationDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [rows, setRows] = useState<RowState[]>([]);

  const { data: classes } = useQuery({
    queryKey: ['classes-select-eval'],
    queryFn: async () => {
      const res = await api.get('/classes?limit=100&status=active');
      return res.data.data as Array<{ id: string; name: string }>;
    },
    enabled: opened,
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ['class-students-eval', classId],
    queryFn: async () => {
      const res = await api.get(`/classes/${classId}/students`);
      return res.data.data as StudentOption[];
    },
    enabled: !!classId && opened,
  });

  useEffect(() => {
    if (!students) return;
    setRows(
      students.map((s) => ({
        studentId: s.id,
        studentName: s.fullName,
        participation: 3,
        homework: 3,
        behavior: 3,
        speakingScore: 7,
        writingScore: 7,
        comments: '',
      }))
    );
  }, [students]);

  const bulkMutation = useMutation({
    mutationFn: async () => {
      if (!classId) throw new Error('Chọn lớp');
      const response = await api.post('/evaluations/bulk', {
        classId,
        evaluationType,
        evaluationDate,
        records: rows.map((r) => ({
          studentId: r.studentId,
          participation: r.participation,
          homework: r.homework,
          behavior: r.behavior,
          speakingScore: r.speakingScore,
          writingScore: r.writingScore,
          comments: r.comments || undefined,
        })),
      });
      return response.data.data;
    },
    onSuccess: (data: { created: number }) => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      notifications.show({
        title: 'Thành công',
        message: `Đã lưu nhận xét cho ${data.created} học sinh`,
        color: 'green',
      });
      onClose();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: 'Lỗi',
        message: error.response?.data?.error?.message || 'Không thể lưu nhận xét hàng loạt',
        color: 'red',
      });
    },
  });

  const updateRow = (studentId: string, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconUsers size={20} />
          <Text fw={600}>Nhận xét cả lớp</Text>
        </Group>
      }
      size="xl"
    >
      <Stack gap="md">
        <Group grow align="flex-end">
          <Select
            label="Lớp học"
            placeholder="Chọn lớp"
            data={(classes || []).map((c) => ({ value: c.id, label: c.name }))}
            value={classId}
            onChange={setClassId}
            searchable
            required
          />
          <Select
            label="Loại nhận xét"
            data={TYPE_OPTIONS}
            value={evaluationType}
            onChange={(v) => v && setEvaluationType(v as EvaluationType)}
          />
          <TextInput
            label="Ngày"
            type="date"
            value={evaluationDate}
            onChange={(e) => setEvaluationDate(e.currentTarget.value)}
          />
        </Group>

        {classId && (
          <>
            <Badge variant="light" color="violet">
              {rows.length} học sinh trong lớp
            </Badge>
            <ScrollArea h={420}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Học sinh</Table.Th>
                    <Table.Th>Tham gia</Table.Th>
                    <Table.Th>BTVN</Table.Th>
                    <Table.Th>Thái độ</Table.Th>
                    <Table.Th>Nói</Table.Th>
                    <Table.Th>Viết</Table.Th>
                    <Table.Th>Nhận xét</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {isLoading ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Text c="dimmed" ta="center">
                          Đang tải danh sách...
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    rows.map((row) => (
                      <Table.Tr key={row.studentId}>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {row.studentName}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Slider
                            size="xs"
                            min={1}
                            max={5}
                            value={row.participation}
                            onChange={(v) => updateRow(row.studentId, { participation: v })}
                            style={{ minWidth: 80 }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Slider
                            size="xs"
                            min={1}
                            max={5}
                            value={row.homework}
                            onChange={(v) => updateRow(row.studentId, { homework: v })}
                            style={{ minWidth: 80 }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Slider
                            size="xs"
                            min={1}
                            max={5}
                            value={row.behavior}
                            onChange={(v) => updateRow(row.studentId, { behavior: v })}
                            style={{ minWidth: 80 }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            size="xs"
                            min={0}
                            max={10}
                            step={0.5}
                            decimalScale={1}
                            value={row.speakingScore}
                            onChange={(v) =>
                              updateRow(row.studentId, { speakingScore: Number(v) || 0 })
                            }
                            w={70}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            size="xs"
                            min={0}
                            max={10}
                            step={0.5}
                            decimalScale={1}
                            value={row.writingScore}
                            onChange={(v) =>
                              updateRow(row.studentId, { writingScore: Number(v) || 0 })
                            }
                            w={70}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Textarea
                            size="xs"
                            autosize
                            minRows={1}
                            maxRows={2}
                            value={row.comments}
                            onChange={(e) =>
                              updateRow(row.studentId, { comments: e.currentTarget.value })
                            }
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </>
        )}

        <Group justify="flex-end">
          <Button variant="light" onClick={onClose}>
            Hủy
          </Button>
          <Button
            leftSection={<IconCheck size={16} />}
            loading={bulkMutation.isPending}
            disabled={!classId || rows.length === 0}
            onClick={() => bulkMutation.mutate()}
          >
            Lưu nhận xét cả lớp
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
