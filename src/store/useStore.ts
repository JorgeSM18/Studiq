import { create } from 'zustand';
import { Topic, UserProgress, Profile, Subject, Material } from '../types';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { todayISO, computeStreak } from '../utils/streak';
import { scheduleReview } from '../utils/plan';
import { biometricAvailable, authenticate, isLockEnabled, setLockEnabled } from '../lib/biometrics';

import { Session } from '@supabase/supabase-js';
import i18n from '../lib/i18n';

interface AppState {
  session: Session | null;
  language: string;
  subjects: Subject[];
  activeSubjectId: string | null;
  topics: Topic[];
  materials: Material[];
  studiedTodayIds: string[];
  studyDates: string[]; // distinct dates with activity, for the streak (no refetch on toggle)
  progress: UserProgress;
  profile: Profile | null;
  isLoading: boolean;
  isAuthLoading: boolean;
  biometricEnabled: boolean;
  isLocked: boolean;
  lockSuppressed: boolean; // true when the app itself opened a file, so the next background shouldn't lock

  // Actions
  setSession: (session: Session | null) => void;
  setLanguage: (lang: string) => void;
  initializeAuth: () => Promise<void>;
  initBiometricLock: () => Promise<void>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  lockApp: () => void;
  forceUnlock: () => void;
  unlockApp: () => Promise<boolean>;
  suppressLock: () => void;
  fetchInitialData: () => Promise<void>;
  setActiveSubject: (id: string) => Promise<void>;
  createSubject: (name: string, examDate: string | null) => Promise<void>;
  updateSubject: (id: string, patch: { name?: string; exam_date?: string | null }) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  toggleStudiedToday: (topicId: string) => Promise<void>;
  updateTopicStatus: (id: string, status: Topic['status']) => Promise<void>;
  addTopics: (titles: string[]) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  uploadMaterial: (topicId: string | null, file: { uri: string; name: string; mimeType?: string }) => Promise<void>;
  setMaterialTopic: (materialId: string, topicId: string | null) => Promise<void>;
  deleteMaterial: (materialId: string) => Promise<void>;
  updateProfileName: (fullName: string) => Promise<void>;
}

// The mastered count and percentage are derived from topics in several actions;
// keeping the arithmetic in one place stops the three copies from drifting.
function topicProgress(topics: Topic[]) {
  const mastered = topics.filter(t => t.status === 'mastered').length;
  return {
    total_topics: topics.length,
    mastered_topics: mastered,
    percentage_completed: topics.length ? Math.round((mastered / topics.length) * 100) : 0,
  };
}

