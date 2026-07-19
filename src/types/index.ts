export type TopicStatus = 'not_started' | 'in_progress' | 'mastered';

export interface Topic {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  description: string | null;
  order_index: number;
  pdf_url: string | null;
  status: TopicStatus;
  // Unused until spaced repetition lands; the columns already exist.
  last_review_date: string | null;
  next_review_date: string | null;
  review_interval: number | null;
  ease_factor: number | null;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  topic_id: string;
  content: string;
  updated_at: string;
}

export interface UserProgress {
  percentage_completed: number;
  study_streak: number;
  total_topics: number;
  mastered_topics: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url?: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  exam_date: string | null; // nullable in the DB; the countdown must handle it
  created_at: string;
}
