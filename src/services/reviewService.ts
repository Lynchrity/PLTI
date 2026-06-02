import type { Review } from '../types';
import { supabase } from './supabase';

export async function getUserReviews(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('review_id, schedule_id, reviewer_id, reviewee_id, rating, comment, created_at')
    .or(`reviewer_id.eq.${userId},reviewee_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
