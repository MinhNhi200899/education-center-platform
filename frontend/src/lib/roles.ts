import type { User, UserRole } from '@/types';

const STAFF_ROLES: UserRole[] = ['super_admin', 'center_manager', 'teacher'];

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
  if (isParentUser(user)) return '/portal/tuition';
  return '/dashboard';
}
