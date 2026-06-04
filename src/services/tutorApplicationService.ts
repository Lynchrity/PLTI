import type { TutorApplication, TutorApplicationStatus } from '../types';
import { supabase } from './supabase';

export async function getTutorApplication(userId: string): Promise<TutorApplication | null> {
  const { data, error } = await supabase
    .from('tutor_applications')
    .select(
      'application_id, user_id, resume_file_path, linkedin_url, experience_summary, status, submitted_at, reviewed_at',
    )
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function submitTutorApplication(input: {
  userId: string;
  resumeFilePath: string;
  linkedinUrl: string;
  experienceSummary: string;
}): Promise<TutorApplication> {
  const { data, error } = await supabase
    .from('tutor_applications')
    .insert({
      user_id: input.userId,
      resume_file_path: input.resumeFilePath,
      linkedin_url: input.linkedinUrl,
      experience_summary: input.experienceSummary,
      status: 'pending' as TutorApplicationStatus,
      submitted_at: new Date().toISOString(),
    })
    .select(
      'application_id, user_id, resume_file_path, linkedin_url, experience_summary, status, submitted_at, reviewed_at',
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function assertResumeBucketReady(): Promise<void> {
  const { error } = await supabase.storage.from('resumes').list('', { limit: 1 });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes('bucket not found') || message.includes('not found')) {
      throw new Error(
        'Resume storage is not configured. Create a "resumes" bucket in Supabase Storage before tutor signup.',
      );
    }
    throw error;
  }
}

export async function deleteTutorApplicationForUser(userId: string): Promise<void> {
  const { error } = await supabase.from('tutor_applications').delete().eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function deleteUploadedResume(path: string): Promise<void> {
  const { error } = await supabase.storage.from('resumes').remove([path]);

  if (error) {
    console.warn('Failed to remove uploaded resume during rollback:', error.message);
  }
}

export async function uploadResume(userId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop() ?? 'pdf';
  const path = `${userId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from('resumes').upload(path, file, {
    upsert: true,
  });

  if (error) {
    throw new Error(
      error.message.includes('Bucket not found')
        ? 'Resume storage is not configured. Create a public "resumes" bucket in Supabase Storage.'
        : error.message,
    );
  }

  return path;
}

export async function assertTutorApproved(userId: string): Promise<void> {
  const application = await getTutorApplication(userId);

  if (!application) {
    throw new Error('No tutor application found for this account. Please register as a tutor first.');
  }

  if (application.status === 'pending') {
    throw new Error('Your tutor application is still pending approval.');
  }

  if (application.status === 'rejected') {
    throw new Error('Your tutor application was not approved. Contact support for details.');
  }
}

export interface TutorApplicationWithUser extends TutorApplication {
  applicant_name: string;
  applicant_email: string;
}

export interface ListTutorApplicationsOptions {
  status?: TutorApplicationStatus;
  sortAscending?: boolean;
  /** Local date in YYYY-MM-DD format; filters submissions on that calendar day. */
  submittedDate?: string;
}

export async function getResumeSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from('resumes').createSignedUrl(path, expiresIn);

  if (error) {
    throw error;
  }

  if (!data?.signedUrl) {
    throw new Error('Could not generate resume link.');
  }

  return data.signedUrl;
}

export async function listTutorApplications(
  statusOrOptions?: TutorApplicationStatus | ListTutorApplicationsOptions,
): Promise<TutorApplicationWithUser[]> {
  const options: ListTutorApplicationsOptions =
    typeof statusOrOptions === 'string' || statusOrOptions === undefined
      ? { status: statusOrOptions }
      : statusOrOptions;

  let query = supabase
    .from('tutor_applications')
    .select(
      'application_id, user_id, resume_file_path, linkedin_url, experience_summary, status, submitted_at, reviewed_at',
    )
    .order('submitted_at', { ascending: options.sortAscending ?? false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.submittedDate) {
    const start = new Date(`${options.submittedDate}T00:00:00`);
    const end = new Date(`${options.submittedDate}T23:59:59.999`);
    query = query.gte('submitted_at', start.toISOString()).lte('submitted_at', end.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const userIds = [...new Set((data ?? []).map((row) => row.user_id))];
  const userMap = new Map<string, { name: string; email: string }>();

  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, name, email')
      .in('user_id', userIds);

    if (usersError) {
      throw usersError;
    }

    for (const user of users ?? []) {
      userMap.set(user.user_id, { name: user.name, email: user.email });
    }
  }

  return (data ?? []).map((row) => {
    const user = userMap.get(row.user_id);
    return {
      ...row,
      applicant_name: user?.name ?? 'Unknown',
      applicant_email: user?.email ?? '',
    };
  });
}

export async function reviewTutorApplication(
  applicationId: string,
  status: Extract<TutorApplicationStatus, 'approved' | 'rejected'>,
): Promise<TutorApplication> {
  const { data, error } = await supabase
    .from('tutor_applications')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
    })
    .eq('application_id', applicationId)
    .select(
      'application_id, user_id, resume_file_path, linkedin_url, experience_summary, status, submitted_at, reviewed_at',
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}
