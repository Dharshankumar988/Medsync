import { supabase, getUserProfile, normalizeRole } from '@/lib/supabase';

export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw error;
    }
    
    if (!data.user) {
      throw new Error('Supabase did not return a user session');
    }

    // Authoritative verification against database
    let dbRole: string | null = null;
    let dbStatus: string | null = null;
    let dbFullName: string | null = null;
    let dbProfileCompletion: number | undefined = undefined;

    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, role, status, is_verified, profile_completion_percentage')
        .eq('id', data.user.id)
        .maybeSingle();

      if (dbUser) {
        dbRole = dbUser.role;
        dbStatus = dbUser.status;
        dbProfileCompletion = dbUser.profile_completion_percentage;
      }
    } catch (e) {
      console.warn('Could not query users table directly:', e);
    }

    const baseProfile = getUserProfile(data.user);
    const resolvedRole = normalizeRole(dbRole ?? data.user.user_metadata?.role ?? data.user.app_metadata?.role);
    const resolvedStatus = String(dbStatus ?? data.user.user_metadata?.status ?? data.user.app_metadata?.status ?? 'ACTIVE').toUpperCase();

    const userProfile = {
      ...baseProfile,
      role: resolvedRole,
      status: resolvedStatus,
      profile_completion_percentage: dbProfileCompletion,
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

  register: async (data: { 
    full_name: string; 
    email: string; 
    password: string; 
    role: string;
    hospital_id?: string;
    hospital_name?: string; 
    hospital_address?: string;
    clinic_name?: string;
    clinic_address?: string;
    latitude?: number;
    longitude?: number;
    license_number?: string;
    business_name?: string; 
    contact_number?: string;
  }) => {
    const normalizedRole = normalizeRole(data.role);

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          role: normalizedRole.toUpperCase(),
          hospital_id: data.hospital_id,
          hospital_name: data.hospital_name,
          hospital_address: data.hospital_address,
          clinic_name: data.clinic_name,
          clinic_address: data.clinic_address,
          latitude: data.latitude,
          longitude: data.longitude,
          license_number: data.license_number,
          business_name: data.business_name,
          contact_number: data.contact_number,
        },
      },
    });

    if (error) throw error;
    if (!authData.user) throw new Error("Signup failed");

    // Sync with backend database
    try {
      const { default: api } = await import('@/lib/api');
      await api.post('/api/v1/auth/sync', {
        id: authData.user.id,
        email: data.email,
        role: normalizedRole.toUpperCase(),
        full_name: data.full_name,
        hospital_id: data.hospital_id,
        hospital_name: data.hospital_name,
        hospital_address: data.hospital_address,
        clinic_name: data.clinic_name,
        clinic_address: data.clinic_address,
        latitude: data.latitude,
        longitude: data.longitude,
        license_number: data.license_number,
        business_name: data.business_name,
        contact_number: data.contact_number,
      });
    } catch (syncError) {
      console.warn("Backend sync notice:", syncError);
    }

    const user = getUserProfile(authData.user);
    
    return {
      data: {
        user,
        session: authData.session,
        role: user?.role ?? normalizedRole,
        needsEmailVerification: !authData.session,
      },
    };
  },

  me: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Not authenticated');

    const baseProfile = getUserProfile(data.user);

    // Verify role directly against the database
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, role, status, is_verified, profile_completion_percentage')
        .eq('id', data.user.id)
        .maybeSingle();

      if (dbUser?.role) {
        baseProfile.role = normalizeRole(dbUser.role);
        baseProfile.status = String(dbUser.status || baseProfile.status).toUpperCase();
        baseProfile.profile_completion_percentage = dbUser.profile_completion_percentage;
      }
    } catch (e) {
      console.warn('Could not query users table for me():', e);
    }

    return baseProfile;
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
