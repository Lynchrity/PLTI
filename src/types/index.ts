export type UserRole = 'student' | 'tutor';

export type TutorApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  wallet_balance: number;
}

export interface TutorApplication {
  application_id: string;
  user_id: string;
  resume_file_path: string | null;
  linkedin_url: string | null;
  experience_summary: string | null;
  status: TutorApplicationStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
}

export interface Service {
  service_id: string;
  creator_id: string;
  type: string;
  title: string;
  duration_minutes: number | null;
  price: number | null;
  subject: string | null;
  topic: string | null;
  created_at: string | null;
}

export interface ServiceWithTutor extends Service {
  tutor_name: string;
  avg_rating: number;
  review_count: number;
}

export interface Schedule {
  schedule_id: string;
  service_id: string;
  transaction_id: string | null;
  initiator_id: string;
  participant_id: string;
  session_start: string;
  session_end: string;
  status: string;
  initiator_confirmed: boolean | null;
  participant_confirmed: boolean | null;
  created_at: string | null;
}

export interface ScheduleWithDetails extends Schedule {
  service_title?: string;
  subject?: string | null;
  topic?: string | null;
  other_party_name?: string;
  duration_minutes?: number | null;
}

export interface Review {
  review_id: string;
  schedule_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
}

export interface ChatRoom {
  room_id: string;
  user1_id: string;
  user2_id: string;
  expires_at: string | null;
  created_at: string | null;
}

export interface ChatMessage {
  message_id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string | null;
}

export interface ChatRoomWithPeer extends ChatRoom {
  peer_id: string;
  peer_name: string;
  last_message?: string;
}

export interface Transaction {
  transaction_id: string;
  payer_id: string;
  total_amount: number;
  payment_status: string;
  created_at: string | null;
}

export interface SearchFilters {
  query: string;
  subject: string;
  gradeLevel: string;
  minRating: number;
  maxPrice: number | null;
  minPrice: number | null;
  duration: number | null;
  type: string;
}

export interface ProfileExtras {
  subjects_good_at: string;
  subjects_need_help: string;
}
