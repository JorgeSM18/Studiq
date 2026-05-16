import { supabase } from '../lib/supabase';
import { Topic, StudyTask, Note, Subject, Profile } from '../types';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

export const supabaseService = {
  // --- Auth & Session ---
  async signUp(email: string, password: string, fullName: string, studyType: string, examDate: string) {
    // 1. Sign up user — guardamos studyType y examDate como metadata
    //    NO creamos el subject aquí porque la sesión aún no está activa
    //    y las políticas RLS la rechazarían.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          study_type: studyType,
          exam_date: examDate,
        }
      }
    });
    
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // --- Biometrics & Secure Storage ---
  async saveCredentials(email: string, password: string) {
    await SecureStore.setItemAsync('user_email', email);
    await SecureStore.setItemAsync('user_password', password);
  },

  async clearCredentials() {
    await SecureStore.deleteItemAsync('user_email');
    await SecureStore.deleteItemAsync('user_password');
  },

  async getStoredCredentials() {
    const email = await SecureStore.getItemAsync('user_email');
    const password = await SecureStore.getItemAsync('user_password');
    if (email && password) {
      return { email, password };
    }
    return null;
  },

  async biometricLogin() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      throw new Error('La autenticación biométrica no está configurada o disponible en este dispositivo.');
    }

    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquea Studiq',
      fallbackLabel: 'Usar contraseña',
    });

    if (auth.success) {
      const credentials = await this.getStoredCredentials();
      if (credentials) {
        return await this.signIn(credentials.email, credentials.password);
      } else {
        throw new Error('No hay credenciales guardadas. Inicia sesión con contraseña primero.');
      }
    } else {
      throw new Error('Fallo en la autenticación biométrica.');
    }
  },

  async updateProfile(fullName: string, userId?: string) {
    let id = userId;
    
    if (!id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      id = user.id;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: id,
        full_name: fullName,
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
  },

  async getProfile(userId?: string): Promise<Profile | null> {
    let id = userId;
    
    if (!id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      id = user.id;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  // Topics
  async getTopics(subjectId?: string): Promise<Topic[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('topics')
      .select('*')
      .eq('user_id', user.id);
    
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query.order('order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createSubject(name: string, examDate: string, userId?: string): Promise<Subject> {
    let id = userId;
    
    if (!id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      id = user.id;
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name,
        exam_date: examDate,
        user_id: id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Crea el primer subject del usuario usando los datos guardados como metadata.
  // Se llama después del primer login cuando la sesión ya está activa.
  async createInitialSubjectIfNeeded(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Comprueba si el usuario ya tiene subjects
    const { data: existingSubjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existingSubjects && existingSubjects.length > 0) return; // Ya tiene subjects

    // Lee los datos guardados en metadata durante el signUp
    const studyType = user.user_metadata?.study_type;
    const examDate = user.user_metadata?.exam_date;

    if (studyType && examDate) {
      await this.createSubject(studyType, examDate);
    }
  },

  async updateTopicStatus(id: string, status: Topic['status']): Promise<void> {
    const { error } = await supabase
      .from('topics')
      .update({ status })
      .eq('id', id);
    
    if (error) throw error;
  },

  // SRS Update
  async updateTopicSRS(id: string, srsData: Partial<Topic>): Promise<void> {
    const { error } = await supabase
      .from('topics')
      .update({
        last_review_date: srsData.last_review_date,
        next_review_date: srsData.next_review_date,
        review_interval: srsData.review_interval,
        ease_factor: srsData.ease_factor
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  // Study Plan (Tasks)
  async getTodayTasks(subjectId?: string): Promise<StudyTask[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('study_plan')
      .select(`
        id,
        topic_id,
        subject_id,
        date,
        type,
        completed,
        topics(title)
      `)
      .eq('user_id', user.id)
      .eq('date', today);
    
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map((item: any) => ({
      ...item,
      topic_title: item.topics?.title || 'Unknown Topic'
    }));
  },

  async toggleTaskCompletion(id: string, completed: boolean): Promise<void> {
    const { error } = await supabase
      .from('study_plan')
      .update({ completed })
      .eq('id', id);
    
    if (error) throw error;
  },

  // Notes
  async getNoteByTopicId(topicId: string): Promise<Note | null> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('topic_id', topicId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async saveNote(topicId: string, content: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('notes')
      .upsert({ 
        topic_id: topicId, 
        user_id: user.id,
        content, 
        updated_at: new Date().toISOString() 
      });
    
    if (error) throw error;
  },

  // Storage
  async getPdfUrl(path: string): Promise<string> {
    const { data } = supabase.storage
      .from('materials')
      .getPublicUrl(path);
    
    return data.publicUrl;
  }
};
