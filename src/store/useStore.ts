import { create } from 'zustand';
import { Topic, StudyTask, UserProgress } from '../types';
import { supabaseService } from '../services/supabaseService';

interface AppState {
  topics: Topic[];
  todayTasks: StudyTask[];
  progress: UserProgress;
  isLoading: boolean;
  
  // Actions
  fetchInitialData: () => Promise<void>;
  updateTask: (id: string, completed: boolean) => Promise<void>;
  updateTopicStatus: (id: string, status: Topic['status']) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  topics: [],
  todayTasks: [],
  progress: {
    percentage_completed: 0,
    study_streak: 0,
    total_topics: 0,
    mastered_topics: 0
  },
  isLoading: false,

  fetchInitialData: async () => {
    set({ isLoading: true });
    try {
      const [topics, tasks] = await Promise.all([
        supabaseService.getTopics(),
        supabaseService.getTodayTasks()
      ]);

      const masteredCount = topics.filter(t => t.status === 'mastered').length;
      const percentage = topics.length > 0 ? (masteredCount / topics.length) * 100 : 0;

      set({ 
        topics, 
        todayTasks: tasks,
        progress: {
          ...get().progress,
          total_topics: topics.length,
          mastered_topics: masteredCount,
          percentage_completed: Math.round(percentage)
        }
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateTask: async (id: string, completed: boolean) => {
    try {
      await supabaseService.toggleTaskCompletion(id, completed);
      set(state => ({
        todayTasks: state.todayTasks.map(t => t.id === id ? { ...t, completed } : t)
      }));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  },

  updateTopicStatus: async (id: string, status: Topic['status']) => {
    try {
      await supabaseService.updateTopicStatus(id, status);
      const updatedTopics = get().topics.map(t => t.id === id ? { ...t, status } : t);
      const masteredCount = updatedTopics.filter(t => t.status === 'mastered').length;
      const percentage = updatedTopics.length > 0 ? (masteredCount / updatedTopics.length) * 100 : 0;

      set({ 
        topics: updatedTopics,
        progress: {
          ...get().progress,
          mastered_topics: masteredCount,
          percentage_completed: Math.round(percentage)
        }
      });
    } catch (error) {
      console.error('Error updating topic:', error);
    }
  }
}));
