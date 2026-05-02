export type TopicStatus = 'not_started' | 'in_progress' | 'mastered';

export interface Topic {
  id: string;
  title: string;
  order: number;
  pdf_url?: string;
  status: TopicStatus;
  created_at: string;
}

export type TaskType = 'topic' | 'review';

export interface StudyTask {
  id: string;
  topic_id: string;
  topic_title: string;
  date: string;
  type: TaskType;
  completed: boolean;
}

export interface Note {
  id: string;
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
