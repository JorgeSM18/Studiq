import { supabase } from '../lib/supabase';
import { File } from 'expo-file-system';
import { Topic, Note, Subject, Profile } from '../types';

// Reads the user id from the locally-stored session instead of getUser(), which
// hits the network to re-validate on every call. RLS enforces isolation
// server-side, so the local id is only used to scope queries and set user_id on
// inserts — it never gates access on its own.
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export const supabaseService = {
  // --- Auth & Session ---
  async signUp(email: string, password: string, fullName: string, studyType: string, examDate: string) {
    // 1. Sign up user — guardamos studyType y examDate como metadata
    //    NO creamos el subject aquí porque la sesión aún no está activa
    //    y las políticas RLS la rechazarían.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
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
      email: email.trim().toLowerCase(),
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
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) throw error;
  },

  // Changes the password for the signed-in user directly — no email round-trip.
  // Requires a valid session (which the Profile screen always has).
  async changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async updateProfile(fullName: string, userId?: string) {
    const id = userId ?? (await currentUserId());
    if (!id) throw new Error('User not authenticated');

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
    const id = userId ?? (await currentUserId());
    if (!id) return null;

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
    const userId = await currentUserId();
    if (!userId) return [];

    let query = supabase
      .from('topics')
      .select('*')
      .eq('user_id', userId);

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query.order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    const userId = await currentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createSubject(name: string, examDate: string, userId?: string): Promise<Subject> {
    const id = userId ?? (await currentUserId());
    if (!id) throw new Error('User not authenticated');

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
    // getSession here (not currentUserId) because we also need user_metadata.
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
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

  // Inserts one topic per title, appended after any existing topics in order.
  // Returns the created rows so the store can merge them without a full refetch.
  async createTopics(subjectId: string, titles: string[]): Promise<Topic[]> {
    const userId = await currentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Start numbering after the current highest, so appends never collide with
    // or reorder existing topics. maybeSingle: the subject may have none yet.
    const { data: last } = await supabase
      .from('topics')
      .select('order_index')
      .eq('subject_id', subjectId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const base = (last?.order_index ?? -1) + 1;
    const rows = titles.map((title, i) => ({
      user_id: userId,
      subject_id: subjectId,
      title,
      order_index: base + i,
    }));

    const { data, error } = await supabase.from('topics').insert(rows).select();
    if (error) throw error;
    return data || [];
  },

  // filePath is passed in because the caller (the store) already holds the
  // topic; storage objects are not cascade-deleted by the row's FK, so an
  // attached file would otherwise be orphaned in the bucket forever.
  async deleteTopic(id: string, filePath?: string | null): Promise<void> {
    if (filePath) {
      await supabase.storage.from('materials').remove([filePath]);
    }
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Study log (drives today's checkmarks and the streak) ---

  // topic_ids the user logged as studied on the given local date.
  async getStudiedOn(date: string): Promise<string[]> {
    const userId = await currentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('study_log')
      .select('topic_id')
      .eq('user_id', userId)
      .eq('studied_on', date);

    if (error) throw error;
    return (data || []).map(row => row.topic_id);
  },

  // Distinct dates with any activity, newest first, for computing the streak.
  // Capped at a year: more than that never changes a current streak.
  async getStudyDates(): Promise<string[]> {
    const userId = await currentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('study_log')
      .select('studied_on')
      .eq('user_id', userId)
      .order('studied_on', { ascending: false })
      .limit(366);

    if (error) throw error;
    return (data || []).map(row => row.studied_on);
  },

  async markStudied(topicId: string, date: string): Promise<void> {
    const userId = await currentUserId();
    if (!userId) throw new Error('User not authenticated');

    // ignoreDuplicates: re-marking the same topic/day is a no-op, matching the
    // unique(topic_id, studied_on) constraint rather than erroring on it.
    const { error } = await supabase
      .from('study_log')
      .upsert(
        { user_id: userId, topic_id: topicId, studied_on: date },
        { onConflict: 'topic_id,studied_on', ignoreDuplicates: true }
      );

    if (error) throw error;
  },

  async unmarkStudied(topicId: string, date: string): Promise<void> {
    const { error } = await supabase
      .from('study_log')
      .delete()
      .eq('topic_id', topicId)
      .eq('studied_on', date);

    if (error) throw error;
  },

  // Writes the spaced-review fields (and optionally the status bump) after a
  // study event. Kept separate from the study_log write so the store can
  // orchestrate both and revert the schedule cleanly on an undo.
  async updateTopicSchedule(
    topicId: string,
    patch: Partial<Pick<Topic, 'last_review_date' | 'next_review_date' | 'review_interval' | 'status'>>
  ): Promise<void> {
    const { error } = await supabase.from('topics').update(patch).eq('id', topicId);
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
    const userId = await currentUserId();
    if (!userId) throw new Error('User not authenticated');

    // onConflict must name topic_id: notes has a UNIQUE on it, but upsert
    // defaults to resolving against the primary key, so a second save for the
    // same topic inserts a fresh id and trips the unique constraint.
    // updated_at is set by the update_notes_modtime trigger.
    const { error } = await supabase
      .from('notes')
      .upsert({ topic_id: topicId, user_id: userId, content }, { onConflict: 'topic_id' });

    if (error) throw error;
  },

  // --- Storage (study materials) ---

  // Uploads a picked document and points the topic at it. The path is
  // {uid}/{topicId}/{filename}: the storage RLS policy requires the first path
  // segment to equal auth.uid(), and scoping by topic keeps replacements tidy.
  async uploadTopicFile(
    topicId: string,
    file: { uri: string; name: string; mimeType?: string },
    previousPath?: string | null
  ): Promise<string> {
    const userId = await currentUserId();
    if (!userId) throw new Error('User not authenticated');

    const bytes = await new File(file.uri).arrayBuffer();
    // Strip path separators/control chars from the filename so it stays a single
    // storage-key segment (the {uid}/ prefix — enforced by storage RLS — is what
    // isolates users; this is just key hygiene, not a security boundary).
    const safeName = file.name.replace(/[/\\]/g, '_');
    const path = `${userId}/${topicId}/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(path, bytes, {
        contentType: file.mimeType || 'application/octet-stream',
        upsert: true,
      });
    if (uploadError) throw uploadError;

    // Remove the old file if the replacement lives at a different path (e.g. a
    // different filename); upsert already overwrote it when the path matches.
    if (previousPath && previousPath !== path) {
      await supabase.storage.from('materials').remove([previousPath]);
    }

    const { error: updateError } = await supabase
      .from('topics')
      .update({ pdf_url: path })
      .eq('id', topicId);
    if (updateError) throw updateError;

    return path;
  },

  async removeTopicFile(topicId: string, path: string): Promise<void> {
    await supabase.storage.from('materials').remove([path]);
    const { error } = await supabase
      .from('topics')
      .update({ pdf_url: null })
      .eq('id', topicId);
    if (error) throw error;
  },

  // The bucket is private, so a time-limited signed URL is required; a public
  // URL would 400. The URL is handed to the OS viewer, not rendered in-app.
  async getFileUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('materials')
      .createSignedUrl(path, 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  },
};
