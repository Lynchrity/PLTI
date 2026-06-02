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
