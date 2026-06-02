import type { Schedule, ScheduleWithDetails } from '../types';
import { supabase } from './supabase';

export async function getUserSchedules(userId: string): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select(
      'schedule_id, service_id, transaction_id, initiator_id, participant_id, session_start, session_end, status, initiator_confirmed, participant_confirmed, created_at',
    )
    .or(`initiator_id.eq.${userId},participant_id.eq.${userId}`)
    .order('session_start', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getScheduleById(scheduleId: string): Promise<ScheduleWithDetails | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select(
      'schedule_id, service_id, transaction_id, initiator_id, participant_id, session_start, session_end, status, initiator_confirmed, participant_confirmed, created_at',
    )
    .eq('schedule_id', scheduleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const { data: service } = await supabase
    .from('services')
    .select('title, subject, topic, duration_minutes')
    .eq('service_id', data.service_id)
    .maybeSingle();

  const { data: initiator } = await supabase
    .from('users')
    .select('name')
    .eq('user_id', data.initiator_id)
    .maybeSingle();

  const { data: participant } = await supabase
    .from('users')
    .select('name')
    .eq('user_id', data.participant_id)
    .maybeSingle();

  return {
    ...data,
    service_title: service?.title,
    subject: service?.subject,
    topic: service?.topic,
    duration_minutes: service?.duration_minutes,
    other_party_name: `${initiator?.name ?? 'Student'} / ${participant?.name ?? 'Tutor'}`,
  };
}

export async function getScheduleWithParties(
  scheduleId: string,
  currentUserId: string,
): Promise<ScheduleWithDetails | null> {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) return null;

  const otherId =
    schedule.initiator_id === currentUserId
      ? schedule.participant_id
      : schedule.initiator_id;

  const { data: otherUser } = await supabase
    .from('users')
    .select('name')
    .eq('user_id', otherId)
    .maybeSingle();

  return {
    ...schedule,
    other_party_name: otherUser?.name ?? 'Participant',
  };
}

export async function getUpcomingSchedule(
  userId: string,
  role: 'student' | 'tutor',
): Promise<ScheduleWithDetails | null> {
  const now = new Date().toISOString();
  const column = role === 'tutor' ? 'participant_id' : 'initiator_id';

  const { data, error } = await supabase
    .from('schedules')
    .select(
      'schedule_id, service_id, transaction_id, initiator_id, participant_id, session_start, session_end, status, initiator_confirmed, participant_confirmed, created_at',
    )
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

  return getScheduleById(data.schedule_id);
}

export function isPeerSchedule(serviceType: string | undefined, price: number | null | undefined): boolean {
  return serviceType?.toLowerCase() === 'peer' || price === 0;
}

export async function bookService(input: {
  serviceId: string;
  initiatorId: string;
  participantId: string;
  sessionStart: string;
  sessionEnd: string;
  totalAmount: number;
}): Promise<Schedule> {
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      payer_id: input.initiatorId,
      total_amount: input.totalAmount,
      payment_status: input.totalAmount === 0 ? 'completed' : 'mock_paid',
    })
    .select('transaction_id')
    .single();

  if (txError) {
    throw txError;
  }

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
    .select(
      'schedule_id, service_id, transaction_id, initiator_id, participant_id, session_start, session_end, status, initiator_confirmed, participant_confirmed, created_at',
    )
    .single();

  if (scheduleError) {
    throw scheduleError;
  }

  const { error: detailError } = await supabase.from('transaction_details').insert({
    transaction_id: transaction.transaction_id,
    schedule_id: schedule.schedule_id,
    unit_price_at_purchase: input.totalAmount,
  });

  if (detailError) {
    throw detailError;
  }

  return schedule;
}
