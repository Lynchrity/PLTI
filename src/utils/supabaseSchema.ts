interface SupabaseLikeError {
  code?: string;
  message?: string;
}

export function isMissingColumnError(error: unknown): boolean {
  const e = error as SupabaseLikeError;
  return e.code === '42703' || Boolean(e.message?.includes('does not exist'));
}

export const USER_PROFILE_BASE_COLUMNS = 'user_id, name, email, wallet_balance';

export const USER_PROFILE_EXTENDED_COLUMNS =
  `${USER_PROFILE_BASE_COLUMNS}, profile_picture_url, grade_level, strike_count, is_suspended`;

export const SERVICE_BASE_COLUMNS =
  'service_id, creator_id, type, title, duration_minutes, price, subject, topic, created_at';

export const SERVICE_EXTENDED_COLUMNS =
  `${SERVICE_BASE_COLUMNS}, description, banner_url, grade_level`;

export const SCHEDULE_BASE_COLUMNS =
  'schedule_id, service_id, transaction_id, initiator_id, participant_id, session_start, session_end, status, initiator_confirmed, participant_confirmed, created_at';

export const SCHEDULE_ATTENDANCE_COLUMNS =
  `${SCHEDULE_BASE_COLUMNS}, student_reports_tutor_present, tutor_reports_student_present, attendance_deadline, attendance_resolved, attendance_outcome`;

export const USER_STRIKE_COLUMNS = `${USER_PROFILE_BASE_COLUMNS}, strike_count, is_suspended`;
