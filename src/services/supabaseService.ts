import { supabase } from '../lib/supabase';
import { Topic, StudyTask, Note } from '../types';

export const supabaseService = {
  // Topics
  async getTopics(): Promise<Topic[]> {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .order('order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async updateTopicStatus(id: string, status: Topic['status']): Promise<void> {
    const { error } = await supabase
      .from('topics')
      .update({ status })
      .eq('id', id);
    
    if (error) throw error;
  },

  // Study Plan (Tasks)
  async getTodayTasks(): Promise<StudyTask[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('study_plan')
      .select(`
        id,
        topic_id,
        date,
        type,
        completed,
        topics(title)
      `)
      .eq('date', today);
    
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
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
    return data;
  },

  async saveNote(topicId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .upsert({ topic_id: topicId, content, updated_at: new Date().toISOString() });
    
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
