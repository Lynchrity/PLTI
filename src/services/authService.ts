import { ROLE_STORAGE_KEY } from '../constants/navigation';
import type { UserProfile, UserRole } from '../types';
import { assertTutorApproved, submitTutorApplication, uploadResume } from './tutorApplicationService';
import { supabase } from './supabase';

export type { UserProfile };

function profileFromAuthUser(user: {
  id: string;
  email?: string;
  user_metadata?: { name?: string; full_name?: string };
}): UserProfile {
  return {
    user_id: user.id,
    name:
      user.user_metadata?.name ??
      user.user_metadata?.full_name ??
      user.email?.split('@')[0] ??
      'Student',
    email: user.email ?? '',
    wallet_balance: 0,
  };
}

export async function ensureUserProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const fallbackProfile = profileFromAuthUser(user);

  const { data: existingProfile, error: selectError } = await supabase
    .from('users')
    .select('user_id, name, email, wallet_balance')
    .eq('user_id', user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from('users')
    .insert(fallbackProfile)
    .select('user_id, name, email, wallet_balance')
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertedProfile;
}

export async function signUp(
  email: string,
  password: string,
  name: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    throw error;
  }

  setStoredRole('student');

  if (data.session) {
    await ensureUserProfile();
  }

  return data;
}

export function setStoredRole(role: UserRole): void {
  localStorage.setItem(ROLE_STORAGE_KEY, role);
}

export function getStoredRole(): UserRole {
  const stored = localStorage.getItem(ROLE_STORAGE_KEY);
  return stored === 'tutor' ? 'tutor' : 'student';
}

export async function login(email: string, password: string, role: UserRole = 'student') {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const profile = await ensureUserProfile();

  if (role === 'tutor' && profile) {
    await assertTutorApproved(profile.user_id);
  }

  setStoredRole(role);

  return data;
}

export async function signUpTutor(input: {
  email: string;
  password: string;
  name: string;
  linkedinUrl: string;
  experienceSummary: string;
  resumeFile: File;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { name: input.name } },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Account could not be created.');
  }

  await ensureUserProfile();

  const resumePath = await uploadResume(data.user.id, input.resumeFile);

  await submitTutorApplication({
    userId: data.user.id,
    resumeFilePath: resumePath,
    linkedinUrl: input.linkedinUrl,
    experienceSummary: input.experienceSummary,
  });

  setStoredRole('tutor');

  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
