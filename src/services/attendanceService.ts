import type { Schedule } from '../types';
import { parseAppTimestamp } from '../utils/timezone';
import { isMissingColumnError } from '../utils/supabaseSchema';
import { refundWalletBalance } from './walletService';
import { supabase } from './supabase';

export const ATTENDANCE_WINDOW_MS = 15 * 60 * 1000;
export const MAX_TUTOR_STRIKES = 3;
export const TUTOR_STRIKE_PENALTY_RATE = 0.15;

export type AttendanceOutcome =
  | 'both_present'
  | 'student_no_show'
  | 'tutor_no_show'
  | 'both_no_show';

export function formatAttendanceOutcome(outcome: string | null | undefined): string {
  switch (outcome) {
    case 'both_present':
      return 'Completed — both attended';
    case 'student_no_show':
      return 'Student no-show — tutor paid';
    case 'tutor_no_show':
      return 'Tutor no-show — student refunded';
    case 'both_no_show':
      return 'Both no-show — student refunded';
    default:
      return 'Pending attendance';
  }
}

export function formatScheduleStatus(status: string, schedule?: Schedule): string {
  if (schedule?.attendance_resolved && schedule.attendance_outcome) {
    return formatAttendanceOutcome(schedule.attendance_outcome);
  }
  if (status === 'ongoing') return 'Ongoing — check attendance';
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'scheduled') return 'Awaiting tutor acceptance';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled' || status === 'canceled') return 'Cancelled';
  return status;
}

export function isAttendanceEligible(schedule: Schedule): boolean {
  if (schedule.attendance_resolved) return false;
  if (schedule.status !== 'confirmed' && schedule.status !== 'ongoing') return false;
  if (!schedule.participant_confirmed) return false;

  const start = parseAppTimestamp(schedule.session_start);
  if (!start) return false;

  return start.getTime() <= Date.now();
}

export function isInAttendanceWindow(schedule: Schedule): boolean {
  if (!isAttendanceEligible(schedule)) return false;

  const deadline = schedule.attendance_deadline
    ? parseAppTimestamp(schedule.attendance_deadline)
    : null;

  if (deadline) {
    return Date.now() <= deadline.getTime();
  }

  const start = parseAppTimestamp(schedule.session_start);
  if (!start) return false;
  return Date.now() <= start.getTime() + ATTENDANCE_WINDOW_MS;
}

export function isOngoingSession(schedule: Schedule): boolean {
  return isAttendanceEligible(schedule) && !schedule.attendance_resolved;
}

function resolveOutcome(
  studentReportsTutorPresent: boolean | null,
  tutorReportsStudentPresent: boolean | null,
): AttendanceOutcome {
  const tutorPresent = studentReportsTutorPresent === true;
  const studentPresent = tutorReportsStudentPresent === true;

  if (tutorPresent && studentPresent) return 'both_present';
  if (!tutorPresent && studentPresent) return 'tutor_no_show';
  if (tutorPresent && !studentPresent) return 'student_no_show';
  return 'both_no_show';
}

async function refundSchedulePayment(transactionId: string | null): Promise<void> {
  if (!transactionId) return;

  const { data: tx, error } = await supabase
    .from('transactions')
    .select('payer_id, total_amount, payment_status')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (error || !tx) return;
  if (Number(tx.total_amount) <= 0 || tx.payment_status === 'refunded') return;

  await refundWalletBalance(tx.payer_id, Number(tx.total_amount));
  await supabase
    .from('transactions')
    .update({ payment_status: 'refunded' })
    .eq('transaction_id', transactionId);
}

async function getSessionBasePrice(schedule: Schedule): Promise<number> {
  const { data: detail } = await supabase
    .from('transaction_details')
    .select('unit_price_at_purchase, admin_fee_at_purchase')
    .eq('schedule_id', schedule.schedule_id)
    .maybeSingle();

  if (detail?.unit_price_at_purchase != null) {
    return Number(detail.unit_price_at_purchase);
  }

  const { data: service } = await supabase
    .from('services')
    .select('price')
    .eq('service_id', schedule.service_id)
    .maybeSingle();

  return Number(service?.price ?? 0);
}

async function payTutor(tutorId: string, basePrice: number): Promise<void> {
  if (basePrice <= 0) return;
  await refundWalletBalance(tutorId, basePrice);
}

async function applyTutorStrike(tutorId: string, basePrice: number): Promise<void> {
  const { data: tutor, error } = await supabase
    .from('users')
    .select('strike_count, wallet_balance, is_suspended')
    .eq('user_id', tutorId)
    .maybeSingle();

  if (error || !tutor) return;

  const nextStrikes = Number(tutor.strike_count ?? 0) + 1;
  const penalty = Math.round(basePrice * TUTOR_STRIKE_PENALTY_RATE);
  const nextBalance = Number(tutor.wallet_balance ?? 0) - penalty;

  await supabase
    .from('users')
    .update({
      strike_count: nextStrikes,
      wallet_balance: nextBalance,
      is_suspended: nextStrikes >= MAX_TUTOR_STRIKES,
    })
    .eq('user_id', tutorId);
}

