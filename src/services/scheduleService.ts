import type { Schedule, ScheduleWithDetails } from '../types';
import { processSessionAttendance } from './attendanceService';
import { isPeerService, withAdminFee, adminFeeAmount } from '../utils/currency';
import { deductWalletBalance, refundWalletBalance } from './walletService';
import { supabase } from './supabase';
import {
  isMissingColumnError,
  SCHEDULE_ATTENDANCE_COLUMNS,
  SCHEDULE_BASE_COLUMNS,
} from '../utils/supabaseSchema';

async function resolveScheduleColumns(): Promise<string> {
  const probe = await supabase.from('schedules').select(SCHEDULE_ATTENDANCE_COLUMNS).limit(1);
  if (probe.error && isMissingColumnError(probe.error)) {
    return SCHEDULE_BASE_COLUMNS;
  }
  if (probe.error) {
    throw probe.error;
  }
  return SCHEDULE_ATTENDANCE_COLUMNS;
}

export async function processAllScheduleUpdates(userId: string): Promise<void> {
  await processExpiredUnacceptedRequests(userId);
  await processSessionAttendance(userId);
}

export async function getUserSchedules(userId: string): Promise<Schedule[]> {
  const columns = await resolveScheduleColumns();
  const { data, error } = await supabase
    .from('schedules')
    .select(columns)
    .or(`initiator_id.eq.${userId},participant_id.eq.${userId}`)
    .order('session_start', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as Schedule[];
}

export async function getScheduleById(scheduleId: string): Promise<ScheduleWithDetails | null> {
  const columns = await resolveScheduleColumns();
  const { data, error } = await supabase
    .from('schedules')
    .select(columns)
    .eq('schedule_id', scheduleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as unknown as Schedule;

  const { data: service } = await supabase
    .from('services')
    .select('title, subject, topic, duration_minutes, price')
    .eq('service_id', row.service_id)
    .maybeSingle();

  const { data: student } = await supabase
    .from('users')
    .select('name')
    .eq('user_id', row.initiator_id)
    .maybeSingle();

  const { data: tutor } = await supabase
    .from('users')
    .select('name')
    .eq('user_id', row.participant_id)
    .maybeSingle();

  return {
    ...row,
    service_title: service?.title,
    subject: service?.subject,
    topic: service?.topic,
    duration_minutes: service?.duration_minutes,
    base_price: service?.price ?? null,
    student_name: student?.name ?? 'Student',
    tutor_name: tutor?.name ?? 'Tutor',
    other_party_name: undefined,
  };
}

export async function getScheduleWithParties(
  scheduleId: string,
  currentUserId: string,
): Promise<ScheduleWithDetails | null> {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) return null;

  const isStudent = schedule.initiator_id === currentUserId;
  return {
    ...schedule,
    other_party_name: isStudent ? schedule.tutor_name : schedule.student_name,
  };
}

export async function getUpcomingSchedule(
  userId: string,
  role: 'student' | 'tutor',
): Promise<ScheduleWithDetails | null> {
  const now = new Date().toISOString();
  const column = role === 'tutor' ? 'participant_id' : 'initiator_id';
  const columns = await resolveScheduleColumns();

  const { data, error } = await supabase
    .from('schedules')
    .select(columns)
    .eq(column, userId)
    .gte('session_start', now)
    .in('status', ['scheduled', 'confirmed'])
    .order('session_start', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return getScheduleById((data as unknown as Schedule).schedule_id);
}

export function isPeerSchedule(serviceType: string | undefined, price: number | null | undefined): boolean {
  return isPeerService(serviceType ?? '', price ?? null);
}

export async function bookService(input: {
  serviceId: string;
  initiatorId: string;
  participantId: string;
  sessionStart: string;
  sessionEnd: string;
  baseAmount: number;
}): Promise<{ schedule: Schedule; remainingBalance: number }> {
  const totalAmount = input.baseAmount > 0 ? withAdminFee(input.baseAmount) : 0;
  const feeAmount = input.baseAmount > 0 ? adminFeeAmount(input.baseAmount) : 0;

  const remainingBalance = await deductWalletBalance(input.initiatorId, totalAmount);

  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      payer_id: input.initiatorId,
      total_amount: totalAmount,
      payment_status: 'completed',
    })
    .select('transaction_id')
    .single();

  if (txError) {
    throw txError;
  }

  const columns = await resolveScheduleColumns();
  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .insert({
      service_id: input.serviceId,
      transaction_id: transaction.transaction_id,
      initiator_id: input.initiatorId,
      participant_id: input.participantId,
      session_start: input.sessionStart,
      session_end: input.sessionEnd,
      status: 'scheduled',
      initiator_confirmed: true,
      participant_confirmed: false,
    })
    .select(columns)
    .single();

  if (scheduleError) {
    throw scheduleError;
  }

  const booked = schedule as unknown as Schedule;

  const detailPayload: Record<string, unknown> = {
    transaction_id: transaction.transaction_id,
    schedule_id: booked.schedule_id,
    unit_price_at_purchase: input.baseAmount,
  };

  const { error: detailError } = await supabase.from('transaction_details').insert({
    ...detailPayload,
    admin_fee_at_purchase: feeAmount,
  });

  if (detailError && isMissingColumnError(detailError)) {
    await supabase.from('transaction_details').insert(detailPayload);
  } else if (detailError) {
    throw detailError;
  }

  return { schedule: booked, remainingBalance };
}

