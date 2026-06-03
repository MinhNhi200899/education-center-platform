import { Group, Title, ActionIcon, Menu, Avatar, Text, UnstyledButton } from '@mantine/core';
import { IconBell, IconSettings, IconLogout, IconUser } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <Group h="100%" px="md" justify="space-between">
      <Title order={4} c="primary.7">
        Education Center
      </Title>

      <Group gap="sm">
        <ActionIcon variant="subtle" color="gray" size="lg" radius="md">
          <IconBell size={20} />
        </ActionIcon>

        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <UnstyledButton>
              <Group gap="xs">
                <Avatar size="sm" radius="md" color="primary">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <div style={{ lineHeight: 1 }}>
                  <Text size="sm" fw={500}>
                    {user?.email?.split('@')[0] || 'User'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {user?.roles?.[0] || 'Guest'}
                  </Text>
                </div>
              </Group>
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item leftSection={<IconUser size={16} />}>Profile</Menu.Item>
            <Menu.Item leftSection={<IconSettings size={16} />}>Settings</Menu.Item>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconLogout size={16} />}
              color="red"
              onClick={logout}
            >
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}