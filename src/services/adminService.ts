import type { User } from '@supabase/supabase-js';
import type { UserRole } from '../types';
import { getTutorApplication } from './tutorApplicationService';
import { supabase } from './supabase';

export function isAdminUser(user: Pick<User, 'app_metadata'> | null | undefined): boolean {
  return user?.app_metadata?.role === 'admin';
}

export async function getCurrentAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export function getPostLoginPath(_user: Pick<User, 'app_metadata'> | null | undefined): string {
  return '/dashboard';
}

export async function resolvePostLoginPath(
  user: Pick<User, 'id' | 'app_metadata'> | null | undefined,
  role: UserRole,
): Promise<string> {
  if (isAdminUser(user)) {
    return '/dashboard';
  }

  if (role === 'tutor' && user) {
    const application = await getTutorApplication(user.id);
    if (!application || application.status === 'pending' || application.status === 'rejected') {
      return '/tutor/pending';
    }
  }

  return '/dashboard';
}
