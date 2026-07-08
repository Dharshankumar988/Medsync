import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const createSupabaseStub = () => ({
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: { session: null, user: null }, error: new Error('Supabase is not configured') }),
    signUp: async () => ({ data: { session: null, user: null }, error: new Error('Supabase is not configured') }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ data: null, error: new Error('Supabase is not configured') }),
    refreshSession: async () => ({ data: { session: null }, error: null }),
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
    detectSessionInUrl: false,
  },
}) : createSupabaseStub();

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
});