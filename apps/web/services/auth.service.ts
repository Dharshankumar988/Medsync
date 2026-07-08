import { supabase, getUserProfile, normalizeRole } from '@/lib/supabase';

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
  register: async (data: { full_name: string; email: string; password: string; role: string }) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          role: normalizeRole(data.role),
        },
      },
    });

    if (error) throw error;

    const user = authData.user ? getUserProfile(authData.user) : null;
    return {
      data: {
        user,
        session: authData.session,
        role: user?.role ?? normalizeRole(data.role),
        needsEmailVerification: !authData.session,
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
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) throw error;
  },
  resendVerification: async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  },
  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  },
};
