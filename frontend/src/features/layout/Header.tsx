import { Group, Title, ActionIcon, Menu, Avatar, Text, UnstyledButton, Select } from '@mantine/core';
import { IconBell, IconSettings, IconLogout, IconUser, IconLanguage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  const currentLng = (i18n.resolvedLanguage || i18n.language || 'vi').startsWith('en') ? 'en' : 'vi';

  return (
    <Group h="100%" px="md" justify="space-between">
      <Title order={4} c="primary.7">
        {t('header.appName')}
      </Title>

      <Group gap="sm">
        <Select
          aria-label={t('common.language')}
          leftSection={<IconLanguage size={16} />}
          value={currentLng}
          onChange={(v) => v && i18n.changeLanguage(v)}
          data={[
            { value: 'vi', label: t('common.vietnamese') },
            { value: 'en', label: t('common.english') },
          ]}
          allowDeselect={false}
          w={140}
          size="sm"
        />

        <ActionIcon variant="subtle" color="gray" size="lg" radius="md" aria-label={t('header.notifications')}>
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
                    {user?.email?.split('@')[0] || t('common.user')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {user?.roles?.[0] || t('common.guest')}
                  </Text>
                </div>
              </Group>
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item leftSection={<IconUser size={16} />}>{t('auth.profile')}</Menu.Item>
            <Menu.Item leftSection={<IconSettings size={16} />}>{t('common.settings')}</Menu.Item>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconLogout size={16} />}
              color="red"
              onClick={logout}
            >
              {t('auth.logout')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
