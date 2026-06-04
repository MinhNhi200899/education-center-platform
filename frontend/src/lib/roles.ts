import type { User, UserRole } from '@/types';

const ADMIN_ROLES: UserRole[] = ['super_admin', 'center_manager'];
const STAFF_ROLES: UserRole[] = [...ADMIN_ROLES, 'teacher'];

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user?.roles?.length) return false;
  return user.roles.some((r) => ADMIN_ROLES.includes(r));
}

export function isTeacherUser(user: User | null | undefined): boolean {
  if (!user?.roles?.length) return false;
  return user.roles.includes('teacher') && !isAdminUser(user);
}

export function isStudentUser(user: User | null | undefined): boolean {
  if (!user?.roles?.length) return false;
  return user.roles.includes('student') && !user.roles.some((r) => STAFF_ROLES.includes(r));
}

export function isParentUser(user: User | null | undefined): boolean {
  if (!user?.roles?.length) return false;
  return user.roles.includes('parent') && !user.roles.some((r) => STAFF_ROLES.includes(r));
}

export function getHomePath(user: User | null | undefined): string {
  if (isStudentUser(user)) return '/portal';
  if (isTeacherUser(user)) return '/teacher';
  if (isParentUser(user)) return '/portal/tuition';
  return '/dashboard';
}
