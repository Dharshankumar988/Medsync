import { supabase, getUserProfile, normalizeRole } from '../lib/supabase';

export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Supabase did not return a user session');

    return {
      data: {
        session: data.session,
        user: getUserProfile(data.user),
        role: normalizeRole(data.user.user_metadata?.role ?? data.user.app_metadata?.role),
        status: String(data.user.user_metadata?.status ?? data.user.app_metadata?.status ?? 'ACTIVE').toUpperCase(),
      },
    };
  },
  me: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Not authenticated');
    return getUserProfile(data.user);
  },
  logout: async () => {
    await supabase.auth.signOut();
  },
  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },
  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  },
};
