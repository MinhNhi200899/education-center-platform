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

const LEVEL_LABELS: Record<number, string> = {
  1: 'Read',
  2: 'Create',
  3: 'Update',
  4: 'Delete',
  5: 'Export',
};

const MODULE_LABELS: Record<string, string> = {
  centers: 'Centers',
  students: 'Students',
  teachers: 'Teachers',
  classes: 'Classes',
  attendance: 'Attendance',
  sessions: 'Sessions',
  evaluations: 'Evaluations',
  tuition: 'Tuition',
  payments: 'Payments',
  dashboard: 'Dashboard',
  reports: 'Reports',
  roles: 'Roles',
  permissions: 'Permissions',
  users: 'Users',
  settings: 'Settings',
};

export function RolesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [assignRoleId, setAssignRoleId] = useState<string | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<string[]>([]);

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
      notifications.show({ title: 'Assigned', message: 'Role assigned to user', color: 'green' });
      setAssignOpen(false);
      setAssignUserId(null);
      setAssignRoleId(null);
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to assign role',
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
      notifications.show({ title: 'Saved', message: 'Role permissions updated', color: 'green' });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to update permissions',
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
          <Title order={2}>Roles & Permissions</Title>
          <Text c="dimmed" size="sm">
            4-level access: Read → Create → Update → Delete (Export where applicable)
          </Text>
        </div>
        <Button leftSection={<IconUserPlus size={16} />} onClick={() => setAssignOpen(true)}>
          Assign role to user
        </Button>
      </Group>

      <Tabs defaultValue="roles">
        <Tabs.List>
          <Tabs.Tab value="roles">Roles</Tabs.Tab>
          <Tabs.Tab value="matrix">Permission matrix</Tabs.Tab>
          <Tabs.Tab value="users">Users</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="roles" pt="md">
          <Paper shadow="sm" radius="md">
            {rolesLoading ? (
              <Loader p="lg" />
            ) : (
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Status</Table.Th>
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
                        <Badge variant="light">{role.isSystem ? 'System' : 'Custom'}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={role.isActive ? 'green' : 'gray'} variant="light">
                          {role.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="light" onClick={() => openRole(role.id)}>
                          Configure
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
                    <Table.Th>Module</Table.Th>
                    <Table.Th>Read</Table.Th>
                    <Table.Th>Create</Table.Th>
                    <Table.Th>Update</Table.Th>
                    <Table.Th>Delete</Table.Th>
                    <Table.Th>Export</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {permissionsByModule.map(([module, perms]) => {
                    const byLevel = (level: number) =>
                      perms.find((p) => p.level === level)?.name ?? '—';
                    return (
                      <Table.Tr key={module}>
                        <Table.Td fw={500}>{MODULE_LABELS[module] || module}</Table.Td>
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
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Roles</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users?.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td>{u.email}</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {u.roles.length === 0 ? (
                          <Text size="sm" c="dimmed">None</Text>
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
        title={roleDetail ? `Permissions: ${roleDetail.name}` : 'Role permissions'}
        size="lg"
      >
        {roleDetailLoading ? (
          <Loader />
        ) : (
          <Stack gap="md">
            {roleDetail?.isSystem && (
              <Text size="sm" c="dimmed">
                System role — permission changes may be restricted in production.
              </Text>
            )}
            <ScrollArea h={360}>
              <Stack gap="xs">
                {permissions?.map((perm) => (
                  <Checkbox
                    key={perm.id}
                    label={`${perm.name} (${LEVEL_LABELS[perm.level] || perm.level})`}
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
                Save permissions
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={assignOpen} onClose={() => setAssignOpen(false)} title="Assign role to user">
        <Stack gap="md">
          <Select
            label="User"
            placeholder="Select user"
            data={(users ?? []).map((u) => ({ value: u.id, label: u.email }))}
            value={assignUserId}
            onChange={setAssignUserId}
            searchable
          />
          <Select
            label="Role"
            placeholder="Select role"
            data={(roles ?? [])
              .filter((r) => r.isActive)
              .map((r) => ({ value: r.id, label: r.name }))}
            value={assignRoleId}
            onChange={setAssignRoleId}
            searchable
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => assignMutation.mutate()}
              loading={assignMutation.isPending}
              disabled={!assignUserId || !assignRoleId}
            >
              Assign
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
