import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const DEFAULT_SUPABASE_URL = 'https://abkxpvizmyowhkjjvjlx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFia3hwdml6bXlvd2hramp2amx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0Mjk0NjYsImV4cCI6MjA5OTAwNTQ2Nn0.6WQhC3k6iA0au2IsEhmIhBDZKshIGEMcm-c8YZW6k6w';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

const createSupabaseStub = () => ({
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: { session: null, user: null }, error: new Error('Supabase is not configured') }),
    signUp: async () => ({ data: { session: null, user: null }, error: new Error('Supabase is not configured') }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ data: null, error: new Error('Supabase is not configured') }),
    refreshSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (_callback: (event: string, session: any) => void) => ({
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    }),
  },
});

const SECURE_STORE_CHUNK_SIZE = 1800;

const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const chunkCountStr = await SecureStore.getItemAsync(`${key}__chunks`);
    if (chunkCountStr) {
      const count = parseInt(chunkCountStr, 10);
      if (Number.isFinite(count) && count > 0) {
        const parts = await Promise.all(
          Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}__chunk_${i}`))
        );
        if (parts.some((p) => p === null)) return null;
        return parts.join('');
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Clean up any previous chunks before writing
    const prevCountStr = await SecureStore.getItemAsync(`${key}__chunks`);
    if (prevCountStr) {
      const prevCount = parseInt(prevCountStr, 10) || 0;
      await Promise.all([
        SecureStore.deleteItemAsync(`${key}__chunks`),
        ...Array.from({ length: prevCount }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}__chunk_${i}`)
        ),
      ]);
    }

    if (value.length <= SECURE_STORE_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const totalChunks = Math.ceil(value.length / SECURE_STORE_CHUNK_SIZE);
    await SecureStore.deleteItemAsync(key);
    await SecureStore.setItemAsync(`${key}__chunks`, String(totalChunks));
    await Promise.all(
      Array.from({ length: totalChunks }, (_, i) =>
        SecureStore.setItemAsync(
          `${key}__chunk_${i}`,
          value.slice(i * SECURE_STORE_CHUNK_SIZE, (i + 1) * SECURE_STORE_CHUNK_SIZE)
        )
      )
    );
  },
  removeItem: async (key: string): Promise<void> => {
    const prevCountStr = await SecureStore.getItemAsync(`${key}__chunks`);
    if (prevCountStr) {
      const prevCount = parseInt(prevCountStr, 10) || 0;
      await Promise.all([
        SecureStore.deleteItemAsync(`${key}__chunks`),
        ...Array.from({ length: prevCount }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}__chunk_${i}`)
        ),
      ]);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}) : (createSupabaseStub() as unknown as ReturnType<typeof createClient>);

export const normalizeRole = (role: unknown) => {
  if (typeof role !== 'string' || !role) return 'patient';
  return role.toLowerCase();
};

export const getUserProfile = (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }) => ({
  id: user.id,
  email: user.email ?? '',
  role: normalizeRole(user.user_metadata?.role ?? user.app_metadata?.role),
  status: String(user.user_metadata?.status ?? user.app_metadata?.status ?? 'ACTIVE').toUpperCase(),
  full_name: (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null,
  avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? (user.user_metadata?.picture as string | undefined) ?? null,
  profile_image_url: (user.user_metadata?.profile_image_url as string | undefined) ?? (user.user_metadata?.avatar_url as string | undefined) ?? null,
  profile_picture_url: (user.user_metadata?.profile_picture_url as string | undefined) ?? (user.user_metadata?.avatar_url as string | undefined) ?? null,
  user_metadata: user.user_metadata,
});
