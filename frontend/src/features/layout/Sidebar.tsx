import { NavLink, Stack, Text, Divider, Box } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IconLayoutDashboard,
  IconUsers,
  IconUser,
  IconSchool,
  IconCalendar,
  IconCalendarEvent,
  IconReceipt,
  IconReport,
  IconShield,
  IconQrcode,
  IconHome,
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import { isStudentUser, isTeacherUser } from '@/lib/roles';
import { FEATURE_EVALUATIONS_UI } from '@/lib/feature-flags';

interface NavItem {
  key: string;
  icon: React.ElementType;
  path: string;
  roles?: string[];
}

function getActiveNavPath(pathname: string, items: NavItem[]): string | null {
  const match = items
    .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return match?.path ?? null;
}

const studentNavItems: NavItem[] = [
  { key: 'nav.home', icon: IconHome, path: '/portal' },
  { key: 'nav.mySchedule', icon: IconCalendarEvent, path: '/portal/schedule' },
  { key: 'nav.myTuition', icon: IconReceipt, path: '/portal/tuition' },
];

const teacherNavItems: NavItem[] = [
  { key: 'nav.home', icon: IconHome, path: '/teacher' },
  { key: 'nav.mySchedule', icon: IconCalendarEvent, path: '/teacher/schedule' },
  { key: 'nav.myClasses', icon: IconSchool, path: '/teacher/classes' },
  { key: 'nav.attendance', icon: IconCalendar, path: '/attendance' },
  { key: 'nav.payments', icon: IconReceipt, path: '/payments' },
];

const navItems: NavItem[] = [
  { key: 'nav.dashboard', icon: IconLayoutDashboard, path: '/dashboard', roles: ['super_admin', 'center_manager'] },
  { key: 'nav.students', icon: IconUsers, path: '/students', roles: ['super_admin', 'center_manager'] },
  { key: 'nav.teachers', icon: IconUser, path: '/teachers', roles: ['super_admin', 'center_manager'] },
  { key: 'nav.classes', icon: IconSchool, path: '/classes', roles: ['super_admin', 'center_manager'] },
  { key: 'nav.schedule', icon: IconCalendarEvent, path: '/schedule', roles: ['super_admin', 'center_manager'] },
  { key: 'nav.attendance', icon: IconCalendar, path: '/attendance', roles: ['super_admin', 'teacher'] },
  { key: 'nav.payments', icon: IconReceipt, path: '/payments', roles: ['super_admin', 'parent', 'teacher'] },
  { key: 'nav.reports', icon: IconReport, path: '/reports', roles: ['super_admin', 'center_manager'] },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const filteredNavItems = (isStudentUser(user)
    ? studentNavItems
    : isTeacherUser(user)
    ? teacherNavItems
    : navItems.filter((item) => {
        if (!item.roles) return true;
        return user?.roles?.some((role) => item.roles?.includes(role));
      })
  ).filter((item) => FEATURE_EVALUATIONS_UI || item.path !== '/evaluations');

  const activePath = getActiveNavPath(location.pathname, filteredNavItems);

  return (
    <Stack p="md" gap="xs">
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        {t('common.menu')}
      </Text>

      {filteredNavItems.map((item) => (
        <NavLink
          key={item.path}
          label={t(item.key)}
          leftSection={<item.icon size={20} stroke={1.5} />}
          active={activePath === item.path}
          onClick={() => navigate(item.path)}
          style={{ borderRadius: 8 }}
        />
      ))}

      <Divider my="sm" />

      {user?.roles?.some((r) => ['super_admin', 'center_manager'].includes(r)) && (
        <>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            {t('common.settings')}
          </Text>
          <NavLink
            label={t('nav.paymentSettings')}
            leftSection={<IconQrcode size={20} stroke={1.5} />}
            active={location.pathname.startsWith('/settings/payments')}
            onClick={() => navigate('/settings/payments')}
            style={{ borderRadius: 8 }}
          />
          <NavLink
            label={t('nav.rolesPermissions')}
            leftSection={<IconShield size={20} stroke={1.5} />}
            active={location.pathname.startsWith('/settings/roles')}
            onClick={() => navigate('/settings/roles')}
            style={{ borderRadius: 8 }}
          />
          <Divider my="sm" />
        </>
      )}

      <Box>
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
          {t('common.center')}
        </Text>
        <Text size="sm" c="dimmed">
          {user?.center?.name || t('common.noCenter')}
        </Text>
      </Box>
    </Stack>
  );
}
