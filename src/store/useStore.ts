import { create } from 'zustand';
import { Topic, StudyTask, UserProgress, Profile, Subject } from '../types';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

import { Session } from '@supabase/supabase-js';
import * as LocalAuthentication from 'expo-local-authentication';
import i18n from '../lib/i18n';

interface AppState {
  session: Session | null;
  isBiometricEnabled: boolean;
  language: string;
  subjects: Subject[];
  activeSubjectId: string | null;
  topics: Topic[];
  todayTasks: StudyTask[];
  progress: UserProgress;
  profile: Profile | null;
  isLoading: boolean;
  isAuthLoading: boolean;
  
  // Actions
  setSession: (session: Session | null) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setLanguage: (lang: string) => void;
  initializeAuth: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  setActiveSubject: (id: string) => Promise<void>;
  updateTask: (id: string, completed: boolean) => Promise<void>;
  updateTopicStatus: (id: string, status: Topic['status']) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  session: null,
  isBiometricEnabled: false,
  language: i18n.language || 'es', // Default to i18n detected language
  subjects: [],
  activeSubjectId: null,
  topics: [],
  todayTasks: [],
  progress: {
    percentage_completed: 0,
    study_streak: 0,
    total_topics: 0,
    mastered_topics: 0
  },
  profile: null,
  isLoading: false,
  isAuthLoading: true,

  setSession: (session) => set({ session }),
  setBiometricEnabled: (enabled) => set({ isBiometricEnabled: enabled }),
  setLanguage: (lang) => {
    i18n.changeLanguage(lang);
    set({ language: lang });
  },

  initializeAuth: async () => {
    try {
      // Sync i18n with stored language if available
      const storedLang = get().language;
      if (storedLang && storedLang !== i18n.language) {
        i18n.changeLanguage(storedLang);
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      // Si el usuario viene de las pruebas anteriores (sesión anónima, no tiene email)
      // cerramos su sesión para forzarle a ver la nueva pantalla de Login.
      if (session && !session.user.email) {
        await supabase.auth.signOut();
        set({ session: null });
      } else {
        set({ session });
      }

      // Cargar preferencia biométrica desde el backend o almacenamiento local en el futuro
      // Por ahora se deja en false
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      set({ isAuthLoading: false });
    }
  },

  fetchInitialData: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false });
        return;
      }

      // Si el usuario acaba de registrarse y no tiene subjects,
      // crearemos el primero usando la metadata guardada durante el signUp.
      // Lo hacemos AQUÍ (no en signUp) porque necesitamos que la sesión esté activa
      // para que RLS permita el INSERT en la tabla subjects.
      await supabaseService.createInitialSubjectIfNeeded();

      const [subjects, profile] = await Promise.all([
        supabaseService.getSubjects(),
        supabaseService.getProfile(user.id)
      ]);

      // Seleccionar la primera asignatura por defecto si no hay una activa
      const activeId = get().activeSubjectId || (subjects.length > 0 ? subjects[0].id : null);

      let topics: Topic[] = [];
      let tasks: StudyTask[] = [];

      if (activeId) {
        const [fetchedTopics, fetchedTasks] = await Promise.all([
          supabaseService.getTopics(activeId),
          supabaseService.getTodayTasks(activeId)
        ]);
        topics = fetchedTopics;
        tasks = fetchedTasks;
      }

      const masteredCount = topics.filter(t => t.status === 'mastered').length;
      const percentage = topics.length > 0 ? (masteredCount / topics.length) * 100 : 0;

      set({ 
        subjects,
        activeSubjectId: activeId,
        topics, 
        todayTasks: tasks,
        profile,
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

  setActiveSubject: async (id: string) => {
    set({ activeSubjectId: id, isLoading: true });
    try {
      const [topics, tasks] = await Promise.all([
        supabaseService.getTopics(id),
        supabaseService.getTodayTasks(id)
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
      console.error('Error switching subject:', error);
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
