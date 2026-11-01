import { supabase, getUserProfile, normalizeRole } from '../lib/supabase';
import api from '../lib/api';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

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
    role?: 'patient' | 'doctor';
    phone_number?: string;
    blood_group?: string;
    gender?: string;
    date_of_birth?: string;
  }) => {
    const cleanEmail = payload.email.trim().toLowerCase();
    const roleUpper = (payload.role || 'patient').toUpperCase();

    const { data: authData, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: payload.password,
      options: {
        data: {
          full_name: payload.full_name.trim(),
          role: roleUpper,
          contact_number: payload.phone_number?.trim() || '',
          blood_group: payload.blood_group || '',
          gender: payload.gender || '',
          date_of_birth: payload.date_of_birth || '',
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
        blood_group: payload.blood_group || '',
        gender: payload.gender || '',
        date_of_birth: payload.date_of_birth || '',
      });
    } catch (syncErr) {
      console.warn('Backend sync notice during registration:', syncErr);
    }

    // Dispatch 6-digit OTP verification email via Brevo
    try {
      await api.post('/auth/send-verification-otp', {
        email: cleanEmail,
        purpose: 'EMAIL_VERIFY',
      });
    } catch (otpErr) {
      console.warn('Initial verification OTP dispatch note:', otpErr);
    }

    return authData;
  },

  sendVerificationOtp: async (email: string) => {
    const res = await api.post('/auth/send-verification-otp', {
      email: email.trim().toLowerCase(),
      purpose: 'EMAIL_VERIFY',
    });
    return res.data;
  },

  verifyEmailOtp: async (email: string, otpCode: string) => {
    const res = await api.post('/auth/verify-email-otp', {
      email: email.trim().toLowerCase(),
      otp_code: otpCode.trim(),
      purpose: 'EMAIL_VERIFY',
    });
    return res.data;
  },

  sendResetOtp: async (email: string) => {
    const res = await api.post('/auth/send-reset-otp', {
      email: email.trim().toLowerCase(),
      purpose: 'PASSWORD_RESET',
    });
    return res.data;
  },

  verifyResetOtp: async (payload: {
    email: string;
    otp_code: string;
    new_password: string;
    confirm_password: string;
  }) => {
    const res = await api.post('/auth/verify-reset-otp', {
      email: payload.email.trim().toLowerCase(),
      otp_code: payload.otp_code.trim(),
      new_password: payload.new_password,
      confirm_password: payload.confirm_password,
    });
    return res.data;
  },

  signInWithGoogle: async () => {
    const redirectUrl = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      if (
        error.message?.includes('provider is not enabled') ||
        error.message?.includes('Unsupported provider')
      ) {
        throw new Error(
          'Google Sign-In is not enabled on this Supabase project yet. Please sign in with your email & password, or enable Google Provider in your Supabase dashboard.'
        );
      }
      throw error;
    }

    if (data?.url) {
      // In-app authentication sheet (Custom Tab) - stays completely inside MedSync
      const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (authResult.type === 'success' && authResult.url) {
        return { url: authResult.url };
      }
      return { url: null, cancelled: true };
    }

    return { url: null };
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

  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  },
};