async function finalizeAttendance(
  schedule: Schedule,
  outcome: AttendanceOutcome,
): Promise<void> {
  const basePrice = await getSessionBasePrice(schedule);
  const tutorId = schedule.participant_id;

  if (outcome === 'both_present' || outcome === 'student_no_show') {
    await payTutor(tutorId, basePrice);
  } else {
    await refundSchedulePayment(schedule.transaction_id);
  }

  if (outcome === 'tutor_no_show') {
    await applyTutorStrike(tutorId, basePrice);
  }

  await supabase
    .from('schedules')
    .update({
      attendance_resolved: true,
      attendance_outcome: outcome,
      status: 'completed',
    })
    .eq('schedule_id', schedule.schedule_id);
}

async function maybeStartOngoingSession(schedule: Schedule): Promise<Schedule> {
  if (schedule.status !== 'confirmed' || schedule.attendance_resolved) {
    return schedule;
  }

  const start = parseAppTimestamp(schedule.session_start);
  if (!start || start.getTime() > Date.now()) {
    return schedule;
  }

  const deadline = new Date(start.getTime() + ATTENDANCE_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from('schedules')
    .update({
      status: 'ongoing',
      attendance_deadline: schedule.attendance_deadline ?? deadline,
    })
    .eq('schedule_id', schedule.schedule_id)
    .select('*')
    .maybeSingle();

  if (error && isMissingColumnError(error)) {
    return schedule;
  }

  return (data as Schedule) ?? schedule;
}

async function maybeResolveAttendance(schedule: Schedule): Promise<void> {
  if (schedule.attendance_resolved) return;
  if (schedule.status !== 'ongoing' && schedule.status !== 'confirmed') return;

  const deadline = schedule.attendance_deadline
    ? parseAppTimestamp(schedule.attendance_deadline)?.getTime()
    : parseAppTimestamp(schedule.session_start)?.getTime() != null
      ? parseAppTimestamp(schedule.session_start)!.getTime() + ATTENDANCE_WINDOW_MS
      : null;

  const bothAnswered =
    schedule.student_reports_tutor_present !== null &&
    schedule.student_reports_tutor_present !== undefined &&
    schedule.tutor_reports_student_present !== null &&
    schedule.tutor_reports_student_present !== undefined;

  const pastDeadline = deadline != null && Date.now() > deadline;

  if (!bothAnswered && !pastDeadline) {
    return;
  }

  const outcome = resolveOutcome(
    schedule.student_reports_tutor_present ?? null,
    schedule.tutor_reports_student_present ?? null,
  );

  await finalizeAttendance(schedule, outcome);
}

export async function processSessionAttendance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .or(`initiator_id.eq.${userId},participant_id.eq.${userId}`)
    .in('status', ['confirmed', 'ongoing'])
    .eq('attendance_resolved', false);

  if (error) {
    if (isMissingColumnError(error)) {
      return 0;
    }
    throw error;
  }

  let resolved = 0;
  for (const row of data ?? []) {
    const schedule = row as Schedule;
    const started = await maybeStartOngoingSession(schedule);
    await maybeResolveAttendance(started);
    if (started.attendance_resolved) {
      resolved += 1;
    }
  }

  return resolved;
}

export async function submitStudentAttendance(
  scheduleId: string,
  tutorPresent: boolean,
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in.');
  }

  const { data: schedule, error } = await supabase
    .from('schedules')
    .update({ student_reports_tutor_present: tutorPresent })
    .eq('schedule_id', scheduleId)
    .eq('initiator_id', user.id)
    .in('status', ['confirmed', 'ongoing'])
    .eq('attendance_resolved', false)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!schedule) {
    throw new Error('Session not found or attendance is closed.');
  }

  await maybeResolveAttendance(schedule as Schedule);
}

export async function submitTutorAttendance(
  scheduleId: string,
  studentPresent: boolean,
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in.');
  }

  const { data: schedule, error } = await supabase
    .from('schedules')
    .update({ tutor_reports_student_present: studentPresent })
    .eq('schedule_id', scheduleId)
    .eq('participant_id', user.id)
    .in('status', ['confirmed', 'ongoing'])
    .eq('attendance_resolved', false)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!schedule) {
    throw new Error('Session not found or attendance is closed.');
  }

  await maybeResolveAttendance(schedule as Schedule);
}

export function filterOngoingSessions(schedules: Schedule[]): Schedule[] {
  return schedules.filter(isOngoingSession);
}

export async function assertTutorNotSuspended(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('users')
    .select('is_suspended, strike_count')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && isMissingColumnError(error)) {
    return;
  }

  if (error) {
    throw error;
  }

  if (data?.is_suspended) {
    throw new Error(
      `Your tutor account is suspended after ${MAX_TUTOR_STRIKES} no-shows. Contact support to appeal.`,
    );
  }
}