import type { UserRole } from '../types';

export interface NavItem {
  label: string;
  path: string;
}

export const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Search', path: '/search' },
  { label: 'History', path: '/history' },
  { label: 'Chat', path: '/chat' },
  { label: 'Profile', path: '/profile' },
];

export const TUTOR_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Requests', path: '/requests' },
  { label: 'Sessions', path: '/sessions' },
  { label: 'Chat', path: '/chat' },
  { label: 'History', path: '/history' },
  { label: 'Earnings', path: '/earnings' },
  { label: 'Profile', path: '/profile' },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'History', path: '/history' },
];

export function getNavItems(role: UserRole, isAdmin = false): NavItem[] {
  if (isAdmin) {
    return ADMIN_NAV;
  }
  return role === 'tutor' ? TUTOR_NAV : STUDENT_NAV;
}

export const ROLE_STORAGE_KEY = 'plti_role';
export const PROFILE_EXTRAS_KEY = 'plti_profile_extras';
