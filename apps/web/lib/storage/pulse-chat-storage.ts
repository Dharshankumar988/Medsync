import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'medsync_pulse_ai';
const STORE_NAME = 'chats';
const DB_VERSION = 1;

export interface StoredChatData {
  key: string;
  messages: any[];
  sessionId: string | null;
  scanType?: string;
  updatedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB not supported on server'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function savePulseChat(
  key: string,
  data: { messages: any[]; sessionId: string | null; scanType?: string }
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await getDB();
    const payload: StoredChatData = {
      key,
      messages: data.messages,
      sessionId: data.sessionId,
      scanType: data.scanType,
      updatedAt: Date.now(),
    };
    await db.put(STORE_NAME, payload);
  } catch (err) {
    console.warn('[PulseChatStorage] Failed to save chat to IndexedDB:', err);
    // Fallback: save to sessionStorage if possible
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch {
      // quota or storage disabled
    }
  }
}

export async function loadPulseChat(
  key: string
): Promise<{ messages: any[]; sessionId: string | null; scanType?: string } | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await getDB();
    const result = await db.get(STORE_NAME, key);
    if (result && Array.isArray(result.messages)) {
      return {
        messages: result.messages,
        sessionId: result.sessionId ?? null,
        scanType: result.scanType,
      };
    }
  } catch (err) {
    console.warn('[PulseChatStorage] Failed to read from IndexedDB, checking sessionStorage:', err);
  }

  // Fallback to sessionStorage
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.messages)) {
        return parsed;
      }
    }
  } catch {}

  return null;
}

export async function clearPulseChat(key: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, key);
  } catch (err) {
    console.warn('[PulseChatStorage] Failed to clear chat from IndexedDB:', err);
  }
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

export async function clearAllPulseChats(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (err) {
    console.warn('[PulseChatStorage] Failed to clear all chats from IndexedDB:', err);
  }
  try {
    // Clear any pulse-chat keys in sessionStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('pulse-chat-')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {}

  // Dispatch event so active components update if mounted
  window.dispatchEvent(new CustomEvent('medsync:pulse-chat-cleared'));
}
