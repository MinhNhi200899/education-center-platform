import { useEffect, useMemo, useState } from 'react';
import {
  Stack,
  Title,
  Paper,
  Table,
  Text,
  Badge,
  Group,
  Button,
  Modal,
  Select,
  Tabs,
  Checkbox,
  ScrollArea,
  Loader,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconUserPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface Permission {
  id: string;
  name: string;
  module: string;
  level: number;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
}

interface RoleDetail extends Role {
  permissions: Permission[];
}

interface RbacUser {
  id: string;
  email: string;
  phone?: string;
  status: string;
  roles: Array<{ id: string; name: string; centerId?: string | null }>;
}

export function RolesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [assignRoleId, setAssignRoleId] = useState<string | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<string[]>([]);

  const LEVEL_LABELS = useMemo(
    () => ({
      1: t('settings.roles.levelLabels.read'),
      2: t('settings.roles.levelLabels.create'),
      3: t('settings.roles.levelLabels.update'),
      4: t('settings.roles.levelLabels.delete'),
      5: t('settings.roles.levelLabels.export'),
    }),
    [t]
  );

  const MODULE_LABELS = useMemo(
    () => ({
      centers: t('settings.roles.moduleLabels.centers'),
      students: t('settings.roles.moduleLabels.students'),
      teachers: t('settings.roles.moduleLabels.teachers'),
      classes: t('settings.roles.moduleLabels.classes'),
      attendance: t('settings.roles.moduleLabels.attendance'),
      evaluations: t('settings.roles.moduleLabels.evaluations'),
      schedule: t('settings.roles.moduleLabels.schedule'),
      tuition: t('settings.roles.moduleLabels.tuition'),
      payments: t('settings.roles.moduleLabels.payments'),
      dashboard: t('settings.roles.moduleLabels.dashboard'),
      reports: t('settings.roles.moduleLabels.reports'),
      settings: t('settings.roles.moduleLabels.settings'),
    }),
    [t]
  );

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: async () => {
      const response = await api.get('/rbac/roles?includeInactive=true');
      return response.data.data as Role[];
    },
  });

  const { data: permissions } = useQuery({
    queryKey: ['rbac-permissions'],
    queryFn: async () => {
      const response = await api.get('/rbac/permissions');
      return response.data.data as Permission[];
    },
  });

  const { data: roleDetail, isLoading: roleDetailLoading } = useQuery({
    queryKey: ['rbac-role', selectedRoleId],
    queryFn: async () => {
      const response = await api.get(`/rbac/roles/${selectedRoleId}`);
      return response.data.data as RoleDetail;
    },
    enabled: !!selectedRoleId,
  });

  const { data: users } = useQuery({
    queryKey: ['rbac-users', user?.centerId],
    queryFn: async () => {
      const params = user?.centerId ? `?centerId=${user.centerId}` : '';
      const response = await api.get(`/rbac/users${params}`);
      return response.data.data as RbacUser[];
    },
  });

  const permissionsByModule = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const perm of permissions ?? []) {
      const list = map.get(perm.module) ?? [];
      list.push(perm);
      map.set(perm.module, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!assignUserId || !assignRoleId) return;
      await api.post(`/rbac/users/${assignUserId}/roles`, {
        roleId: assignRoleId,
        centerId: user?.centerId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-users'] });
      notifications.show({ title: t('settings.roles.assignedTitle'), message: t('settings.roles.assignedMessage'), color: 'green' });
      setAssignOpen(false);
      setAssignUserId(null);
      setAssignRoleId(null);
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('settings.roles.assignFailed'),
        color: 'red',
      });
    },
  });

  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) return;
      await api.put(`/rbac/roles/${selectedRoleId}/permissions`, {
        permissionIds: permissionDraft,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-role', selectedRoleId] });
      notifications.show({ title: t('settings.roles.savedTitle'), message: t('settings.roles.savedMessage'), color: 'green' });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.error?.message || t('settings.roles.saveFailed'),
        color: 'red',
      });
    },
  });

  const openRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    setPermissionDraft([]);
  };

  useEffect(() => {
    if (roleDetail?.permissions) {
      setPermissionDraft(roleDetail.permissions.map((p) => p.id));
    }
  }, [roleDetail?.id]);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>{t('settings.roles.title')}</Title>
          <Text c="dimmed" size="sm">
            {t('settings.roles.subtitle')}
          </Text>
        </div>
        <Button leftSection={<IconUserPlus size={16} />} onClick={() => setAssignOpen(true)}>
          {t('settings.roles.assignRole')}
        </Button>
      </Group>

      <Tabs defaultValue="roles">
        <Tabs.List>
          <Tabs.Tab value="roles">{t('settings.roles.tabs.roles')}</Tabs.Tab>
          <Tabs.Tab value="matrix">{t('settings.roles.tabs.matrix')}</Tabs.Tab>
          <Tabs.Tab value="users">{t('settings.roles.tabs.users')}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="roles" pt="md">
          <Paper shadow="sm" radius="md">
            {rolesLoading ? (
              <Loader p="lg" />
            ) : (
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('settings.roles.table.role')}</Table.Th>
                    <Table.Th>{t('common.description')}</Table.Th>
                    <Table.Th>{t('settings.roles.table.type')}</Table.Th>
                    <Table.Th>{t('common.status')}</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {roles?.map((role) => (
                    <Table.Tr key={role.id}>
                      <Table.Td>
                        <Text fw={500}>{role.name}</Text>
                      </Table.Td>
                      <Table.Td>{role.description || '-'}</Table.Td>
                      <Table.Td>
                        <Badge variant="light">{role.isSystem ? t('settings.roles.table.system') : t('settings.roles.table.custom')}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={role.isActive ? 'green' : 'gray'} variant="light">
                          {role.isActive ? t('settings.roles.table.active') : t('settings.roles.table.inactive')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="light" onClick={() => openRole(role.id)}>
                          {t('settings.roles.configure')}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="matrix" pt="md">
          <Paper shadow="sm" p="md" radius="md">
            <ScrollArea>
              <Table withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('settings.roles.table.module')}</Table.Th>
                    <Table.Th>{t('settings.roles.levelLabels.read')}</Table.Th>
                    <Table.Th>{t('settings.roles.levelLabels.create')}</Table.Th>
                    <Table.Th>{t('settings.roles.levelLabels.update')}</Table.Th>
                    <Table.Th>{t('settings.roles.levelLabels.delete')}</Table.Th>
                    <Table.Th>{t('settings.roles.levelLabels.export')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {permissionsByModule.map(([module, perms]) => {
                    const byLevel = (level: number) =>
                      perms.find((p) => p.level === level)?.name ?? '—';
                    return (
                      <Table.Tr key={module}>
                        <Table.Td fw={500}>{MODULE_LABELS[module as keyof typeof MODULE_LABELS] || module}</Table.Td>
                        <Table.Td>{byLevel(1)}</Table.Td>
                        <Table.Td>{byLevel(2)}</Table.Td>
                        <Table.Td>{byLevel(3)}</Table.Td>
                        <Table.Td>{byLevel(4)}</Table.Td>
                        <Table.Td>{byLevel(5)}</Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="users" pt="md">
          <Paper shadow="sm" radius="md">
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('common.email')}</Table.Th>
                  <Table.Th>{t('settings.roles.table.roles')}</Table.Th>
                  <Table.Th>{t('common.status')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users?.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td>{u.email}</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {u.roles.length === 0 ? (
                          <Text size="sm" c="dimmed">{t('common.none')}</Text>
                        ) : (
                          u.roles.map((r) => (
                            <Badge key={`${u.id}-${r.id}`} variant="light" size="sm">
                              {r.name}
                            </Badge>
                          ))
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">{u.status}</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={!!selectedRoleId}
        onClose={() => {
          setSelectedRoleId(null);
          setPermissionDraft([]);
        }}
        title={roleDetail ? `${t('settings.roles.permissionsFor')} ${roleDetail.name}` : t('settings.roles.permissionsTitle')}
        size="lg"
      >
        {roleDetailLoading ? (
          <Loader />
        ) : (
          <Stack gap="md">
            {roleDetail?.isSystem && (
              <Text size="sm" c="dimmed">
                {t('settings.roles.systemWarning')}
              </Text>
            )}
            <ScrollArea h={360}>
              <Stack gap="xs">
                {permissions?.map((perm) => (
                  <Checkbox
                    key={perm.id}
                    label={`${perm.name} (${LEVEL_LABELS[perm.level as keyof typeof LEVEL_LABELS] || perm.level})`}
                    checked={permissionDraft.includes(perm.id)}
                    onChange={(e) => {
                      setPermissionDraft((prev) =>
                        e.currentTarget.checked
                          ? [...prev, perm.id]
                          : prev.filter((id) => id !== perm.id)
                      );
                    }}
                  />
                ))}
              </Stack>
            </ScrollArea>
            <Group justify="flex-end">
              <Button
                onClick={() => savePermissionsMutation.mutate()}
                loading={savePermissionsMutation.isPending}
                disabled={roleDetail?.isSystem && roleDetail.name === 'super_admin'}
              >
                {t('settings.roles.savePermissions')}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={assignOpen} onClose={() => setAssignOpen(false)} title={t('settings.roles.assignRole')}>
        <Stack gap="md">
          <Select
            label={t('settings.roles.table.user')}
            placeholder={t('settings.roles.selectUser')}
            data={(users ?? []).map((u) => ({ value: u.id, label: u.email }))}
            value={assignUserId}
            onChange={setAssignUserId}
            searchable
          />
          <Select
            label={t('settings.roles.table.role')}
            placeholder={t('settings.roles.selectRole')}
            data={(roles ?? [])
              .filter((r) => r.isActive)
              .map((r) => ({ value: r.id, label: r.name }))}
            value={assignRoleId}
            onChange={setAssignRoleId}
            searchable
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAssignOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => assignMutation.mutate()}
              loading={assignMutation.isPending}
              disabled={!assignUserId || !assignRoleId}
            >
              {t('common.assign')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