export const useStore = create<AppState>((set, get) => ({
  session: null,
  language: i18n.language || 'es', // Default to i18n detected language
  subjects: [],
  activeSubjectId: null,
  topics: [],
  materials: [],
  studiedTodayIds: [],
  studyDates: [],
  progress: {
    percentage_completed: 0,
    study_streak: 0,
    total_topics: 0,
    mastered_topics: 0
  },
  profile: null,
  isLoading: false,
  isAuthLoading: true,
  biometricEnabled: false,
  isLocked: false,
  lockSuppressed: false,

  setSession: (session) => set({ session }),
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
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      set({ isAuthLoading: false });
    }
  },

  // Reads the device preference; if the lock is on, start locked so the gate
  // shows before any content on a cold start.
  initBiometricLock: async () => {
    try {
      const enabled = await isLockEnabled();
      set({ biometricEnabled: enabled, isLocked: enabled });
    } catch (error) {
      console.error('Error reading biometric preference:', error);
    }
  },

  // Turning it on requires a successful biometric check first, so a user can't
  // enable a lock they then can't pass. Returns whether it was enabled.
  enableBiometric: async () => {
    if (!(await biometricAvailable())) return false;
    const ok = await authenticate(i18n.t('profile:unlockPrompt'));
    if (!ok) return false;
    await setLockEnabled(true);
    set({ biometricEnabled: true });
    return true;
  },

  disableBiometric: async () => {
    await setLockEnabled(false);
    set({ biometricEnabled: false, isLocked: false });
  },

  lockApp: () => {
    if (get().biometricEnabled) set({ isLocked: true });
  },

  forceUnlock: () => set({ isLocked: false }),

  // Called right before the app opens a file in the OS viewer, so the resulting
  // background→foreground round-trip doesn't demand a re-unlock.
  suppressLock: () => set({ lockSuppressed: true }),

  unlockApp: async () => {
    const ok = await authenticate(i18n.t('profile:unlockPrompt'));
    if (ok) set({ isLocked: false });
    return ok;
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

      const today = todayISO();
      const [topics, materials, studiedTodayIds, studyDates] = await Promise.all([
        activeId ? supabaseService.getTopics(activeId) : Promise.resolve([]),
        supabaseService.getMaterials(),
        supabaseService.getStudiedOn(today),
        supabaseService.getStudyDates(),
      ]);

      set({
        subjects,
        activeSubjectId: activeId,
        topics,
        materials,
        studiedTodayIds,
        studyDates,
        profile,
        progress: {
          ...get().progress,
          ...topicProgress(topics),
          study_streak: computeStreak(studyDates, today),
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
      const topics = await supabaseService.getTopics(id);
      set({ topics, progress: { ...get().progress, ...topicProgress(topics) } });
    } catch (error) {
      console.error('Error switching subject:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Rethrows so the exam form can surface failures.
  createSubject: async (name, examDate) => {
    const subject = await supabaseService.createSubject(name, examDate);
    set({
      subjects: [subject, ...get().subjects],
      activeSubjectId: subject.id,
      topics: [],
      progress: { ...get().progress, ...topicProgress([]) },
    });
  },

  updateSubject: async (id, patch) => {
    await supabaseService.updateSubject(id, patch);
    set({ subjects: get().subjects.map(s => (s.id === id ? { ...s, ...patch } : s)) });
  },

  deleteSubject: async (id) => {
    await supabaseService.deleteSubject(id);
    const subjects = get().subjects.filter(s => s.id !== id);
    const wasActive = get().activeSubjectId === id;
    set({ subjects });

    if (wasActive) {
      const nextId = subjects[0]?.id ?? null;
      set({ activeSubjectId: nextId });
      if (nextId) await get().setActiveSubject(nextId);
      else set({ topics: [], progress: { ...get().progress, ...topicProgress([]) } });
    }
    // The deleted subject's topics cascaded away; their files are now unassigned.
    // Refetch materials so the library reflects that.
    set({ materials: await supabaseService.getMaterials() });
  },

  // Toggles "studied today" for a topic and recomputes the streak locally.
  // Marking a fresh topic also nudges it not_started -> in_progress; unmarking
  // never downgrades status, since "I didn't study it today" isn't "I never did".
  toggleStudiedToday: async (topicId: string) => {
    const today = todayISO();
    const topic = get().topics.find(t => t.id === topicId);
    if (!topic) return;
    const wasStudied = get().studiedTodayIds.includes(topicId);

    // Work out how this study event moves the topic's schedule/status, so the
    // optimistic update and the persisted writes stay in lockstep.
    const introducedToday =
      topic.status === 'in_progress' && topic.review_interval === 2 && topic.last_review_date === today;

    let patch: Partial<Topic> | null = null;
    if (wasStudied) {
      // Undo: only a topic *introduced* today can be cleanly reverted to new;
      // an undone review keeps its schedule (we don't store the prior date).
      if (introducedToday) {
        patch = { status: 'not_started', last_review_date: null, next_review_date: null, review_interval: 1 };
      }
    } else if (topic.last_review_date !== today) {
      // Fresh study today: advance the spaced-review schedule, never past the exam.
      const examDate = get().subjects.find(s => s.id === get().activeSubjectId)?.exam_date ?? null;
      const { interval, nextReviewDate } = scheduleReview(today, topic.review_interval, examDate);
      patch = {
        last_review_date: today,
        next_review_date: nextReviewDate,
        review_interval: interval,
        ...(topic.status === 'not_started' ? { status: 'in_progress' as const } : {}),
      };
    }
    // else: re-marking a topic already studied today — log only, schedule stays.

    const studiedTodayIds = wasStudied
      ? get().studiedTodayIds.filter(id => id !== topicId)
      : [...get().studiedTodayIds, topicId];
    const topics = patch
      ? get().topics.map(t => (t.id === topicId ? { ...t, ...patch } : t))
      : get().topics;

    // Update the streak locally: today counts once any topic is studied, so add
    // it when marking and drop it only when the last one for today is unmarked.
    const stillStudiedToday = studiedTodayIds.length > 0;
    const studyDates = stillStudiedToday
      ? Array.from(new Set([today, ...get().studyDates]))
      : get().studyDates.filter(d => d !== today);

    set({
      studiedTodayIds,
      topics,
      studyDates,
      progress: {
        ...get().progress,
        ...topicProgress(topics),
        study_streak: computeStreak(studyDates, today),
      },
    });

    try {
      if (wasStudied) await supabaseService.unmarkStudied(topicId, today);
      else await supabaseService.markStudied(topicId, today);
      if (patch) await supabaseService.updateTopicSchedule(topicId, patch);
    } catch (error) {
      console.error('Error toggling studied:', error);
      get().fetchInitialData(); // pull authoritative state back after a failed write
    }
  },

  updateTopicStatus: async (id: string, status: Topic['status']) => {
    try {
      await supabaseService.updateTopicStatus(id, status);
      const topics = get().topics.map(t => t.id === id ? { ...t, status } : t);
      set({ topics, progress: { ...get().progress, ...topicProgress(topics) } });
    } catch (error) {
      console.error('Error updating topic:', error);
    }
  },

  addTopics: async (titles: string[]) => {
    if (titles.length === 0) return;

    // Self-heal: if signup metadata never produced a subject, the user would
    // otherwise be stuck unable to add topics. Create one from whatever metadata
    // exists (falling back to a generic name / no exam date) and make it active.
    let subjectId = get().activeSubjectId;
    if (!subjectId) {
      const meta = get().session?.user.user_metadata;
      const subject = await supabaseService.createSubject(
        meta?.study_type || 'General',
        meta?.exam_date ?? null
      );
      set({ subjects: [...get().subjects, subject], activeSubjectId: subject.id });
      subjectId = subject.id;
    }

    // Errors propagate so the screen can surface them, rather than the user
    // seeing an empty list and assuming the save worked.
    const created = await supabaseService.createTopics(subjectId, titles);
    const topics = [...get().topics, ...created];
    set({ topics, progress: { ...get().progress, ...topicProgress(topics) } });
  },

  deleteTopic: async (id: string) => {
    try {
      await supabaseService.deleteTopic(id);
      const topics = get().topics.filter(t => t.id !== id);
      // Its files stay in the library (DB sets their topic_id null); mirror that.
      const materials = get().materials.map(m => (m.topic_id === id ? { ...m, topic_id: null } : m));
      set({ topics, materials, progress: { ...get().progress, ...topicProgress(topics) } });
    } catch (error) {
      console.error('Error deleting topic:', error);
    }
  },

  // Rethrows so the screen can surface the failure rather than the user assuming
  // a large upload succeeded when it didn't.
  uploadMaterial: async (topicId, file) => {
    const material = await supabaseService.uploadMaterial(topicId, file);
    set({ materials: [material, ...get().materials] });
  },

  setMaterialTopic: async (materialId, topicId) => {
    await supabaseService.setMaterialTopic(materialId, topicId);
    set({ materials: get().materials.map(m => (m.id === materialId ? { ...m, topic_id: topicId } : m)) });
  },

  deleteMaterial: async (materialId) => {
    const path = get().materials.find(m => m.id === materialId)?.path;
    await supabaseService.deleteMaterial(materialId, path ?? '');
    set({ materials: get().materials.filter(m => m.id !== materialId) });
  },

  updateProfileName: async (fullName) => {
    await supabaseService.updateProfile(fullName);
    set(state => ({
      profile: state.profile ? { ...state.profile, full_name: fullName } : state.profile,
    }));
  }
}));
