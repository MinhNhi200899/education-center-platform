import {
  Stack,
  Title,
  Paper,
  Grid,
  Select,
  Textarea,
  Button,
  Group,
  Text,
  Breadcrumbs,
  Anchor,
  Slider,
  TextInput,
  NumberInput,
  Divider,
  Modal,
  Loader,
  Center,
} from '@mantine/core';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCheck, IconMessageShare, IconFileDescription } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { EvaluationType } from '@/types';

const TYPE_OPTIONS: { value: EvaluationType; label: string }[] = [
  { value: 'daily', label: 'Buổi học' },
  { value: 'weekly', label: 'Tuần' },
  { value: 'monthly', label: 'Tháng' },
  { value: 'term', label: 'Học kỳ' },
];

export function EvaluationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const { data: classes } = useQuery({
    queryKey: ['classes-eval-form'],
    queryFn: async () => {
      const res = await api.get('/classes?limit=100&status=active');
      return res.data.data as Array<{ id: string; name: string }>;
    },
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['evaluation', id],
    queryFn: async () => {
      const res = await api.get(`/evaluations/${id}`);
      return res.data.data;
    },
    enabled: isEdit,
  });

  const form = useForm({
    initialValues: {
      studentId: '',
      classId: '',
      evaluationType: '' as '' | EvaluationType,
      evaluationDate: new Date().toISOString().slice(0, 10),
      participation: 3,
      homework: 3,
      behavior: 3,
      speakingScore: 7,
      writingScore: 7,
      comments: '',
    },
    validate: {
      studentId: (v) => (!v ? 'Chọn học sinh' : null),
      classId: (v) => (!v ? 'Chọn lớp' : null),
      evaluationType: (v) => (!v ? 'Chọn loại nhận xét' : null),
      evaluationDate: (v) => (!v ? 'Chọn ngày' : null),
    },
  });

  const classId = form.values.classId;

  const { data: students } = useQuery({
    queryKey: ['class-students-form', classId],
    queryFn: async () => {
      const res = await api.get(`/classes/${classId}/students`);
      return res.data.data as Array<{ id: string; fullName: string }>;
    },
    enabled: !!classId,
  });

  useEffect(() => {
    if (!existing) return;
    form.setValues({
      studentId: existing.studentId,
      classId: existing.classId,
      evaluationType: existing.evaluationType,
      evaluationDate: existing.evaluationDate?.slice(0, 10) || '',
      participation: existing.participation ?? 3,
      homework: existing.homework ?? 3,
      behavior: existing.behavior ?? 3,
      speakingScore: existing.speakingScore ?? 7,
      writingScore: existing.writingScore ?? 7,
      comments: existing.comments || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const payload = {
        ...values,
        evaluationType: values.evaluationType as EvaluationType,
      };
      if (isEdit) {
        const response = await api.put(`/evaluations/${id}`, payload);
        return response.data.data;
      }
      const response = await api.post('/evaluations', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      notifications.show({
        title: 'Thành công',
        message: isEdit ? 'Đã cập nhật nhận xét' : 'Đã tạo nhận xét',
        color: 'green',
      });
      navigate('/evaluations');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: 'Lỗi',
        message: error.response?.data?.error?.message || 'Không thể lưu nhận xét',
        color: 'red',
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/evaluations/${id}/preview?format=html`, {
        responseType: 'text',
      });
      return res.data as string;
    },
    onSuccess: (html) => {
      setPreviewHtml(html);
      setPreviewOpen(true);
    },
    onError: () => {
      notifications.show({ title: 'Lỗi', message: 'Không tải được báo cáo', color: 'red' });
    },
  });

  const zaloMutation = useMutation({
    mutationFn: async () => {
      const evalId = id!;
      const res = await api.post(`/evaluations/${evalId}/share-zalo`);
      return res.data.data;
    },
    onSuccess: (data: { note?: string; messageTemplate?: string }) => {
      notifications.show({
        title: 'Gửi Zalo (stub)',
        message: data.note || data.messageTemplate || 'Đã ghi nhận gửi Zalo',
        color: 'teal',
      });
    },
    onError: () => {
      notifications.show({ title: 'Lỗi', message: 'Không gửi được Zalo', color: 'red' });
    },
  });

  if (isEdit && loadingExisting) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/evaluations">
          Nhận xét học sinh
        </Anchor>
        <Text>{isEdit ? 'Chi tiết / Sửa' : 'Thêm mới'}</Text>
      </Breadcrumbs>

      <form onSubmit={form.onSubmit((v) => saveMutation.mutate(v))}>
        <Stack gap="lg">
          <Group justify="space-between">
            <Title order={2}>{isEdit ? 'Chi tiết nhận xét' : 'Thêm nhận xét'}</Title>
            {isEdit && (
              <Group>
                <Button
                  variant="light"
                  leftSection={<IconFileDescription size={16} />}
                  loading={previewMutation.isPending}
                  onClick={() => previewMutation.mutate()}
                >
                  Xem báo cáo PH
                </Button>
                <Button
                  variant="light"
                  color="teal"
                  leftSection={<IconMessageShare size={16} />}
                  loading={zaloMutation.isPending}
                  onClick={() => zaloMutation.mutate()}
                >
                  Gửi Zalo PH
                </Button>
              </Group>
            )}
          </Group>

          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Text fw={600} mb="md" c="violet.7">
              Thông tin chung
            </Text>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Lớp học"
                  placeholder="Chọn lớp"
                  required
                  searchable
                  data={(classes || []).map((c) => ({ value: c.id, label: c.name }))}
                  {...form.getInputProps('classId')}
                  onChange={(v) => {
                    form.setFieldValue('classId', v || '');
                    form.setFieldValue('studentId', '');
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Học sinh"
                  placeholder={classId ? 'Chọn học sinh' : 'Chọn lớp trước'}
                  required
                  searchable
                  disabled={!classId}
                  data={(students || []).map((s) => ({ value: s.id, label: s.fullName }))}
                  {...form.getInputProps('studentId')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Loại nhận xét"
                  required
                  data={TYPE_OPTIONS}
                  {...form.getInputProps('evaluationType')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Ngày nhận xét"
                  type="date"
                  required
                  {...form.getInputProps('evaluationDate')}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Text fw={600} mb="md" c="violet.7">
              Thái độ & kỹ năng (thang 1–5)
            </Text>
            <Grid>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text size="sm" fw={500} mb="xs">
                  Tham gia lớp: {form.values.participation}
                </Text>
                <Slider
                  value={form.values.participation}
                  onChange={(v) => form.setFieldValue('participation', v)}
                  min={1}
                  max={5}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 3, label: '3' },
                    { value: 5, label: '5' },
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text size="sm" fw={500} mb="xs">
                  Bài tập về nhà: {form.values.homework}
                </Text>
                <Slider
                  value={form.values.homework}
                  onChange={(v) => form.setFieldValue('homework', v)}
                  min={1}
                  max={5}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 3, label: '3' },
                    { value: 5, label: '5' },
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text size="sm" fw={500} mb="xs">
                  Thái độ / Hành vi: {form.values.behavior}
                </Text>
                <Slider
                  value={form.values.behavior}
                  onChange={(v) => form.setFieldValue('behavior', v)}
                  min={1}
                  max={5}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 3, label: '3' },
                    { value: 5, label: '5' },
                  ]}
                />
              </Grid.Col>
            </Grid>

            <Divider my="lg" label="Điểm Nói & Viết (0–10)" labelPosition="center" />

            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  label="Điểm Nói"
                  min={0}
                  max={10}
                  step={0.5}
                  decimalScale={1}
                  {...form.getInputProps('speakingScore')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  label="Điểm Viết"
                  min={0}
                  max={10}
                  step={0.5}
                  decimalScale={1}
                  {...form.getInputProps('writingScore')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Nhận xét của giáo viên"
                  placeholder="Ghi nhận tiến bộ, điểm cần cải thiện..."
                  minRows={4}
                  {...form.getInputProps('comments')}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          <Group justify="flex-end">
            <Button
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/evaluations')}
            >
              Quay lại
            </Button>
            <Button
              type="submit"
              leftSection={<IconCheck size={16} />}
              loading={saveMutation.isPending}
            >
              {isEdit ? 'Cập nhật' : 'Lưu nhận xét'}
            </Button>
          </Group>
        </Stack>
      </form>

      <Modal
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Báo cáo gửi phụ huynh"
        size="xl"
      >
        <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </Modal>
    </>
  );
}
