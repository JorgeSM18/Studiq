import { supabase } from '../lib/supabase';
import { File } from 'expo-file-system';
import { Topic, Note, Subject, Profile, Material } from '../types';

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

  // Permanently deletes the signed-in user and all their data (via the
  // delete_current_user RPC + FK cascade), then clears the local session.
  async deleteAccount() {
    const { error } = await supabase.rpc('delete_current_user');
    if (error) throw error;
    await supabase.auth.signOut();
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

  async createSubject(name: string, examDate: string | null, userId?: string): Promise<Subject> {
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

  async updateSubject(
    id: string,
    patch: Partial<Pick<Subject, 'name' | 'exam_date'>>
  ): Promise<void> {
    const { error } = await supabase.from('subjects').update(patch).eq('id', id);
    if (error) throw error;
  },

  // Deleting a subject cascades its topics (and their notes/study_log); the
  // topics' materials fall back to the library (topic_id set null by FK).
  async deleteSubject(id: string): Promise<void> {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;
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

    // Lee los datos guardados en metadata durante el signUp. Basta con el nombre
    // (study_type); la fecha de examen es opcional (el plan usa un ritmo por
    // defecto sin ella), así que no bloqueamos la creación por que falte.
    const studyType = user.user_metadata?.study_type;
    const examDate = user.user_metadata?.exam_date ?? null;

    if (studyType) {
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

  // Materials keep their own lifecycle: deleting a topic sets their topic_id to
  // null (they stay in the library), so nothing to clean up in storage here.
  async deleteTopic(id: string): Promise<void> {
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

  // --- Materials (study files: library + per-topic attachments) ---

  async getMaterials(): Promise<Material[]> {
    const userId = await currentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Uploads a picked document as a new material, optionally assigned to a topic.
  // The row is created first to get an id, then the file lands at
  // {uid}/{materialId}/{filename} — the {uid}/ prefix is what storage RLS checks,
  // and the id keeps every file at its own key regardless of topic assignment.
  async uploadMaterial(
    topicId: string | null,
    file: { uri: string; name: string; mimeType?: string }
  ): Promise<Material> {
    const userId = await currentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data: row, error: insertError } = await supabase
      .from('materials')
      .insert({ user_id: userId, topic_id: topicId, name: file.name, path: '', mime_type: file.mimeType ?? null })
      .select()
      .single();
    if (insertError) throw insertError;

    try {
      const bytes = await new File(file.uri).arrayBuffer();
      const safeName = file.name.replace(/[/\\]/g, '_');
      const path = `${userId}/${row.id}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(path, bytes, { contentType: file.mimeType || 'application/octet-stream', upsert: true });
      if (uploadError) throw uploadError;

      const { data: updated, error: updateError } = await supabase
        .from('materials')
        .update({ path })
        .eq('id', row.id)
        .select()
        .single();
      if (updateError) throw updateError;
      return updated;
    } catch (err) {
      // The row exists but the file didn't land — drop the orphan so the library
      // never shows a material that can't be opened.
      await supabase.from('materials').delete().eq('id', row.id);
      throw err;
    }
  },

  // Assigns an existing material to a topic (or unassigns it back to the library).
  async setMaterialTopic(materialId: string, topicId: string | null): Promise<void> {
    const { error } = await supabase.from('materials').update({ topic_id: topicId }).eq('id', materialId);
    if (error) throw error;
  },

  async deleteMaterial(materialId: string, path: string): Promise<void> {
    if (path) await supabase.storage.from('materials').remove([path]);
    const { error } = await supabase.from('materials').delete().eq('id', materialId);
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
