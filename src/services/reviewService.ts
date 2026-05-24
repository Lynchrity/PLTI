import { supabase } from './supabase'

export interface TutorInfo {
  user_id: string
  name: string
  email: string
  badges?: string[]
}

export interface ReviewData {
  schedule_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment?: string
}

export interface TutorStatsData {
  tutor_id: string
  total_reviews: number
  average_rating: number
}

/**
 * Fetch tutor information for a given session
 */
export async function getTutorInfoForSession(scheduleId: string): Promise<TutorInfo | null> {
  try {
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('participant_id')
      .eq('schedule_id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      console.error('Error fetching schedule:', scheduleError)
      return null
    }

    const { data: tutor, error: tutorError } = await supabase
      .from('users')
      .select('user_id, name, email')
      .eq('user_id', schedule.participant_id)
      .single()

    if (tutorError || !tutor) {
      console.error('Error fetching tutor:', tutorError)
      return null
    }

    return {
      user_id: tutor.user_id,
      name: tutor.name,
      email: tutor.email,
      badges: [] // TODO: Add logic to fetch badges/certifications if available
    }
  } catch (error) {
    console.error('Unexpected error fetching tutor info:', error)
    return null
  }
}

/**
 * Get tutor statistics (review count and average rating)
 */
export async function getTutorStats(tutorId: string): Promise<TutorStatsData | null> {
  try {
    const { data: stats, error } = await supabase
      .from('tutor_stats')
      .select('tutor_id, total_reviews, average_rating')
      .eq('tutor_id', tutorId)
      .single()

    if (error) {
      console.warn('Error fetching tutor stats:', error)
      // Return null if no stats found (new tutor)
      return null
    }

    return stats
  } catch (error) {
    console.error('Unexpected error fetching tutor stats:', error)
    return null
  }
}

/**
 * Submit a review and rating for a completed session
 */
export async function submitReview(reviewData: ReviewData): Promise<boolean> {
  try {
    // Validate rating
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    const { error } = await supabase
      .from('reviews')
      .insert([
        {
          schedule_id: reviewData.schedule_id,
          reviewer_id: reviewData.reviewer_id,
          reviewee_id: reviewData.reviewee_id,
          rating: reviewData.rating,
          comment: reviewData.comment || null
        }
      ])

    if (error) {
      console.error('Error submitting review:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Unexpected error submitting review:', error)
    return false
  }
}

/**
 * Check if a review already exists for a given schedule
 */
export async function reviewExists(scheduleId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('review_id')
      .eq('schedule_id', scheduleId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no row found, which is expected
      console.warn('Error checking review existence:', error)
    }

    return !!data
  } catch (error) {
    console.error('Unexpected error checking review:', error)
    return false
  }
}
