import { ACCOUNT_ROLES_KEY, ROLE_STORAGE_KEY } from '../constants/navigation';

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

import {

  isMissingColumnError,

  USER_PROFILE_BASE_COLUMNS,

  USER_PROFILE_EXTENDED_COLUMNS,

} from '../utils/supabaseSchema';



export type { UserProfile };



export const INVALID_LOGIN_CREDENTIALS = 'Invalid login credentials.';



type RoleMap = Record<string, UserRole[]>;



function readRoleMap(): RoleMap {

  try {

    const raw = localStorage.getItem(ACCOUNT_ROLES_KEY);

    return raw ? (JSON.parse(raw) as RoleMap) : {};

  } catch {

    return {};

  }

}



function writeRoleMap(map: RoleMap): void {

  localStorage.setItem(ACCOUNT_ROLES_KEY, JSON.stringify(map));

}



function setEnabledRoles(userId: string, roles: UserRole[]): void {

  const map = readRoleMap();

  map[userId] = [...new Set(roles)];

  writeRoleMap(map);

}



function addEnabledRole(userId: string, role: UserRole): void {

  const map = readRoleMap();

  const current = new Set(map[userId] ?? ['student']);

  current.add(role);

  map[userId] = [...current];

  writeRoleMap(map);

}



function getEnabledRoles(userId: string): UserRole[] {

  const stored = readRoleMap()[userId];

  if (stored?.length) {

    return stored;

  }

  return ['student'];

}



async function syncRolesFromDatabase(userId: string): Promise<UserRole[]> {

  const roles = new Set(getEnabledRoles(userId));

  const application = await getTutorApplication(userId);

  if (application) {

    roles.add('tutor');

    setEnabledRoles(userId, [...roles]);

  }

  return [...roles];

}



async function fetchUserRow(userId: string) {

  const extended = await supabase

    .from('users')

    .select(USER_PROFILE_EXTENDED_COLUMNS)

    .eq('user_id', userId)

    .maybeSingle();



  if (!extended.error) {

    return extended;

  }



  if (isMissingColumnError(extended.error)) {

    return supabase

      .from('users')

      .select(USER_PROFILE_BASE_COLUMNS)

      .eq('user_id', userId)

      .maybeSingle();

  }



  return extended;

}



async function insertUserRow(profile: UserProfile) {

  const extended = await supabase

    .from('users')

    .insert(profile)

    .select(USER_PROFILE_EXTENDED_COLUMNS)

    .single();



  if (!extended.error) {

    return extended;

  }



  if (isMissingColumnError(extended.error)) {

    const { user_id, name, email, wallet_balance } = profile;

    return supabase

      .from('users')

      .insert({ user_id, name, email, wallet_balance })

      .select(USER_PROFILE_BASE_COLUMNS)

      .single();

  }



  return extended;

}



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



  const { data: existingProfile, error: selectError } = await fetchUserRow(user.id);



  if (selectError) {

    throw selectError;

  }



  if (existingProfile) {

    return existingProfile;

  }



  const { data: insertedProfile, error: insertError } = await insertUserRow(fallbackProfile);



  if (insertError) {

    throw insertError;

  }



  return insertedProfile;

}



function isExistingUserError(message: string): boolean {

  return /already registered|already exists|user already/i.test(message);

}



async function obtainStudentSignupSession(email: string, password: string, name: string) {

  const signUpResult = await supabase.auth.signUp({

    email,

    password,

    options: { data: { name } },

  });



  if (!signUpResult.error) {

    if (signUpResult.data.user) {

      setEnabledRoles(signUpResult.data.user.id, ['student']);

    }

    return signUpResult.data;

  }



  if (!isExistingUserError(signUpResult.error.message)) {

    throw signUpResult.error;

  }



  const loginResult = await supabase.auth.signInWithPassword({ email, password });



  if (loginResult.error || !loginResult.data.user) {

    throw new Error(INVALID_LOGIN_CREDENTIALS);

  }



  addEnabledRole(loginResult.data.user.id, 'student');

  return loginResult.data;

}



export async function signUp(email: string, password: string, name: string) {

  const data = await obtainStudentSignupSession(email, password, name);



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

    throw new Error(INVALID_LOGIN_CREDENTIALS);

  }



  if (!data.user) {

    throw new Error(INVALID_LOGIN_CREDENTIALS);

  }



  if (!isAdminUser(data.user)) {

    await assertLoginRoleAllowed(data.user.id, role);

  }



  await ensureUserProfile();



  setStoredRole(isAdminUser(data.user) ? 'student' : role);



  return data;

}



async function assertLoginRoleAllowed(userId: string, selectedRole: UserRole): Promise<void> {

  const roles = await syncRolesFromDatabase(userId);



  if (selectedRole === 'student' && !roles.includes('student')) {

    await supabase.auth.signOut();

    throw new Error(INVALID_LOGIN_CREDENTIALS);

  }



  if (selectedRole === 'tutor' && !roles.includes('tutor')) {

    await supabase.auth.signOut();

    throw new Error(INVALID_LOGIN_CREDENTIALS);

  }

}



async function obtainTutorSignupSession(email: string, password: string, name: string) {

  const signUpResult = await supabase.auth.signUp({

    email,

    password,

    options: { data: { name } },

  });



  if (!signUpResult.error) {

    if (signUpResult.data.user) {

      setEnabledRoles(signUpResult.data.user.id, ['tutor']);

    }

    return signUpResult.data;

  }



  if (!isExistingUserError(signUpResult.error.message)) {

    throw signUpResult.error;

  }



  const loginResult = await supabase.auth.signInWithPassword({ email, password });



  if (loginResult.error || !loginResult.data.user) {

    throw new Error(INVALID_LOGIN_CREDENTIALS);

  }



  addEnabledRole(loginResult.data.user.id, 'tutor');

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

  const existingApplication = await getTutorApplication(userId);



  if (existingApplication) {

    setStoredRole('tutor');

    return data;

  }



  let resumePath: string | null = null;



  try {

    resumePath = await uploadResume(userId, input.resumeFile);



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


