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

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
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
