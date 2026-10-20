import { supabase, getUserProfile, normalizeRole } from '../lib/supabase';
import api from '../lib/api';

export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Supabase did not return a user session');

    // Enforce role-based verification guard against the backend
    let dbRole: string | null = null;
    let dbStatus: string | null = null;

    try {
      const guardRes = await api.post('/auth/login-guard', { email: credentials.email });
      if (guardRes.data?.data) {
        dbRole = guardRes.data.data.role;
        dbStatus = guardRes.data.data.status;
      }
    } catch (guardErr: any) {
      // Guard blocked login -> Sign out immediately so unverified session is discarded
      await supabase.auth.signOut();
      const status = guardErr.response?.status;
      const detail =
        guardErr.response?.data?.detail || guardErr.message || 'Login verification failed.';
      const err = new Error(detail);
      (err as any).status = status;
      (err as any).response = guardErr.response;
      (err as any).code = detail?.includes('EMAIL_NOT_VERIFIED')
        ? 'EMAIL_NOT_VERIFIED'
        : detail?.includes('PENDING_ADMIN_APPROVAL')
        ? 'PENDING_ADMIN_APPROVAL'
        : detail?.includes('ACCOUNT_SUSPENDED')
        ? 'ACCOUNT_SUSPENDED'
        : 'LOGIN_BLOCKED';
      throw err;
    }

    const resolvedRole = normalizeRole(
      dbRole ?? data.user.user_metadata?.role ?? data.user.app_metadata?.role
    );
    const resolvedStatus = String(
      dbStatus ?? data.user.user_metadata?.status ?? data.user.app_metadata?.status ?? 'ACTIVE'
    ).toUpperCase();

    const userProfile = {
      ...getUserProfile(data.user),
      role: resolvedRole,
      status: resolvedStatus,
    };

    return {
      data: {
        session: data.session,
        user: userProfile,
        role: resolvedRole,
        status: resolvedStatus,
      },
    };
  },
  register: async (payload: {
    email: string;
    password: string;
    full_name: string;
    role: 'patient' | 'doctor';
    phone_number?: string;
  }) => {
    const cleanEmail = payload.email.trim().toLowerCase();
    const roleUpper = payload.role.toUpperCase();

    const { data: authData, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: payload.password,
      options: {
        data: {
          full_name: payload.full_name.trim(),
          role: roleUpper,
          contact_number: payload.phone_number?.trim() || '',
        },
      },
    });

    if (error) {
      throw error;
    }
    if (!authData.user) {
      throw new Error('Registration failed. Please try again.');
    }

    if (authData.user.identities && authData.user.identities.length === 0) {
      throw new Error('An account with this email already exists. Please log in.');
    }

    // Sync with backend API
    try {
      await api.post('/auth/sync', {
        id: authData.user.id,
        email: cleanEmail,
        role: roleUpper,
        full_name: payload.full_name.trim(),
        contact_number: payload.phone_number?.trim() || '',
        phone_number: payload.phone_number?.trim() || '',
      });
    } catch (syncErr) {
      console.warn('Backend sync notice during registration:', syncErr);
    }

    return authData;
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
