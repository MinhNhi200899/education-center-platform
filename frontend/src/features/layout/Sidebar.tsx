import { NavLink, Stack, Text, Divider, Box } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconUsers,
  IconUser,
  IconSchool,
  IconCalendar,
  IconCalendarEvent,
  IconClipboardCheck,
  IconReceipt,
  IconReport,
  IconShield,
  IconQrcode,
  IconHome,
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import { isStudentUser } from '@/lib/roles';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles?: string[];
}

const studentNavItems: NavItem[] = [
  { label: 'Trang chủ', icon: IconHome, path: '/portal' },
  { label: 'Lịch học của tôi', icon: IconCalendarEvent, path: '/portal/schedule' },
  { label: 'Học phí & thông báo', icon: IconReceipt, path: '/portal/tuition' },
];

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: IconLayoutDashboard, path: '/dashboard', roles: ['super_admin', 'center_manager', 'teacher'] },
  { label: 'Students', icon: IconUsers, path: '/students', roles: ['super_admin', 'center_manager'] },
  { label: 'Teachers', icon: IconUser, path: '/teachers', roles: ['super_admin', 'center_manager'] },
  { label: 'Classes', icon: IconSchool, path: '/classes', roles: ['super_admin', 'center_manager', 'teacher'] },
  { label: 'Lịch dạy', icon: IconCalendarEvent, path: '/schedule', roles: ['super_admin', 'center_manager', 'teacher'] },
  { label: 'Attendance', icon: IconCalendar, path: '/attendance', roles: ['super_admin', 'center_manager', 'teacher'] },
  { label: 'Nhận xét HS', icon: IconClipboardCheck, path: '/evaluations', roles: ['super_admin', 'center_manager', 'teacher'] },
  { label: 'Phiếu thu', icon: IconReceipt, path: '/payments', roles: ['super_admin', 'center_manager', 'parent'] },
  { label: 'Báo cáo', icon: IconReport, path: '/reports', roles: ['super_admin', 'center_manager'] },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const filteredNavItems = isStudentUser(user)
    ? studentNavItems
    : navItems.filter((item) => {
        if (!item.roles) return true;
        return user?.roles?.some((role) => item.roles?.includes(role));
      });

  return (
    <Stack p="md" gap="xs">
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        Menu
      </Text>

      {filteredNavItems.map((item) => (
        <NavLink
          key={item.path}
          label={item.label}
          leftSection={<item.icon size={20} stroke={1.5} />}
          active={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
          onClick={() => navigate(item.path)}
          style={{ borderRadius: 8 }}
        />
      ))}

      <Divider my="sm" />

      {user?.roles?.some((r) => ['super_admin', 'center_manager'].includes(r)) && (
        <>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Settings
          </Text>
          <NavLink
            label="QR Payments"
            leftSection={<IconQrcode size={20} stroke={1.5} />}
            active={location.pathname.startsWith('/settings/payments')}
            onClick={() => navigate('/settings/payments')}
            style={{ borderRadius: 8 }}
          />
          <NavLink
            label="Roles & Permissions"
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
          Center
        </Text>
        <Text size="sm" c="dimmed">
          {user?.center?.name || 'No center assigned'}
        </Text>
      </Box>
    </Stack>
  );
}