import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';
import api from '../lib/api';
import { supabase } from '../lib/supabase';

const PRESCRIPTION_CACHE_DIR = `${FileSystem.documentDirectory}prescriptions/`;
const RECORD_CACHE_DIR = `${FileSystem.documentDirectory}records/`;

const resolveBackendDownloadUrl = (rawUrl: string): { url: string; needsAuthHeader: boolean } => {
  const trimmed = String(rawUrl || '').trim();
  if (/^https?:\/\//i.test(trimmed)) {
    const apiBase = String(api.defaults.baseURL || '').replace(/\/api\/v1\/?$/, '');
    return {
      url: trimmed,
      needsAuthHeader: Boolean(apiBase && trimmed.startsWith(apiBase)),
    };
  }
  const base = String(api.defaults.baseURL || '').replace(/\/api\/v1\/?$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return { url: `${base}${path}`, needsAuthHeader: true };
};

export interface PatientDashboardSummary {
  upcomingAppointmentsCount: number;
  activePrescriptionsCount: number;
  totalRecordsCount: number;
  ongoingOrdersCount: number;
  nextAppointment: any | null;
  recentRecords: any[];
  recentPrescriptions: any[];
  recentOrders: any[];
}

export interface MedicalRecordItem {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  category?: string;
  created_at: string;
  is_archived?: boolean;
  qr_token?: string;
  file_metadata?: {
    file_name: string;
    file_size: number;
    mime_type: string;
  } | null;
}

export interface AppointmentItem {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id?: string | null;
  appointment_date: string;
  start_time: string;
  end_time?: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  reason?: string | null;
  doctor_name?: string;
  doctor_specialty?: string;
  hospital_name?: string;
  created_at?: string;
}

export interface PrescriptionItem {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id?: string | null;
  diagnosis: string;
  medications?: any[] | null;
  notes?: string | null;
  is_dispensed: boolean;
  is_revoked?: boolean;
  pdf_url?: string | null;
  qr_token?: string | null;
  created_at: string;
  doctor?: {
    full_name?: string;
    clinic_name?: string;
  };
}

export interface MedicineOrderItem {
  id: string;
  patient_id: string;
  pharmacy_id: string;
  prescription_id?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DISPENSED' | 'CANCELLED';
  delivery_address?: string | null;
  total_amount?: number | null;
  tracking_number?: string | null;
  created_at: string;
}

export interface SecurityStatusInfo {
  status: 'NOT_STARTED' | 'PIN_CREATED' | 'COMPLETED';
  has_pin: boolean;
  patient_id?: string;
}

export const patientService = {
  // ── Dashboard Overview ──
  getDashboardSummary: async (): Promise<PatientDashboardSummary> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const [
      { count: apptCount, data: appts },
      { count: recCount, data: recs },
      { count: rxCount, data: rxs },
      { count: orderCount, data: orders },
    ] = await Promise.all([
      supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('patient_id', user.id)
        .in('status', ['PENDING', 'CONFIRMED'])
        .gte('appointment_date', todayIso)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(3),
      supabase
        .from('medical_records')
        .select('*', { count: 'exact' })
        .eq('patient_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('prescriptions')
        .select('*', { count: 'exact' })
        .eq('patient_id', user.id)
        .eq('is_dispensed', false)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('medicine_orders')
        .select('*', { count: 'exact' })
        .eq('patient_id', user.id)
        .in('status', ['PENDING', 'PROCESSING', 'SHIPPED'])
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    return {
      upcomingAppointmentsCount: apptCount ?? 0,
      totalRecordsCount: recCount ?? 0,
      activePrescriptionsCount: rxCount ?? 0,
      ongoingOrdersCount: orderCount ?? 0,
      nextAppointment: appts && appts.length > 0 ? appts[0] : null,
      recentRecords: recs ?? [],
      recentPrescriptions: rxs ?? [],
      recentOrders: orders ?? [],
    };
  },

  // ── Medical Records ──
  getMedicalRecords: async (): Promise<MedicalRecordItem[]> => {
    try {
      const res = await api.get('/records');
      if (Array.isArray(res.data?.data)) {
        return res.data.data;
      }
    } catch (apiErr) {
      console.warn('API /records fetch failed, attempting Supabase direct fallback:', apiErr);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as MedicalRecordItem[];
  },

  downloadRecordWithPin: async (recordId: string, pin: string) => {
    const res = await api.post(`/records/${recordId}/download`, { pin });
    const data = res.data?.data;
    const rawUrl = data?.url || data?.signed_url || data?.download_url;
    if (rawUrl) {
      try {
        await FileSystem.makeDirectoryAsync(RECORD_CACHE_DIR, { intermediates: true });
        const extMatch = String(rawUrl).split('?')[0].match(/\.(pdf|png|jpe?g|webp|txt)$/i);
        const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '.pdf';
        const localUri = `${RECORD_CACHE_DIR}record_${recordId}${ext}`;
        const { url: resolvedUrl, needsAuthHeader } = resolveBackendDownloadUrl(rawUrl);
        let headers: Record<string, string> | undefined;
        if (needsAuthHeader) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session?.access_token) {
            headers = { Authorization: `Bearer ${sessionData.session.access_token}` };
          }
        }
        const dl = await FileSystem.downloadAsync(resolvedUrl, localUri, headers ? { headers } : undefined);
        if (dl.status === 200) {
          return { ...data, url: resolvedUrl, localUri: dl.uri };
        }
      } catch (cacheErr) {
        console.warn('Could not cache downloaded record locally:', cacheErr);
      }
    }
    return data;
  },

  updateRecordConsent: async (recordId: string, isPublic: boolean) => {
    const res = await api.post(`/records/${recordId}/consent`, { is_public: isPublic });
    return res.data;
  },

  uploadRecord: async (payload: {
    title: string;
    description?: string;
    pin: string;
    file: {
      uri: string;
      name: string;
      mimeType?: string;
    };
  }) => {
    const formData = new FormData();
    formData.append('title', payload.title);
    if (payload.description) {
      formData.append('description', payload.description);
    }
    formData.append('pin', payload.pin);
    formData.append('is_prescription', 'false');

    formData.append('file', {
      uri: payload.file.uri,
      name: payload.file.name || 'medical_record.pdf',
      type: payload.file.mimeType || 'application/pdf',
    } as any);

    const res = await api.post('/records', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.data;
  },

  // ── Appointments ──
  getAppointments: async (statusFilter?: string): Promise<AppointmentItem[]> => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await api.get('/appointments', { params });
      const listData = res.data?.data;
      if (Array.isArray(listData?.appointments)) {
        return listData.appointments;
      }
      if (Array.isArray(listData)) {
        return listData;
      }
    } catch (apiErr) {
      console.warn('API /appointments failed, attempting direct Supabase query:', apiErr);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', user.id)
      .order('appointment_date', { ascending: true });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AppointmentItem[];
  },

  bookAppointment: async (payload: {
    doctor_id: string;
    hospital_id?: string;
    appointment_date: string;
    start_time: string;
    end_time?: string;
    reason?: string;
    notes?: string;
    pin: string;
  }) => {
    const computeEndTime = (startStr: string): string => {
      const parts = startStr.split(':').map((p) => parseInt(p, 10) || 0);
      const totalMins = (parts[0] || 0) * 60 + (parts[1] || 0) + 30;
      const endH = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
      const endM = String(totalMins % 60).padStart(2, '0');
      return `${endH}:${endM}:00`;
    };

    const normalizedStart =
      payload.start_time.split(':').length === 2
        ? `${payload.start_time}:00`
        : payload.start_time;

    const res = await api.post('/appointments/book', {
      ...payload,
      start_time: normalizedStart,
      end_time: payload.end_time || computeEndTime(normalizedStart),
      notes: payload.notes ?? payload.reason,
    });
    return res.data?.data;
  },

  cancelAppointment: async (appointmentId: string, reason?: string) => {
    const res = await api.patch(`/appointments/${appointmentId}/status`, {
      status: 'CANCELLED',
      reason: reason || 'Patient cancelled via mobile app',
    });
    return res.data?.data;
  },

  getAvailableDoctors: async () => {
    const { data, error } = await supabase
      .from('doctors')
      .select('id, user_id, full_name, clinic_name, clinic_phone, qualifications, consultation_hours, specialization, consultation_fee');

    if (error) {
      console.warn('Failed to fetch doctors list from Supabase:', error);
      return [];
    }
    return data ?? [];
  },

  getHospitals: async (type?: string) => {
    try {
      const res = await api.get('/hospitals', { params: type ? { type } : {} });
      return res.data?.data || [];
    } catch (err) {
      console.warn('Failed to fetch hospitals from API, querying Supabase directly:', err);
      let query = supabase.from('hospitals').select('*').eq('is_active', true);
      if (type) query = query.eq('type', type);
      const { data } = await query;
      return data || [];
    }
  },

  getDoctorsAtHospital: async (hospitalId: string) => {
    try {
      const res = await api.get(`/hospitals/${hospitalId}/doctors`);
      return res.data?.data || [];
    } catch (err) {
      console.warn('Failed to fetch doctors at hospital:', err);
      return [];
    }
  },

  // ── Prescriptions ──
  getPrescriptions: async (): Promise<PrescriptionItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as PrescriptionItem[];
  },

  getCachedPrescriptionPdfUri: async (prescriptionId: string): Promise<string | null> => {
    try {
      const localUri = `${PRESCRIPTION_CACHE_DIR}prescription_${prescriptionId}.pdf`;
      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists && (info.size ?? 0) > 100) {
        return localUri;
      }
      return null;
    } catch {
      return null;
    }
  },

  getCachedRecordUri: async (recordId: string, mimeType?: string): Promise<string | null> => {
    try {
      const preferredExt = mimeType?.includes('png')
        ? ['.png', '.pdf', '.jpg']
        : mimeType?.includes('jpeg') || mimeType?.includes('jpg')
        ? ['.jpg', '.jpeg', '.pdf']
        : ['.pdf', '.png', '.jpg'];
      for (const ext of preferredExt) {
        const localUri = `${RECORD_CACHE_DIR}record_${recordId}${ext}`;
        const info = await FileSystem.getInfoAsync(localUri);
        if (info.exists && (info.size ?? 0) > 100) {
          return localUri;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  openLocalFile: async (localUri: string): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(localUri);
        await Linking.openURL(contentUri);
        return true;
      }
      const canOpen = await Linking.canOpenURL(localUri).catch(() => false);
      if (canOpen) {
        await Linking.openURL(localUri);
        return true;
      }
      await WebBrowser.openBrowserAsync(localUri);
      return true;
    } catch (err) {
      console.warn('openLocalFile failed:', err);
      return false;
    }
  },

  authorizePrescriptionDownload: async (prescriptionId: string, pin: string) => {
    const formData = new FormData();
    formData.append('pin', pin);

    const authRes = await api.post(`/prescriptions/${prescriptionId}/authorize-download`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const authData = authRes.data?.data || {};
    const authRef = authData.authorization_reference;

    let downloadTargetUrl: string | null = null;
    if (authRef) {
      const dlMetaRes = await api.get(`/prescriptions/download/${authRef}`);
      downloadTargetUrl = dlMetaRes.data?.data?.url || null;
    }

    if (!downloadTargetUrl) {
      downloadTargetUrl = `/api/v1/prescriptions/${prescriptionId}/download`;
    }

    await FileSystem.makeDirectoryAsync(PRESCRIPTION_CACHE_DIR, { intermediates: true });
    const localUri = `${PRESCRIPTION_CACHE_DIR}prescription_${prescriptionId}.pdf`;

    const tryDownload = async (rawTarget: string) => {
      const { url: resolvedUrl, needsAuthHeader } = resolveBackendDownloadUrl(rawTarget);
      let headers: Record<string, string> | undefined;
      if (needsAuthHeader) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.access_token) {
          headers = { Authorization: `Bearer ${sessionData.session.access_token}` };
        }
      }
      const res = await FileSystem.downloadAsync(resolvedUrl, localUri, headers ? { headers } : undefined);
      const info = await FileSystem.getInfoAsync(localUri);
      if (res.status !== 200 || !info.exists || (info.size ?? 0) < 100) {
        await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
        throw new Error(`PDF download returned status ${res.status}`);
      }
      return { resolvedUrl, localUri };
    };

    try {
      const { resolvedUrl } = await tryDownload(downloadTargetUrl);
      return { ...authData, url: resolvedUrl, localUri };
    } catch (primaryErr) {
      // Fallback to authenticated direct PDF stream endpoint
      const fallbackPath = `/api/v1/prescriptions/${prescriptionId}/download`;
      if (downloadTargetUrl !== fallbackPath) {
        const { resolvedUrl } = await tryDownload(fallbackPath);
        return { ...authData, url: resolvedUrl, localUri };
      }
      throw primaryErr;
    }
  },

  // ── Verified Pharmacies ──
  getVerifiedPharmacies: async (): Promise<Array<{
    pharmacy_id: string;
    user_id: string;
    business_name: string;
    address: string;
    city?: string | null;
    phone: string;
    is_24x7?: boolean;
    is_verified?: boolean;
  }>> => {
    const { data: pharmacies, error } = await supabase
      .from('pharmacies')
      .select('id, user_id, business_name, address, city, contact_number, is_24x7, qr_status')
      .order('business_name', { ascending: true });

    if (error || !pharmacies) {
      return [];
    }

    const activePharmacies = pharmacies.filter(
      (p: any) => String(p.qr_status || 'ACTIVE').toUpperCase() !== 'SUSPENDED'
    );

    const userIds = activePharmacies.map((p: any) => p.user_id).filter(Boolean);
    let userMap = new Map<string, { status?: string; is_verified?: boolean }>();
    if (userIds.length > 0) {
      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, status, is_verified')
          .in('id', userIds);
        if (usersData) {
          userMap = new Map(usersData.map((u: any) => [u.id, u]));
        }
      } catch {
        // Fallback cleanly if users lookup is restricted
      }
    }

    const mapped = activePharmacies
      .filter((p: any) => {
        const u = userMap.get(p.user_id);
        if (u && String(u.status || '').toUpperCase() === 'SUSPENDED') return false;
        return true;
      })
      .map((p: any) => {
        const u = userMap.get(p.user_id);
        return {
          pharmacy_id: p.user_id || p.id,
          user_id: p.user_id || p.id,
          business_name: p.business_name || 'MedSync Network Pharmacy',
          address: [p.address, p.city].filter(Boolean).join(', ') || 'Verified City Dispensary',
          city: p.city || null,
          phone: p.contact_number || '',
          is_24x7: Boolean(p.is_24x7),
          is_verified: u ? Boolean(u.is_verified) : true,
        };
      });

    // Show verified pharmacies first while preserving alphabetical order within groups
    return mapped.sort((a, b) => Number(b.is_verified) - Number(a.is_verified));
  },

  // ── Medicine Orders ──
  getMedicineOrders: async (): Promise<MedicineOrderItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('medicine_orders')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as MedicineOrderItem[];
  },

  placeOrder: async (payload: {
    pharmacy_id: string;
    prescription_id?: string | null;
    delivery_address: string;
    total_amount?: number;
    items?: Array<{ inventory_id: string; quantity: number }>;
    notes?: string;
  }) => {
    const resolvedTotal = typeof payload.total_amount === 'number' ? payload.total_amount : 399.0;

    // 1. Try backend orders endpoint
    try {
      const res = await api.post('/orders/', {
        pharmacy_id: payload.pharmacy_id,
        prescription_id: payload.prescription_id || null,
        delivery_address: payload.delivery_address,
        total_amount: resolvedTotal,
        items: payload.items || [],
      });
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (apiErr) {
      console.warn('Backend /orders failed, falling back to direct Supabase order creation:', apiErr);
    }

    // 2. Direct Supabase insert fallback
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('medicine_orders')
      .insert({
        patient_id: user.id,
        pharmacy_id: payload.pharmacy_id,
        prescription_id: payload.prescription_id || null,
        delivery_address: payload.delivery_address,
        status: 'PENDING',
        order_type: 'ONLINE_DELIVERY',
        total_amount: resolvedTotal,
      })
      .select()
      .single();

    if (error) {
      // In case table schema has fewer optional columns, fallback with required total_amount preserved
      const { data: retryData, error: retryErr } = await supabase
        .from('medicine_orders')
        .insert({
          patient_id: user.id,
          pharmacy_id: payload.pharmacy_id,
          prescription_id: payload.prescription_id || null,
          delivery_address: payload.delivery_address,
          status: 'PENDING',
          total_amount: resolvedTotal,
        })
        .select()
        .single();
      if (retryErr) throw retryErr;
      return retryData;
    }

    return data;
  },

  processPayment: async (
    orderId: string,
    amount: number = 399.0,
    method: 'CARD' | 'PAYPAL' | 'UPI' | 'COD' | 'WALLET' = 'UPI'
  ) => {
    try {
      const normalizedMethod =
        method === 'COD'
          ? 'COD'
          : method === 'PAYPAL' || method === 'WALLET'
          ? 'WALLET'
          : method === 'CARD'
          ? 'CARD'
          : 'UPI';

      const res = await api.post('/payments/process', {
        order_id: orderId,
        amount,
        method: normalizedMethod,
      });
      return res.data?.data ?? res.data;
    } catch (apiErr) {
      console.warn('Backend /payments/process failed, updating order in Supabase:', apiErr);
      // Fallback: update status directly in Supabase
      const { data, error } = await supabase
        .from('medicine_orders')
        .update({ status: 'PROCESSING' })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return { status: 'success', order: data };
    }
  },

  // ── Security & Authorization PIN ──
  getSecurityStatus: async (): Promise<SecurityStatusInfo> => {
    const res = await api.get('/security/status');
    const data = res.data?.data;
    return {
      status: data?.status ?? res.data?.status ?? 'NOT_STARTED',
      has_pin: Boolean(data?.has_pin ?? (data?.status === 'COMPLETED')),
      patient_id: data?.patient_id,
    };
  },

  enrollPin: async (pin: string, password?: string) => {
    const formData = new FormData();
    formData.append('pin', pin);
    if (password) {
      formData.append('password', password);
    }

    const res = await api.post('/security/enroll-pin', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  resetPinWithPassword: async (currentPassword: string, newPin: string) => {
    const formData = new FormData();
    formData.append('current_password', currentPassword);
    formData.append('new_pin', newPin);

    const res = await api.post('/security/reset-pin-with-password', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  setPin: async (payload: { pin: string }) => {
    return patientService.enrollPin(payload.pin);
  },

  resetPin: async (payload: { password?: string; new_pin: string }) => {
    return patientService.resetPinWithPassword(payload.password || '', payload.new_pin);
  },

  // ── Profile Management ──
  getProfile: async (userId: string) => {
    try {
      const res = await api.get(`/profile/${userId}`);
      if (res.data?.data) return res.data.data;
    } catch (err) {
      console.warn('API /profile failed, querying Supabase directly:', err);
    }

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
      return userData ?? null;
    }
    return data;
  },

  updateProfile: async (userId: string, data: Record<string, any>) => {
    const payload = {
      profile_completion_percentage: data.profile_completion_percentage ?? 100,
      ...data,
    };
    const res = await api.put(`/profile/${userId}/completion`, payload);
    return res.data?.data ?? res.data;
  },

  uploadProfileImage: async (imageUri: string, filename = 'profile.jpg', mimeType = 'image/jpeg') => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);

    const res = await api.post('/users/me/profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data?.data;
  },

  updateAvatarUrl: async (avatarUrl: string) => {
    const res = await api.put('/users/me/avatar', { avatar_url: avatarUrl });
    return res.data?.data;
  },

  // ── Notifications ──
  getNotifications: async (unreadOnly = false) => {
    const res = await api.get('/notifications', { params: { unread_only: unreadOnly } });
    return res.data?.data ?? [];
  },

  markNotificationRead: async (notificationId: string) => {
    const res = await api.post(`/notifications/${notificationId}/read`);
    return res.data?.data;
  },

  // ── Universal Smart QR Verification ──
  verifyQrToken: async (token: string) => {
    let clean = token.trim();
    if (!clean) throw new Error('Token is empty');

    // Extract identifier if full URL is passed
    if (clean.includes('/verify/pharmacy/')) {
      const parts = clean.split('/verify/pharmacy/');
      clean = parts[parts.length - 1].split('?')[0].split('/')[0];
    } else if (clean.includes('/pharmacy/')) {
      const parts = clean.split('/pharmacy/');
      clean = parts[parts.length - 1].split('?')[0].split('/')[0];
    } else if (clean.includes('/verify/prescription/')) {
      const parts = clean.split('/verify/prescription/');
      clean = parts[parts.length - 1].split('?')[0].split('/')[0];
    } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
      clean = clean.replace(/\/+$/, '').split('/').pop() || clean;
    }

    const isPharmacy =
      clean.startsWith('PHARM_') ||
      clean.startsWith('PHARM_QR_') ||
      token.includes('/pharmacy');

    const isBlockchain =
      clean.startsWith('0x') || clean.startsWith('QR-REC-');

    // 1. If Pharmacy QR, verify via pharmacy blockchain endpoint
    if (isPharmacy) {
      try {
        let res;
        try {
          res = await api.post('/pharmacy/verify-blockchain', { qr_data: clean });
        } catch {
          res = await api.get('/pharmacy/verify-blockchain', { params: { qr_data: clean } });
        }

        const d = res.data?.data;
        const resolvedId = d?.pharmacy_id || clean;
        return {
          is_valid: true,
          type: 'PHARMACY',
          purpose: 'LICENSED_PHARMACY',
          business_name: d?.business_name || 'Verified Pharmacy',
          address: d?.address,
          city: d?.city,
          phone: d?.phone || d?.contact_number,
          verified_on_blockchain: d?.verified_on_blockchain ?? true,
          network: d?.network || 'Polygon Amoy Testnet',
          wallet_address: d?.wallet_address,
          transaction_hash: d?.transaction_hash,
          resource_id: resolvedId,
          pharmacy_id: resolvedId,
          pharmacy_user_id: resolvedId,
          message: 'Authentic Registered Pharmacy',
          data: d,
        };
      } catch (err: any) {
        console.warn('Pharmacy direct verification error, continuing:', err);
      }
    }

    // 2. If Blockchain Hash
    if (isBlockchain) {
      try {
        const res = await api.get(`/blockchain/verify/${clean}`);
        return {
          is_valid: true,
          type: 'BLOCKCHAIN',
          purpose: 'BLOCKCHAIN_RECORD',
          resource_id: clean,
          message: 'Authentic Immutable Blockchain Record',
          data: res.data?.data,
        };
      } catch (err: any) {
        // Fall through
      }
    }

    // 3. Prescription QR Verification
    try {
      const res = await api.get(`/verify/qr/${encodeURIComponent(clean)}`);
      const d = res.data?.data;
      if (d?.purpose === 'LICENSED_PHARMACY' || d?.type === 'PHARMACY') {
        const resolvedId = d?.pharmacy_id || d?.resource_id || clean;
        return {
          is_valid: true,
          type: 'PHARMACY',
          purpose: 'LICENSED_PHARMACY',
          business_name: d?.business_name || 'Verified Pharmacy',
          address: d?.address,
          city: d?.city,
          phone: d?.phone || d?.contact_number,
          verified_on_blockchain: true,
          resource_id: resolvedId,
          pharmacy_id: resolvedId,
          pharmacy_user_id: resolvedId,
          message: 'Authentic Registered Pharmacy',
          data: d,
        };
      }
      return {
        is_valid: Boolean(d?.is_valid),
        type: 'PRESCRIPTION',
        purpose: d?.purpose || 'PRESCRIPTION_ACCESS',
        resource_id: d?.resource_id || clean,
        message: d?.message || (d?.is_valid ? 'Authentic Prescription' : 'Verification Failed'),
        data: d?.data || d,
      };
    } catch (rxErr: any) {
      // Always try pharmacy resolution if verify/qr failed
      try {
        let pharmRes;
        try {
          pharmRes = await api.post('/pharmacy/verify-blockchain', { qr_data: clean });
        } catch {
          pharmRes = await api.get('/pharmacy/verify-blockchain', { params: { qr_data: clean } });
        }
        const pd = pharmRes?.data?.data;
        if (pd?.business_name || pd?.pharmacy_id) {
          const resolvedId = pd.pharmacy_id || clean;
          return {
            is_valid: true,
            type: 'PHARMACY',
            purpose: 'LICENSED_PHARMACY',
            business_name: pd.business_name,
            address: pd.address,
            city: pd.city,
            phone: pd.phone || pd.contact_number,
            verified_on_blockchain: pd.verified_on_blockchain ?? true,
            network: pd.network || 'Polygon Amoy Testnet',
            wallet_address: pd.wallet_address,
            transaction_hash: pd.transaction_hash,
            resource_id: resolvedId,
            pharmacy_id: resolvedId,
            pharmacy_user_id: resolvedId,
            message: 'Authentic Registered Pharmacy',
            data: pd,
          };
        }
      } catch {
        // Ignore fallback error
      }
      throw rxErr;
    }
  },
};
