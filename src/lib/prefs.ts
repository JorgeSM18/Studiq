import * as SecureStore from 'expo-secure-store';

// Small device-local preferences (language, active exam) that should survive a
// restart. Kept out of the backend: they're per-device UI state, not user data.
const LANG_KEY = 'pref_language';
const SUBJECT_KEY = 'pref_active_subject';

export const prefs = {
  async getLanguage(): Promise<string | null> {
    return SecureStore.getItemAsync(LANG_KEY);
  },
  async setLanguage(lang: string): Promise<void> {
    await SecureStore.setItemAsync(LANG_KEY, lang);
  },
  async getActiveSubject(): Promise<string | null> {
    return SecureStore.getItemAsync(SUBJECT_KEY);
  },
  async setActiveSubject(id: string): Promise<void> {
    await SecureStore.setItemAsync(SUBJECT_KEY, id);
  },
};
