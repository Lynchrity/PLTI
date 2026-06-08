interface SupabaseLikeError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (!err) {
    return fallback;
  }

  const e = err as SupabaseLikeError;
  const message = err instanceof Error ? err.message : e.message;

  if (e.code === '23503') {
    return 'This item cannot be deleted because it is linked to existing bookings or records.';
  }

  if (e.code === 'PGRST116') {
    return 'No matching record found, or you do not have permission to update it. Run supabase-schema-updates.sql if accept/reject/cancel fails.';
  }

  if (e.code === '23514' || message?.includes('schedules_status_check')) {
    return 'Invalid session status for this action. Run supabase-fix-schedule-status.sql in the Supabase SQL Editor.';
  }

  if (e.code === '42501' || message?.toLowerCase().includes('row-level security')) {
    return 'Permission denied. For profile photos run supabase-storage-media.sql; for other actions run supabase-policy-updates.sql in the Supabase SQL Editor.';
  }

  if (message?.trim()) {
    return message;
  }

  return fallback;
}
