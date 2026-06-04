import { ROLE_STORAGE_KEY } from '../constants/navigation';
import type { UserProfile, UserRole } from '../types';
import { isAdminUser } from './adminService';
import {
  assertResumeBucketReady,
  deleteTutorApplicationForUser,
  deleteUploadedResume,
  getTutorApplication,
  submitTutorApplication,
  uploadResume,
} from './tutorApplicationService';
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

  await ensureUserProfile();

  setStoredRole(isAdminUser(data.user) ? 'student' : role);

  return data;
}

function isExistingUserError(message: string): boolean {
  return /already registered|already exists|user already/i.test(message);
}

async function obtainTutorSignupSession(
  email: string,
  password: string,
  name: string,
) {
  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (!signUpResult.error) {
    return signUpResult.data;
  }

  if (!isExistingUserError(signUpResult.error.message)) {
    throw signUpResult.error;
  }

  const loginResult = await supabase.auth.signInWithPassword({ email, password });

  if (loginResult.error) {
    throw new Error(
      'An account with this email already exists in Supabase Auth. Log in instead, or delete that user under Authentication > Users and sign up again.',
    );
  }

  if (!loginResult.data.user) {
    throw new Error('Unable to continue tutor registration for this account.');
  }

  const existingApplication = await getTutorApplication(loginResult.data.user.id);

  if (existingApplication) {
    throw new Error(
      'This account already has a tutor application. Log in as Tutor to check your status.',
    );
  }

  return loginResult.data;
}

async function rollbackTutorSignup(userId: string, resumePath: string | null) {
  if (resumePath) {
    await deleteUploadedResume(resumePath);
  }

  try {
    await deleteTutorApplicationForUser(userId);
  } catch {
    // Row may not exist yet.
  }

  try {
    await supabase.from('users').delete().eq('user_id', userId);
  } catch {
    // Delete may be blocked by RLS; auth sign-out still runs below.
  }

  await supabase.auth.signOut();
}

function formatTutorSignupError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes('row-level security') || lower.includes('policy')) {
    return new Error(
      `Tutor signup was blocked by Supabase security (RLS). Most often this is the CV upload to the "resumes" storage bucket — run supabase-storage-resumes.sql in the SQL Editor. If the CV step succeeds, ensure insert policies exist on public.users and public.tutor_applications. Original error: ${message}`,
    );
  }

  if (lower.includes('foreign key') && lower.includes('users')) {
    return new Error(
      'Tutor signup failed because the user profile row is missing. Try again; the app should create public.users before tutor_applications.',
    );
  }

  return err instanceof Error ? err : new Error(message);
}

export async function signUpTutor(input: {
  email: string;
  password: string;
  name: string;
  linkedinUrl: string;
  experienceSummary: string;
  resumeFile: File;
}) {
  await assertResumeBucketReady();

  const data = await obtainTutorSignupSession(input.email, input.password, input.name);

  if (!data.user) {
    throw new Error('Account could not be created.');
  }

  if (!data.session) {
    throw new Error(
      'Tutor signup needs an active session. Confirm your email or disable email confirmation in Supabase, then try again.',
    );
  }

  const userId = data.user.id;
  let resumePath: string | null = null;

  try {
    resumePath = await uploadResume(userId, input.resumeFile);

    // users row must exist before tutor_applications (foreign key)
    await ensureUserProfile();

    await submitTutorApplication({
      userId,
      resumeFilePath: resumePath,
      linkedinUrl: input.linkedinUrl,
      experienceSummary: input.experienceSummary,
    });

    setStoredRole('tutor');

    return data;
  } catch (err) {
    await rollbackTutorSignup(userId, resumePath);
    throw formatTutorSignupError(err);
  }
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
