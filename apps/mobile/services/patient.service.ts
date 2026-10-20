import api from '../lib/api';
import { supabase } from '../lib/supabase';

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
        .order('appointment_date', { ascending: true })
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
    return res.data?.data;
  },

  updateRecordConsent: async (recordId: string, isPublic: boolean) => {
    const res = await api.post(`/records/${recordId}/consent`, { is_public: isPublic });
    return res.data;
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
    reason?: string;
    pin: string;
  }) => {
    const res = await api.post('/appointments/book', payload);
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
      .select('id, full_name, clinic_name, clinic_phone, qualifications, consultation_hours, specialization, consultation_fee');

    if (error) {
      console.warn('Failed to fetch doctors list from Supabase:', error);
      return [];
    }
    return data ?? [];
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

  authorizePrescriptionDownload: async (prescriptionId: string, pin: string) => {
    const formData = new FormData();
    formData.append('pin', pin);

    const res = await api.post(`/prescriptions/${prescriptionId}/authorize-download`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.data;
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
    items?: Array<{ inventory_id: string; quantity: number }>;
    notes?: string;
  }) => {
    // 1. Try backend orders endpoint
    try {
      const res = await api.post('/orders', {
        pharmacy_id: payload.pharmacy_id,
        prescription_id: payload.prescription_id || null,
        delivery_address: payload.delivery_address,
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

    const trackingNumber = `TRK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabase
      .from('medicine_orders')
      .insert({
        patient_id: user.id,
        pharmacy_id: payload.pharmacy_id,
        prescription_id: payload.prescription_id || null,
        delivery_address: payload.delivery_address,
        status: 'PENDING',
        order_type: 'ONLINE_DELIVERY',
        total_amount: 0.0,
        tracking_number: trackingNumber,
      })
      .select()
      .single();

    if (error) {
      // In case table schema has fewer columns, fallback to minimal payload
      const { data: retryData, error: retryErr } = await supabase
        .from('medicine_orders')
        .insert({
          patient_id: user.id,
          pharmacy_id: payload.pharmacy_id,
          delivery_address: payload.delivery_address,
          status: 'PENDING',
        })
        .select()
        .single();
      if (retryErr) throw retryErr;
      return retryData;
    }

    return data;
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
    } else if (clean.includes('/verify/prescription/')) {
      const parts = clean.split('/verify/prescription/');
      clean = parts[parts.length - 1].split('?')[0].split('/')[0];
    }

    const isPharmacy =
      clean.startsWith('PHARM_') ||
      clean.startsWith('PHARM_QR_') ||
      token.includes('/verify/pharmacy/');

    const isBlockchain =
      clean.startsWith('0x') || clean.startsWith('QR-REC-');

    // 1. If Pharmacy QR, verify via pharmacy blockchain endpoint
    if (isPharmacy) {
      try {
        const res = await api.get('/pharmacy/verify-blockchain', {
          params: { qr_data: clean },
        });
        const d = res.data?.data;
        return {
          is_valid: true,
          type: 'PHARMACY',
          purpose: 'LICENSED_PHARMACY',
          business_name: d?.business_name || 'Verified Pharmacy',
          address: d?.address,
          city: d?.city,
          phone: d?.phone,
          verified_on_blockchain: d?.verified_on_blockchain ?? true,
          network: d?.network || 'Polygon Amoy Testnet',
          wallet_address: d?.wallet_address,
          transaction_hash: d?.transaction_hash,
          resource_id: d?.pharmacy_id || clean,
          message: 'Authentic Registered Pharmacy',
          data: d,
        };
      } catch (err: any) {
        // Fall back to general QR verify if pharmacy endpoint fails
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
      return {
        is_valid: Boolean(d?.is_valid),
        type: 'PRESCRIPTION',
        purpose: d?.purpose || 'PRESCRIPTION_ACCESS',
        resource_id: d?.resource_id || clean,
        message: d?.message || (d?.is_valid ? 'Authentic Prescription' : 'Verification Failed'),
        data: d?.data || d,
      };
    } catch (rxErr: any) {
      // If prescription check failed, but token might be a pharmacy identifier
      if (!isPharmacy) {
        try {
          const pharmRes = await api.get('/pharmacy/verify-blockchain', {
            params: { qr_data: clean },
          });
          const pd = pharmRes.data?.data;
          if (pd?.business_name) {
            return {
              is_valid: true,
              type: 'PHARMACY',
              purpose: 'LICENSED_PHARMACY',
              business_name: pd.business_name,
              address: pd.address,
              city: pd.city,
              phone: pd.phone,
              verified_on_blockchain: pd.verified_on_blockchain ?? true,
              network: pd.network || 'Polygon Amoy Testnet',
              wallet_address: pd.wallet_address,
              transaction_hash: pd.transaction_hash,
              resource_id: pd.pharmacy_id || clean,
              message: 'Authentic Registered Pharmacy',
              data: pd,
            };
          }
        } catch {
          // Ignore fallback error
        }
      }
      throw rxErr;
    }
  },
};
