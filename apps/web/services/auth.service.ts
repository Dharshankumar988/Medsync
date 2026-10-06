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
    gst_number?: string;
    business_name?: string; 
    contact_number?: string;
    blood_group?: string;
    gender?: string;
    date_of_birth?: string;
    facility_type?: string;
    google_maps_url?: string;
  }) => {
    const normalizedRole = normalizeRole(data.role);
    let userId = "";
    let authSession = null;
    let needsVerification = false;

    if (normalizedRole === "doctor" || normalizedRole === "pharmacy") {
      // Bypass Supabase Auth completely for Doctor and Pharmacy as requested
      const { default: api } = await import('@/lib/api');
      try {
        const response = await api.post('/api/v1/auth/admin-register', {
          email: data.email,
          password: data.password
        });
        userId = response.data.data.id;
        needsVerification = false; // Bypass verification
      } catch (err: any) {
        throw new Error(err.response?.data?.detail || "Failed to create user account.");
      }
    } else {
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
            gst_number: data.gst_number,
            business_name: data.business_name,
            contact_number: data.contact_number,
            blood_group: data.blood_group,
            gender: data.gender,
            date_of_birth: data.date_of_birth,
            facility_type: data.facility_type,
            google_maps_url: data.google_maps_url,
          },
        },
      });

      if (error) throw error;
      if (!authData.user) throw new Error("Signup failed");
      
      userId = authData.user.id;
      authSession = authData.session;
      needsVerification = !authData.session;
    }

    // Sync with backend database
    try {
      const { default: api } = await import('@/lib/api');
      await api.post('/api/v1/auth/sync', {
        id: userId,
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
        gst_number: data.gst_number,
        business_name: data.business_name,
        contact_number: data.contact_number,
        blood_group: data.blood_group,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        facility_type: data.facility_type,
        google_maps_url: data.google_maps_url,
      });
    } catch (syncError: any) {
      console.error("Backend sync failed:", syncError);
      let message = "Failed to synchronize user data with backend.";
      if (syncError.response?.data?.detail) {
        if (Array.isArray(syncError.response.data.detail)) {
          message = syncError.response.data.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
        } else if (typeof syncError.response.data.detail === 'string') {
          message = syncError.response.data.detail;
        } else {
          message = JSON.stringify(syncError.response.data.detail);
        }
      } else if (syncError.message) {
        message = syncError.message;
      }
      throw new Error(message);
    }

    return {
      data: {
        user: { id: userId, email: data.email, role: normalizedRole },
        session: authSession,
        role: normalizedRole,
        needsEmailVerification: needsVerification,
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
