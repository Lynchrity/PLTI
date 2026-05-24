import { useState, useEffect } from 'react'
import { getTutorInfoForSession, submitReview, reviewExists, TutorInfo } from '../services/reviewService'
import '../styles/RatingPage.css'

interface RatingPageProps {
  scheduleId: string
  reviewerId: string
}

export default function RatingPage({ scheduleId, reviewerId }: RatingPageProps) {
  const [tutorInfo, setTutorInfo] = useState<TutorInfo | null>(null)
  const [rating, setRating] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [alreadyReviewed, setAlreadyReviewed] = useState<boolean>(false)

  useEffect(() => {
    loadTutorInfo()
  }, [scheduleId])

  const loadTutorInfo = async () => {
    setLoading(true)
    setError(null)

    // Check if review already exists
    const exists = await reviewExists(scheduleId)
    if (exists) {
      setAlreadyReviewed(true)
      setLoading(false)
      return
    }

    // Fetch tutor information
    const tutor = await getTutorInfoForSession(scheduleId)
    if (!tutor) {
      setError('Failed to load tutor information. Please try again.')
    } else {
      setTutorInfo(tutor)
    }

    setLoading(false)
  }

  const handleStarClick = (starValue: number) => {
    setRating(starValue)
  }

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tutorInfo || rating === 0) {
      setError('Please select a rating before submitting')
      return
    }

    setSubmitting(true)
    setError(null)

    const success = await submitReview({
      schedule_id: scheduleId,
      reviewer_id: reviewerId,
      reviewee_id: tutorInfo.user_id,
      rating: rating,
      comment: feedback.trim() || undefined
    })

    setSubmitting(false)

    if (success) {
      setSuccess(true)
      setRating(0)
      setFeedback('')
      // Optionally reset after a delay
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } else {
      setError('Failed to submit review. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="rating-page">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (alreadyReviewed) {
    return (
      <div className="rating-page">
        <div className="alert alert-info">
          <p>You have already reviewed this session.</p>
        </div>
      </div>
    )
  }

  if (!tutorInfo) {
    return (
      <div className="rating-page">
        <div className="alert alert-error">
          <p>{error || 'Failed to load tutor information.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rating-page">
      <div className="rating-container">
        <h1 className="rating-title">Session Completed!</h1>
        <h2 className="rating-subtitle">Please Rate Your Tutor</h2>

        {/* Tutor Info Section */}
        <div className="tutor-section">
          <div className="tutor-avatar">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${tutorInfo.user_id}`}
              alt={tutorInfo.name}
            />
          </div>
          <div className="tutor-info">
            <h3 className="tutor-name">{tutorInfo.name}</h3>
            <div className="tutor-badges">
              {tutorInfo.badges && tutorInfo.badges.length > 0 ? (
                tutorInfo.badges.map((badge, index) => (
                  <span key={index} className="badge badge-primary">
                    {badge}
                  </span>
                ))
              ) : (
                <>
                  <span className="badge badge-primary">Expert</span>
                  <span className="badge badge-secondary">Verified Peer</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="rating-form">
          {/* Star Rating */}
          <div className="rating-section">
            <h4 className="section-title">Rate Your Experience</h4>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${star <= rating ? 'active' : ''}`}
                  onClick={() => handleStarClick(star)}
                  aria-label={`Rate ${star} stars`}
                >
                  ★
                </button>
              ))}
              <span className="rating-display">{rating}/5</span>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="feedback-section">
            <h4 className="section-title">Optional Feedback</h4>
            <textarea
              className="feedback-textarea"
              placeholder="Share your feedback about the session..."
              value={feedback}
              onChange={handleFeedbackChange}
              maxLength={500}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              <p>{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="alert alert-success">
              <p>Thank you! Your review has been submitted.</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-button"
            disabled={submitting || rating === 0}
          >
            {submitting ? 'Submitting...' : 'Submit Rating & Feedback'}
          </button>
        </form>
      </div>
    </div>
  )
}
