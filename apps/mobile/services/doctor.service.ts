import api from '../lib/api';
import { supabase } from '../lib/supabase';

export interface DoctorAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  end_time?: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | 'RESCHEDULED';
  reason?: string | null;
  patient_name?: string;
  patient_phone?: string;
  patient_dob?: string;
  patient_gender?: string;
  patient_blood_group?: string;
  patient_picture?: string;
  created_at?: string;
}

export interface DoctorDashboardSummary {
  todayAppointmentsCount: number;
  pendingPrescriptionsCount: number;
  totalPatientsCount: number;
  consultationFee: number;
  todayRevenue: number;
  todayAppointments: DoctorAppointment[];
  recentPrescriptions: any[];
}

export interface DoctorPatient {
  user_id: string;
  full_name: string;
  gender?: string | null;
  date_of_birth?: string | null;
  blood_group?: string | null;
  phone_number?: string | null;
  contact_number?: string | null;
  emergency_contact_number?: string | null;
  address?: string | null;
  allergies?: string | null;
  profile_picture_url?: string | null;
  last_visit_date?: string | null;
}

export interface DoctorNoteItem {
  id: string;
  doctor_id: string;
  note_text: string;
  created_at: string;
}

export interface DoctorAccessibleRecord {
  id: string;
  title: string;
  description?: string | null;
  patient_id: string;
  patient_name: string;
  patient_gender?: string | null;
  patient_dob?: string | null;
  patient_blood_group?: string | null;
  patient_phone?: string | null;
  uploaded_by: string;
  created_at: string;
  is_public: boolean;
  is_direct_shared: boolean;
  doctor_notes: DoctorNoteItem[];
  latest_interaction_at?: string | null;
}

export interface DoctorProfile {
  user_id: string;
  full_name: string;
  specialization?: string | null;
  experience_years?: number | null;
  bio?: string | null;
  qualifications?: string | null;
  medical_council_reg_number?: string | null;
  license_number?: string | null;
  consultation_fee?: number | null;
  consultation_hours?: string | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  clinic_phone?: string | null;
  clinic_email?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  is_accepting_appointments: boolean;
  doctor_status?: string | null;
  blockchain_status?: string | null;
  blockchain_tx_hash?: string | null;
  user_email?: string | null;
}

export interface PrescriptionItemInput {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
}

export interface CreatePrescriptionPayload {
  appointment_id?: string;
  patient_id: string;
  diagnosis: string;
  notes?: string;
  items: PrescriptionItemInput[];
  pin: string;
  routed_pharmacy_id?: string;
}

export interface MedicineCatalogItem {
  id: string;
  name: string;
  generic_name?: string | null;
  brand_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
}

export interface PharmacyItem {
  user_id: string;
  full_name: string;
  business_name?: string | null;
  license_number?: string | null;
  address?: string | null;
  city?: string | null;
  phone_number?: string | null;
  email?: string | null;
  is_verified?: boolean;
  isLinked?: boolean;
}

export interface PinSecurityStatus {
  has_pin: boolean;
  status: 'NOT_STARTED' | 'PIN_CREATED' | 'COMPLETED';
}

