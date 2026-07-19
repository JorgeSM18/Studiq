import * as SecureStore from 'expo-secure-store';

/**
 * Storage adapter backing Supabase auth with the device keychain/keystore
 * instead of plaintext AsyncStorage.
 *
 * SecureStore caps a value at 2048 bytes and a Supabase session (JWT plus user
 * metadata) can exceed that, so values are split across numbered chunk keys.
 *
 * The cap counts bytes but slicing counts characters, and session JSON keeps
 * non-ASCII literal (an accented name, an emoji), so the chunk size assumes the
 * worst case of 4 UTF-8 bytes per character rather than the 1 byte a plain JWT
 * would use. Cheaper than measuring each slice; the extra keys cost nothing.
 */
const CHUNK_CHARS = 500;

const chunkKey = (key: string, index: number) => `${key}.${index}`;

/** Splits into chunks that always fit the byte cap, never splitting a surrogate pair. */
function split(value: string): string[] {
  if (value.length === 0) return [''];

  const parts: string[] = [];
  let start = 0;
  while (start < value.length) {
    let end = Math.min(start + CHUNK_CHARS, value.length);
    const last = value.charCodeAt(end - 1);
    const endsOnHighSurrogate = last >= 0xd800 && last <= 0xdbff;
    if (endsOnHighSurrogate && end < value.length) end -= 1;
    parts.push(value.slice(start, end));
    start = end;
  }
  return parts;
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const first = await SecureStore.getItemAsync(chunkKey(key, 0));
    if (first === null) return null;

    let value = first;
    for (let i = 1; ; i++) {
      const chunk = await SecureStore.getItemAsync(chunkKey(key, i));
      if (chunk === null) return value;
      value += chunk;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    await secureStorage.removeItem(key);
    const parts = split(value);
    for (let i = 0; i < parts.length; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), parts[i]);
    }
  },

  async removeItem(key: string): Promise<void> {
    for (let i = 0; ; i++) {
      const k = chunkKey(key, i);
      if ((await SecureStore.getItemAsync(k)) === null) return;
      await SecureStore.deleteItemAsync(k);
    }
  },
};
