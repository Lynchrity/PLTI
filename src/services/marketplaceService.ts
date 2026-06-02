import type { SearchFilters, ServiceWithTutor } from '../types';
import { supabase } from './supabase';

function isPeerService(type: string, price: number | null): boolean {
  return type.toLowerCase() === 'peer' || price === 0;
}

export async function searchServices(filters: SearchFilters): Promise<ServiceWithTutor[]> {
  let query = supabase
    .from('services')
    .select(
      'service_id, creator_id, type, title, duration_minutes, price, subject, topic, created_at',
    );

  if (filters.subject && filters.subject !== 'All subjects') {
    query = query.ilike('subject', `%${filters.subject}%`);
  }

  if (filters.type === 'peer') {
    query = query.or('type.ilike.peer,price.eq.0');
  } else if (filters.type === 'tutoring') {
    query = query.not('type', 'ilike', 'peer').neq('price', 0);
  }

  if (filters.duration) {
    const duration = Number(filters.duration);
    if (duration >= 90) {
      query = query.gte('duration_minutes', 90);
    } else {
      query = query.eq('duration_minutes', duration);
    }
  }

  if (filters.minPrice !== null) {
    query = query.gte('price', filters.minPrice);
  }

  if (filters.maxPrice !== null) {
    query = query.lte('price', filters.maxPrice);
  }

  const { data: services, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const serviceIds = (services ?? []).map((s) => s.service_id);
  const ratingsMap = await fetchAverageRatings(serviceIds);

  const creatorIds = [...new Set((services ?? []).map((s) => s.creator_id))];
  const nameMap = new Map<string, string>();

  if (creatorIds.length > 0) {
    const { data: tutors } = await supabase
      .from('users')
      .select('user_id, name')
      .in('user_id', creatorIds);

    for (const tutor of tutors ?? []) {
      nameMap.set(tutor.user_id, tutor.name);
    }
  }

  let results: ServiceWithTutor[] = (services ?? []).map((row) => {
    const rating = ratingsMap.get(row.service_id) ?? { avg: 0, count: 0 };

    return {
      service_id: row.service_id,
      creator_id: row.creator_id,
      type: row.type,
      title: row.title,
      duration_minutes: row.duration_minutes,
      price: row.price,
      subject: row.subject,
      topic: row.topic,
      created_at: row.created_at,
      tutor_name: nameMap.get(row.creator_id) ?? 'Tutor',
      avg_rating: rating.avg,
      review_count: rating.count,
    };
  });

  if (filters.query.trim()) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.subject?.toLowerCase().includes(q) ?? false) ||
        (s.topic?.toLowerCase().includes(q) ?? false) ||
        s.tutor_name.toLowerCase().includes(q),
    );
  }

  if (filters.gradeLevel && filters.gradeLevel !== 'All grades') {
    const grade = filters.gradeLevel.toLowerCase();
    results = results.filter(
      (s) =>
        s.topic?.toLowerCase().includes(grade) ||
        s.title.toLowerCase().includes(grade) ||
        s.subject?.toLowerCase().includes(grade),
    );
  }

  if (filters.minRating > 0) {
    results = results.filter((s) => s.avg_rating >= filters.minRating);
  }

  return results;
}

async function fetchAverageRatings(
  serviceIds: string[],
): Promise<Map<string, { avg: number; count: number }>> {
  const map = new Map<string, { avg: number; count: number }>();
  if (serviceIds.length === 0) {
    return map;
  }

  const { data: schedules } = await supabase
    .from('schedules')
    .select('schedule_id, service_id')
    .in('service_id', serviceIds);

  const scheduleIds = (schedules ?? []).map((s) => s.schedule_id);
  if (scheduleIds.length === 0) {
    return map;
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('schedule_id, rating')
    .in('schedule_id', scheduleIds);

  const scheduleToService = new Map(
    (schedules ?? []).map((s) => [s.schedule_id, s.service_id] as const),
  );

  const accum = new Map<string, { sum: number; count: number }>();

  for (const review of reviews ?? []) {
    const serviceId = scheduleToService.get(review.schedule_id);
    if (!serviceId) continue;
    const current = accum.get(serviceId) ?? { sum: 0, count: 0 };
    current.sum += review.rating;
    current.count += 1;
    accum.set(serviceId, current);
  }

  for (const [serviceId, { sum, count }] of accum) {
    map.set(serviceId, { avg: count > 0 ? sum / count : 0, count });
  }

  return map;
}

export function formatServicePrice(type: string, price: number | null): string {
  if (isPeerService(type, price)) {
    return 'Free';
  }
  return `From $${Number(price ?? 0).toFixed(0)}`;
}