export interface ScheduleRequestWithDetails extends Schedule {
  service_title?: string;
  student_name?: string;
}

export async function getPendingRequestsForTutor(
  tutorId: string,
): Promise<ScheduleRequestWithDetails[]> {
  const columns = await resolveScheduleColumns();
  const { data, error } = await supabase
    .from('schedules')
    .select(columns)
    .eq('participant_id', tutorId)
    .eq('status', 'scheduled')
    .eq('participant_confirmed', false)
    .order('session_start', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as Schedule[];
  if (rows.length === 0) {
    return [];
  }

  const serviceIds = [...new Set(rows.map((r) => r.service_id))];
  const studentIds = [...new Set(rows.map((r) => r.initiator_id))];

  const [{ data: services }, { data: students }] = await Promise.all([
    supabase.from('services').select('service_id, title').in('service_id', serviceIds),
    supabase.from('users').select('user_id, name').in('user_id', studentIds),
  ]);

  const titleMap = new Map((services ?? []).map((s) => [s.service_id, s.title]));
  const nameMap = new Map((students ?? []).map((s) => [s.user_id, s.name]));

  return rows.map((row) => ({
    ...row,
    service_title: titleMap.get(row.service_id),
    student_name: nameMap.get(row.initiator_id) ?? 'Student',
  }));
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

export async function processExpiredUnacceptedRequests(userId: string): Promise<number> {
  const now = new Date().toISOString();
  const { data: expired, error } = await supabase
    .from('schedules')
    .select(
      'schedule_id, transaction_id, initiator_id, participant_id, session_start, session_end, status, participant_confirmed',
    )
    .or(`initiator_id.eq.${userId},participant_id.eq.${userId}`)
    .eq('status', 'scheduled')
    .eq('participant_confirmed', false)
    .lt('session_start', now);

  if (error || !expired?.length) {
    return 0;
  }

  let count = 0;
  for (const row of expired) {
    await refundSchedulePayment(row.transaction_id);
    const { error: updateError } = await supabase
      .from('schedules')
      .update({ status: 'cancelled' })
      .eq('schedule_id', row.schedule_id);

    if (!updateError) count += 1;
  }

  return count;
}

export async function acceptScheduleRequest(scheduleId: string): Promise<Schedule> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error('You must be signed in.');
  }

  const columns = await resolveScheduleColumns();
  const { data, error } = await supabase
    .from('schedules')
    .update({
      participant_confirmed: true,
      status: 'confirmed',
    })
    .eq('schedule_id', scheduleId)
    .eq('participant_id', user.id)
    .select(columns)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Request not found or you are not the tutor for this session.');
  }

  return data as unknown as Schedule;
}

export async function rejectScheduleRequest(scheduleId: string): Promise<Schedule> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error('You must be signed in.');
  }

  const { data: existing } = await supabase
    .from('schedules')
    .select('transaction_id')
    .eq('schedule_id', scheduleId)
    .eq('participant_id', user.id)
    .maybeSingle();

  const columns = await resolveScheduleColumns();
  const { data, error } = await supabase
    .from('schedules')
    .update({ status: 'cancelled' })
    .eq('schedule_id', scheduleId)
    .eq('participant_id', user.id)
    .select(columns)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Request not found or you are not the tutor for this session.');
  }

  await refundSchedulePayment(existing?.transaction_id ?? (data as unknown as Schedule).transaction_id);
  return data as unknown as Schedule;
}

export async function cancelScheduleRequest(scheduleId: string): Promise<Schedule> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error('You must be signed in.');
  }

  const { data: existing } = await supabase
    .from('schedules')
    .select('transaction_id, status, participant_confirmed')
    .eq('schedule_id', scheduleId)
    .eq('initiator_id', user.id)
    .maybeSingle();

  if (!existing) {
    throw new Error('Request not found or you are not the student for this session.');
  }

  if (existing.status !== 'scheduled' || existing.participant_confirmed) {
    throw new Error('Only pending requests can be cancelled.');
  }

  const columns = await resolveScheduleColumns();
  const { data, error } = await supabase
    .from('schedules')
    .update({ status: 'cancelled' })
    .eq('schedule_id', scheduleId)
    .eq('initiator_id', user.id)
    .select(columns)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Could not cancel this request.');
  }

  await refundSchedulePayment(existing.transaction_id);
  return data as unknown as Schedule;
}