export const doctorService = {
  // ── Dashboard Overview ──
  getDashboardSummary: async (): Promise<DoctorDashboardSummary> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch live counts and schedule concurrently
    const [
      docRes,
      todayApptsRes,
      prescriptionsRes,
      allApptsRes,
    ] = await Promise.all([
      supabase.from('doctors').select('consultation_fee').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('doctor_id', user.id)
        .eq('appointment_date', todayStr)
        .order('start_time', { ascending: true }),
      supabase
        .from('prescriptions')
        .select('*', { count: 'exact' })
        .eq('doctor_id', user.id)
        .eq('is_dispensed', false)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', user.id),
    ]);

    const fee = docRes.data?.consultation_fee && docRes.data.consultation_fee > 0 ? docRes.data.consultation_fee : 500;
    const todayCount = todayApptsRes.count || 0;
    const pendingPresCount = prescriptionsRes.count || 0;

    // Distinct patients
    const uniquePatientIds = Array.from(
      new Set((allApptsRes.data || []).map((a: any) => a.patient_id).filter(Boolean))
    );
    const totalPatientsCount = uniquePatientIds.length;

    // Enrich today's appointments with patient info
    let enrichedTodayAppts: DoctorAppointment[] = [];
    const rawAppts = todayApptsRes.data || [];

    if (rawAppts.length > 0) {
      const patientIds = Array.from(new Set(rawAppts.map((a: any) => a.patient_id)));
      const { data: patientsData } = await supabase
        .from('patients')
        .select('user_id, full_name, phone_number, contact_number, profile_picture_url, date_of_birth, gender, blood_group')
        .in('user_id', patientIds);

      const patMap = new Map((patientsData || []).map((p: any) => [p.user_id, p]));

      enrichedTodayAppts = rawAppts.map((a: any) => {
        const pat = patMap.get(a.patient_id);
        return {
          id: a.id,
          patient_id: a.patient_id,
          doctor_id: a.doctor_id,
          appointment_date: a.appointment_date,
          start_time: a.start_time,
          end_time: a.end_time,
          status: a.status,
          reason: a.notes || a.reason,
          patient_name: pat?.full_name || 'Patient',
          patient_phone: pat?.phone_number || pat?.contact_number,
          patient_dob: pat?.date_of_birth,
          patient_gender: pat?.gender,
          patient_blood_group: pat?.blood_group,
          patient_picture: pat?.profile_picture_url,
          created_at: a.created_at,
        };
      });
    }

    const todayRevenue = todayCount * fee;

    return {
      todayAppointmentsCount: todayCount,
      pendingPrescriptionsCount: pendingPresCount,
      totalPatientsCount: totalPatientsCount,
      consultationFee: fee,
      todayRevenue: todayRevenue,
      todayAppointments: enrichedTodayAppts,
      recentPrescriptions: prescriptionsRes.data || [],
    };
  },

  // ── Appointments Queue & Schedule ──
  getAppointments: async (statusFilter?: string, date?: string): Promise<DoctorAppointment[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // 1. Try FastAPI endpoint first
    try {
      const params: any = {};
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      if (date) {
        params.date_from = date;
        params.date_to = date;
      }
      const res = await api.get('/appointments', { params });
      const apiAppts = res.data?.data?.appointments;
      if (Array.isArray(apiAppts)) {
        // Collect patient IDs to enrich with profile information
        const pIds = Array.from(new Set(apiAppts.map((a: any) => a.patient_id).filter(Boolean)));
        let patMap = new Map<string, any>();
        if (pIds.length > 0) {
          const { data: pats } = await supabase
            .from('patients')
            .select('user_id, full_name, phone_number, contact_number, profile_picture_url, date_of_birth, gender, blood_group')
            .in('user_id', pIds);
          patMap = new Map((pats || []).map((p: any) => [p.user_id, p]));
        }

        return apiAppts.map((a: any) => {
          const pat = patMap.get(a.patient_id);
          return {
            id: a.id,
            patient_id: a.patient_id,
            doctor_id: a.doctor_id,
            appointment_date: a.appointment_date,
            start_time: a.start_time,
            end_time: a.end_time,
            status: a.status,
            reason: a.reason || a.notes,
            patient_name: pat?.full_name || a.patient_name || 'Patient',
            patient_phone: pat?.phone_number || pat?.contact_number,
            patient_dob: pat?.date_of_birth,
            patient_gender: pat?.gender,
            patient_blood_group: pat?.blood_group,
            patient_picture: pat?.profile_picture_url,
            created_at: a.created_at,
          };
        });
      }
    } catch {
      // Fallback directly to Supabase
    }

    // Supabase query
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', user.id);

    if (statusFilter && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }
    if (date) {
      query = query.eq('appointment_date', date);
    }

    query = query.order('appointment_date', { ascending: true }).order('start_time', { ascending: true });

    const { data: rawAppts, error } = await query;
    if (error) throw error;
    if (!rawAppts || rawAppts.length === 0) return [];

    const pIds = Array.from(new Set(rawAppts.map((a: any) => a.patient_id).filter(Boolean)));
    const { data: pats } = await supabase
      .from('patients')
      .select('user_id, full_name, phone_number, contact_number, profile_picture_url, date_of_birth, gender, blood_group')
      .in('user_id', pIds);

    const patMap = new Map((pats || []).map((p: any) => [p.user_id, p]));

    return rawAppts.map((a: any) => {
      const pat = patMap.get(a.patient_id);
      return {
        id: a.id,
        patient_id: a.patient_id,
        doctor_id: a.doctor_id,
        appointment_date: a.appointment_date,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        reason: a.notes || a.reason,
        patient_name: pat?.full_name || 'Patient',
        patient_phone: pat?.phone_number || pat?.contact_number,
        patient_dob: pat?.date_of_birth,
        patient_gender: pat?.gender,
        patient_blood_group: pat?.blood_group,
        patient_picture: pat?.profile_picture_url,
        created_at: a.created_at,
      };
    });
  },

  updateAppointmentStatus: async (
    appointmentId: string,
    status: 'CONFIRMED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED',
    reason?: string
  ): Promise<void> => {
    try {
      await api.patch(`/appointments/${appointmentId}/status`, { status, reason });
    } catch {
      const { error } = await supabase
        .from('appointments')
        .update({ status, reason: reason || null, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);
      if (error) throw error;
    }
  },

  rescheduleAppointment: async (
    appointmentId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    reason?: string
  ): Promise<void> => {
    try {
      await api.put(`/appointments/${appointmentId}/reschedule`, {
        new_date: newDate,
        new_start_time: newStartTime,
        new_end_time: newEndTime,
        reason: reason || undefined,
      });
    } catch {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate,
          start_time: newStartTime,
          end_time: newEndTime,
          status: 'RESCHEDULED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);
      if (error) throw error;
    }
  },

  // ── Authorized Patients Roster ──
  getAuthorizedPatients: async (searchQuery?: string): Promise<DoctorPatient[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // Gather patient IDs from 3 sources:
    // 1. Appointments
    // 2. Prescriptions
    // 3. Granted permissions
    const [apptsRes, presRes, permsRes] = await Promise.all([
      supabase.from('appointments').select('patient_id, appointment_date').eq('doctor_id', user.id),
      supabase.from('prescriptions').select('patient_id, created_at').eq('doctor_id', user.id),
      supabase.from('record_permissions').select('medical_records:record_id(patient_id)').eq('granted_to', user.id).eq('is_revoked', false),
    ]);

    const apptPatientMap = new Map<string, string>();
    (apptsRes.data || []).forEach((a: any) => {
      if (a.patient_id) {
        const existing = apptPatientMap.get(a.patient_id);
        if (!existing || a.appointment_date > existing) {
          apptPatientMap.set(a.patient_id, a.appointment_date);
        }
      }
    });

    const presPatientIds = (presRes.data || []).map((p: any) => p.patient_id).filter(Boolean);
    const permPatientIds = (permsRes.data || []).map((p: any) => p?.medical_records?.patient_id).filter(Boolean);

    const distinctIds = Array.from(
      new Set([...Array.from(apptPatientMap.keys()), ...presPatientIds, ...permPatientIds])
    );

    if (distinctIds.length === 0) return [];

    let query = supabase.from('patients').select('*').in('user_id', distinctIds);

    const { data: patientsData, error } = await query;
    if (error) throw error;
    if (!patientsData) return [];

    let result: DoctorPatient[] = patientsData.map((p: any) => ({
      user_id: p.user_id,
      full_name: p.full_name || 'Patient',
      gender: p.gender,
      date_of_birth: p.date_of_birth,
      blood_group: p.blood_group,
      phone_number: p.phone_number || p.contact_number,
      contact_number: p.contact_number || p.phone_number,
      emergency_contact_number: p.emergency_contact_number,
      address: p.address,
      allergies: p.allergies,
      profile_picture_url: p.profile_picture_url,
      last_visit_date: apptPatientMap.get(p.user_id) || null,
    }));

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          (p.phone_number && p.phone_number.includes(q)) ||
          (p.blood_group && p.blood_group.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => a.full_name.localeCompare(b.full_name));
  },

  // ── Accessible Medical Records & Clinical Notes ──
  getAccessibleRecords: async (patientId?: string): Promise<DoctorAccessibleRecord[]> => {
    try {
      const params: any = {};
      if (patientId) params.patient_id = patientId;
      const res = await api.get('/records/doctor-records', { params });
      return res.data?.data || [];
    } catch (err) {
      console.error('Failed to fetch doctor accessible records:', err);
      return [];
    }
  },

  addClinicalNote: async (recordId: string, noteText: string): Promise<DoctorNoteItem> => {
    if (!noteText.trim()) throw new Error('Note text cannot be empty');
    const res = await api.post(`/records/${recordId}/notes`, { note_text: noteText.trim() });
    return res.data?.data;
  },

  // ── Prescriptions Creation & Signing ──
  createPrescription: async (payload: CreatePrescriptionPayload): Promise<any> => {
    if (!payload.pin || payload.pin.length !== 6) {
      throw new Error('A valid 6-digit Doctor Authorization PIN is required.');
    }
    if (!payload.diagnosis.trim()) {
      throw new Error('Diagnosis is required.');
    }
    if (!payload.items || payload.items.length === 0) {
      throw new Error('At least one medication is required.');
    }

    const res = await api.post('/prescriptions/', {
      appointment_id: payload.appointment_id || undefined,
      patient_id: payload.patient_id,
      diagnosis: payload.diagnosis.trim(),
      notes: payload.notes?.trim() || undefined,
      items: payload.items,
      pin: payload.pin,
      routed_pharmacy_id: payload.routed_pharmacy_id || undefined,
    });
    return res.data?.data;
  },

  getMedicines: async (search?: string): Promise<MedicineCatalogItem[]> => {
    try {
      const params: any = { limit: 50 };
      if (search) params.search = search;
      const res = await api.get('/medicines/', { params });
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  // ── Doctor Profile & Practice Settings ──
  getDoctorProfile: async (): Promise<DoctorProfile> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { data: docData, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return {
      user_id: user.id,
      full_name: docData?.full_name || user.user_metadata?.full_name || 'Doctor',
      specialization: docData?.specialization,
      experience_years: docData?.experience_years || 0,
      bio: docData?.bio,
      qualifications: docData?.qualifications,
      medical_council_reg_number: docData?.medical_council_reg_number,
      license_number: docData?.license_number,
      consultation_fee: docData?.consultation_fee || 500,
      consultation_hours: docData?.consultation_hours || '09:00 AM - 05:00 PM',
      clinic_name: docData?.clinic_name,
      clinic_address: docData?.clinic_address,
      clinic_phone: docData?.clinic_phone,
      clinic_email: docData?.clinic_email,
      city: docData?.city,
      state: docData?.state,
      country: docData?.country || 'India',
      pincode: docData?.pincode,
      is_accepting_appointments: docData?.is_accepting_appointments ?? true,
      doctor_status: docData?.doctor_status || 'ACTIVE',
      blockchain_status: docData?.blockchain_status,
      blockchain_tx_hash: docData?.blockchain_tx_hash,
      user_email: user.email,
    };
  },

  updateDoctorProfile: async (data: Partial<DoctorProfile>): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const payload: any = {
      full_name: data.full_name,
      specialization: data.specialization,
      experience_years: data.experience_years ? parseInt(String(data.experience_years), 10) : 0,
      bio: data.bio,
      qualifications: data.qualifications,
      medical_council_reg_number: data.medical_council_reg_number,
      license_number: data.license_number,
      city: data.city,
      state: data.state,
      country: data.country || 'India',
      pincode: data.pincode,
      consultation_fee: data.consultation_fee ? parseInt(String(data.consultation_fee), 10) : 0,
      consultation_hours: data.consultation_hours,
      clinic_name: data.clinic_name,
      clinic_address: data.clinic_address,
      clinic_phone: data.clinic_phone,
      clinic_email: data.clinic_email,
    };

    // 1. Try FastAPI profile completion endpoint
    try {
      await api.put(`/profile/${user.id}/completion`, payload);
    } catch {
      // Direct Supabase update
    }

    // 2. Direct Supabase update for immediate consistency
    const { error } = await supabase
      .from('doctors')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  setAcceptingAppointments: async (accepts: boolean): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { error } = await supabase
      .from('doctors')
      .update({ is_accepting_appointments: accepts, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  // ── PIN Security Management ──
  getPinSecurityStatus: async (): Promise<PinSecurityStatus> => {
    try {
      const res = await api.get('/security/status');
      return {
        has_pin: Boolean(res.data?.data?.has_pin),
        status: res.data?.data?.status || (res.data?.data?.has_pin ? 'PIN_CREATED' : 'NOT_STARTED'),
      };
    } catch {
      return { has_pin: false, status: 'NOT_STARTED' };
    }
  },

  enrollPin: async (pin: string, confirmPin: string, password: string): Promise<void> => {
    if (pin.length !== 6 || confirmPin.length !== 6) {
      throw new Error('PIN must be exactly 6 digits.');
    }
    if (pin !== confirmPin) {
      throw new Error('PIN and Confirm PIN do not match.');
    }
    if (!password) {
      throw new Error('Current account password is required.');
    }

    const formData = new FormData();
    formData.append('pin', pin);
    formData.append('password', password);

    await api.post('/security/enroll-pin', formData);
  },

  resetPin: async (newPin: string, confirmPin: string, password: string): Promise<void> => {
    if (newPin.length !== 6 || confirmPin.length !== 6) {
      throw new Error('PIN must be exactly 6 digits.');
    }
    if (newPin !== confirmPin) {
      throw new Error('PIN and Confirm PIN do not match.');
    }
    if (!password) {
      throw new Error('Current account password is required.');
    }

    const formData = new FormData();
    formData.append('new_pin', newPin);
    formData.append('current_password', password);

    await api.post('/security/reset-pin-with-password', formData);
  },

  // ── Verified Pharmacies Network ──
  getPharmacies: async (searchQuery?: string): Promise<PharmacyItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const [docRes, pharmsRes] = await Promise.all([
      supabase.from('doctors').select('hospital_id, clinic_name').eq('user_id', user.id).maybeSingle(),
      supabase.from('pharmacies').select('*'),
    ]);

    const doctorProfile = docRes.data;
    const pharmacyProfiles = pharmsRes.data || [];

    if (pharmacyProfiles.length === 0) return [];

    const userIds = pharmacyProfiles.map((p) => p.user_id);
    const { data: usersData } = await supabase
      .from('users')
      .select('id, full_name, email, status, is_verified')
      .in('id', userIds)
      .eq('status', 'ACTIVE');

    const userMap = new Map((usersData || []).map((u: any) => [u.id, u]));

    let list: PharmacyItem[] = [];
    for (const p of pharmacyProfiles) {
      const u = userMap.get(p.user_id);
      if (!u) continue;

      const isLinked = Boolean(
        doctorProfile?.clinic_name &&
          p.clinic_name &&
          p.clinic_name.trim().toLowerCase() === doctorProfile.clinic_name.trim().toLowerCase()
      );

      list.push({
        user_id: p.user_id,
        full_name: p.business_name || u.full_name || 'Pharmacy',
        business_name: p.business_name || null,
        license_number: p.license_number || null,
        address: p.address || null,
        city: p.city || null,
        phone_number: p.contact_number || p.phone_number || null,
        email: u.email || null,
        is_verified: Boolean(u.is_verified),
        isLinked,
      });
    }

    list.sort((a, b) => (b.isLinked ? 1 : 0) - (a.isLinked ? 1 : 0));

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          (p.city && p.city.toLowerCase().includes(q)) ||
          (p.address && p.address.toLowerCase().includes(q))
      );
    }

    return list;
  },

  // ── Universal QR Verification ──
  verifyQR: async (token: string): Promise<any> => {
    const cleanToken = token.trim();
    if (!cleanToken) throw new Error('Token is empty');

    // 1. Blockchain Transaction / Hash
    if (cleanToken.startsWith('0x') || cleanToken.startsWith('QR-REC-')) {
      try {
        const res = await api.get(`/blockchain/verify/${cleanToken}`);
        return {
          type: 'BLOCKCHAIN',
          is_valid: true,
          data: res.data?.data,
        };
      } catch (err: any) {
        return {
          type: 'BLOCKCHAIN',
          is_valid: false,
          error: err.response?.data?.detail || 'Blockchain verification failed.',
        };
      }
    }

    // 2. Prescription Token
    try {
      const res = await api.get(`/verify/qr/${cleanToken}`);
      return {
        type: 'PRESCRIPTION',
        is_valid: Boolean(res.data?.data?.is_valid),
        data: res.data?.data?.data || res.data?.data,
        message: res.data?.message,
      };
    } catch (err: any) {
      return {
        type: 'PRESCRIPTION',
        is_valid: false,
        error: err.response?.data?.detail || 'Invalid or unverifiable prescription token.',
      };
    }
  },
};
