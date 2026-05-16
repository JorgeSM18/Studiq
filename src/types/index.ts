export type TopicStatus = 'not_started' | 'in_progress' | 'mastered';

export interface Topic {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  order: number;
  pdf_url?: string;
  status: TopicStatus;
  // SRS Fields
  last_review_date?: string;
  next_review_date?: string;
  review_interval?: number;
  ease_factor?: number;
  created_at: string;
}

export type TaskType = 'topic' | 'review';

export interface StudyTask {
  id: string;
  user_id: string;
  subject_id: string; // Added for performance
  topic_id: string;
  topic_title: string;
  date: string;
  type: TaskType;
  completed: boolean;
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
  exam_date: string;
  created_at: string;
}
