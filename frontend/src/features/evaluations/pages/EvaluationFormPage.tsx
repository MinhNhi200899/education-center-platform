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
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import type { EvaluationType } from '@/types';

export function EvaluationFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const TYPE_OPTIONS = useMemo(
    () => [
      { value: 'daily' as EvaluationType, label: t('evaluations.types.daily') },
      { value: 'weekly' as EvaluationType, label: t('evaluations.types.weekly') },
      { value: 'monthly' as EvaluationType, label: t('evaluations.types.monthly') },
      { value: 'term' as EvaluationType, label: t('evaluations.types.term') },
    ],
    [t]
  );

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
      studentId: (v) => (!v ? t('evaluations.form.validation.selectStudent') : null),
      classId: (v) => (!v ? t('evaluations.form.validation.selectClass') : null),
      evaluationType: (v) => (!v ? t('evaluations.form.validation.selectType') : null),
      evaluationDate: (v) => (!v ? t('evaluations.form.validation.selectDate') : null),
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
        title: t('common.success'),
        message: isEdit ? t('evaluations.messages.updateSuccess') : t('evaluations.messages.createSuccess'),
        color: 'green',
      });
      navigate('/evaluations');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('evaluations.messages.saveFailed'),
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
      notifications.show({ title: t('common.error'), message: t('evaluations.messages.previewFailed'), color: 'red' });
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
        title: t('evaluations.messages.zaloSuccess'),
        message: data.note || data.messageTemplate || t('evaluations.messages.zaloSuccess'),
        color: 'teal',
      });
    },
    onError: () => {
      notifications.show({ title: t('common.error'), message: t('evaluations.messages.zaloFailed'), color: 'red' });
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
          {t('evaluations.list.title')}
        </Anchor>
        <Text>{isEdit ? t('evaluations.form.breadcrumbEdit') : t('evaluations.form.breadcrumbNew')}</Text>
      </Breadcrumbs>

      <form onSubmit={form.onSubmit((v) => saveMutation.mutate(v))}>
        <Stack gap="lg">
          <Group justify="space-between">
            <Title order={2}>{isEdit ? t('evaluations.form.editTitle') : t('evaluations.form.newTitle')}</Title>
            {isEdit && (
              <Group>
                <Button
                  variant="light"
                  leftSection={<IconFileDescription size={16} />}
                  loading={previewMutation.isPending}
                  onClick={() => previewMutation.mutate()}
                >
                  {t('evaluations.form.preview')}
                </Button>
                <Button
                  variant="light"
                  color="teal"
                  leftSection={<IconMessageShare size={16} />}
                  loading={zaloMutation.isPending}
                  onClick={() => zaloMutation.mutate()}
                >
                  {t('evaluations.form.zalo')}
                </Button>
              </Group>
            )}
          </Group>

          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Text fw={600} mb="md" c="violet.7">
              {t('evaluations.form.generalInfo')}
            </Text>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label={t('evaluations.form.class')}
                  placeholder={t('evaluations.form.selectClass')}
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
                  label={t('evaluations.form.student')}
                  placeholder={classId ? t('evaluations.form.selectStudent') : t('evaluations.form.selectClassFirst')}
                  required
                  searchable
                  disabled={!classId}
                  data={(students || []).map((s) => ({ value: s.id, label: s.fullName }))}
                  {...form.getInputProps('studentId')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label={t('evaluations.form.type')}
                  required
                  data={TYPE_OPTIONS}
                  {...form.getInputProps('evaluationType')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label={t('evaluations.form.date')}
                  type="date"
                  required
                  {...form.getInputProps('evaluationDate')}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Text fw={600} mb="md" c="violet.7">
              {t('evaluations.form.attitudeTitle')}
            </Text>
            <Grid>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text size="sm" fw={500} mb="xs">
                  {t('evaluations.form.participation', { value: form.values.participation })}
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
                  {t('evaluations.form.homework', { value: form.values.homework })}
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
                  {t('evaluations.form.behavior', { value: form.values.behavior })}
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

            <Divider my="lg" label={t('evaluations.form.scoresTitle')} labelPosition="center" />

            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  label={t('evaluations.form.speakingScore')}
                  min={0}
                  max={10}
                  step={0.5}
                  decimalScale={1}
                  {...form.getInputProps('speakingScore')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  label={t('evaluations.form.writingScore')}
                  min={0}
                  max={10}
                  step={0.5}
                  decimalScale={1}
                  {...form.getInputProps('writingScore')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label={t('evaluations.form.comments')}
                  placeholder={t('evaluations.form.commentsPlaceholder')}
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
              {t('common.back')}
            </Button>
            <Button
              type="submit"
              leftSection={<IconCheck size={16} />}
              loading={saveMutation.isPending}
            >
              {isEdit ? t('evaluations.form.submitUpdate') : t('evaluations.form.submitCreate')}
            </Button>
          </Group>
        </Stack>
      </form>

      <Modal
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t('evaluations.form.previewTitle')}
        size="xl"
      >
        <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </Modal>
    </>
  );
}
