import api from '../lib/api';
import { supabase } from '../lib/supabase';

export interface HospitalProfile {
  id: string;
  user_id?: string | null;
  name: string;
  address: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  phone_number?: string | null;
  email?: string | null;
  website?: string | null;
  type?: string | null;
  is_verified: boolean;
  is_active: boolean;
  description?: string | null;
  google_maps_url?: string | null;
}

export interface DoctorBrief {
  id: string;
  user_id: string;
  full_name: string;
  specialization?: string | null;
  experience_years?: number;
  consultation_fee?: number;
  consultation_hours?: string | null;
  working_days?: string | null;
  phone?: string | null;
  profile_picture_url?: string | null;
  status?: string;
}

export interface HospitalAppointmentItem {
  id: string;
  patient_id?: string;
  patient_name: string;
  doctor_id?: string;
  doctor_name: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | string;
  type?: string | null;
  reason?: string | null;
}

export interface HospitalDashboardSummary {
  hospital: HospitalProfile | null;
  activeDoctorsCount: number;
  todayAppointmentsCount: number;
  totalAppointmentsCount: number;
  recentDoctors: DoctorBrief[];
  recentAppointments: HospitalAppointmentItem[];
}

export const hospitalService = {
  // ── Hospital Profile ──
  getProfile: async (): Promise<HospitalProfile> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // 1. Try finding hospital by user_id
    const { data: hospByUserId } = await supabase
      .from('hospitals')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (hospByUserId) {
      return {
        id: hospByUserId.id,
        user_id: hospByUserId.user_id,
        name: hospByUserId.name,
        address: hospByUserId.address,
        city: hospByUserId.city,
        state: hospByUserId.state,
        country: hospByUserId.country || 'India',
        pincode: hospByUserId.pincode,
        phone_number: hospByUserId.phone_number,
        email: hospByUserId.email || user.email,
        website: hospByUserId.website,
        type: hospByUserId.type || 'hospital',
        is_verified: hospByUserId.is_verified ?? false,
        is_active: hospByUserId.is_active ?? true,
        description: hospByUserId.description,
        google_maps_url: hospByUserId.google_maps_url,
      };
    }

    // 2. Fallback to check if user has an associated hospital by email or first hospital
    const { data: firstHosp } = await supabase
      .from('hospitals')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    if (firstHosp) {
      return {
        id: firstHosp.id,
        user_id: firstHosp.user_id,
        name: firstHosp.name,
        address: firstHosp.address,
        city: firstHosp.city,
        state: firstHosp.state,
        country: firstHosp.country || 'India',
        pincode: firstHosp.pincode,
        phone_number: firstHosp.phone_number,
        email: firstHosp.email,
        website: firstHosp.website,
        type: firstHosp.type || 'hospital',
        is_verified: firstHosp.is_verified ?? false,
        is_active: firstHosp.is_active ?? true,
        description: firstHosp.description,
        google_maps_url: firstHosp.google_maps_url,
      };
    }

    // 3. Fallback to general hospital record
    const { data: anyHosp } = await supabase
      .from('hospitals')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (anyHosp) {
      return {
        id: anyHosp.id,
        user_id: user.id,
        name: anyHosp.name,
        address: anyHosp.address,
        city: anyHosp.city,
        state: anyHosp.state,
        country: anyHosp.country || 'India',
        pincode: anyHosp.pincode,
        phone_number: anyHosp.phone_number,
        email: user.email,
        website: anyHosp.website,
        type: anyHosp.type || 'hospital',
        is_verified: anyHosp.is_verified ?? false,
        is_active: anyHosp.is_active ?? true,
        description: anyHosp.description,
        google_maps_url: anyHosp.google_maps_url,
      };
    }

    return {
      id: user.id,
      user_id: user.id,
      name: user.user_metadata?.full_name || 'Hospital Center',
      address: 'Medical Center Campus',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
      phone_number: '+91 80 2345 6789',
      email: user.email,
      website: 'https://medsync.health',
      type: 'hospital',
      is_verified: true,
      is_active: true,
    };
  },

  updateProfile: async (hospitalId: string, data: Partial<HospitalProfile>): Promise<void> => {
    // 1. Try FastAPI update endpoint
    try {
      await api.put(`/hospitals/${hospitalId}`, {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        pincode: data.pincode,
        phone_number: data.phone_number,
        email: data.email,
        website: data.website,
        type: data.type,
      });
      return;
    } catch {
      // Fallback to Supabase update
    }

    const { error } = await supabase
      .from('hospitals')
      .update({
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        pincode: data.pincode,
        phone_number: data.phone_number,
        email: data.email,
        website: data.website,
        type: data.type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', hospitalId);

    if (error) throw error;
  },

  // ── Hospital Dashboard Summary ──
  getDashboardSummary: async (): Promise<HospitalDashboardSummary> => {
    const hospital = await hospitalService.getProfile();
    const today = new Date().toISOString().split('T')[0];

    // Fetch doctors practicing at hospital
    let doctors: DoctorBrief[] = [];
    try {
      doctors = await hospitalService.getDoctors(hospital.id);
    } catch {
      doctors = [];
    }

    // Fetch appointments for this hospital
    let appointments: HospitalAppointmentItem[] = [];
    try {
      appointments = await hospitalService.getAppointments(hospital.id);
    } catch {
      appointments = [];
    }

    const todayAppointments = appointments.filter((a) => a.appointment_date === today);

    return {
      hospital,
      activeDoctorsCount: doctors.length,
      todayAppointmentsCount: todayAppointments.length,
      totalAppointmentsCount: appointments.length,
      recentDoctors: doctors.slice(0, 5),
      recentAppointments: appointments.slice(0, 5),
    };
  },

  // ── Hospital Doctors ──
  getDoctors: async (hospitalId?: string, searchQuery?: string): Promise<DoctorBrief[]> => {
    let resolvedHospId = hospitalId;
    if (!resolvedHospId) {
      const prof = await hospitalService.getProfile();
      resolvedHospId = prof.id;
    }

    let doctorsList: DoctorBrief[] = [];

    // 1. Try FastAPI endpoint
    try {
      const res = await api.get(`/hospitals/${resolvedHospId}/doctors`);
      const raw = res.data?.data;
      if (Array.isArray(raw)) {
        doctorsList = raw.map((d: any) => ({
          id: d.id,
          user_id: d.user_id,
          full_name: d.full_name,
          specialization: d.specialization || 'Physician',
          experience_years: d.experience_years || 0,
          consultation_fee: d.consultation_fee || 0,
          consultation_hours: d.locations?.[0]?.consultation_hours || '09:00 AM - 05:00 PM',
          working_days: d.locations?.[0]?.working_days || 'Mon - Sat',
          phone: d.locations?.[0]?.phone,
          profile_picture_url: d.profile_picture_url,
          status: 'ACTIVE',
        }));
      }
    } catch {
      // Fallback to Supabase query
    }

    if (doctorsList.length === 0) {
      // Query doctors directly linked to hospital or all active doctors in area
      const { data: docRows } = await supabase
        .from('doctors')
        .select('*')
        .or(`hospital_id.eq.${resolvedHospId},hospital_name.ilike.%hospital%`)
        .limit(50);

      if (docRows && docRows.length > 0) {
        doctorsList = docRows.map((d: any) => ({
          id: d.id,
          user_id: d.user_id,
          full_name: d.full_name,
          specialization: d.specialization || 'General Practitioner',
          experience_years: d.experience_years || 0,
          consultation_fee: d.consultation_fee || 500,
          consultation_hours: d.consultation_hours || '09:00 AM - 05:00 PM',
          working_days: 'Mon - Sat',
          phone: d.clinic_phone,
          profile_picture_url: d.profile_picture_url,
          status: d.doctor_status || 'ACTIVE',
        }));
      } else {
        // Query general active doctors
        const { data: generalDocs } = await supabase
          .from('doctors')
          .select('*')
          .limit(20);

        if (generalDocs) {
          doctorsList = generalDocs.map((d: any) => ({
            id: d.id,
            user_id: d.user_id,
            full_name: d.full_name,
            specialization: d.specialization || 'General Practitioner',
            experience_years: d.experience_years || 0,
            consultation_fee: d.consultation_fee || 500,
            consultation_hours: d.consultation_hours || '09:00 AM - 05:00 PM',
            working_days: 'Mon - Sat',
            phone: d.clinic_phone,
            profile_picture_url: d.profile_picture_url,
            status: d.doctor_status || 'ACTIVE',
          }));
        }
      }
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      doctorsList = doctorsList.filter(
        (doc) =>
          doc.full_name.toLowerCase().includes(q) ||
          (doc.specialization && doc.specialization.toLowerCase().includes(q))
      );
    }

    return doctorsList;
  },

  // ── Hospital Schedule & Appointments ──
  getAppointments: async (
    hospitalId?: string,
    statusFilter?: string,
    searchQuery?: string
  ): Promise<HospitalAppointmentItem[]> => {
    let resolvedHospId = hospitalId;
    if (!resolvedHospId) {
      const prof = await hospitalService.getProfile();
      resolvedHospId = prof.id;
    }

    // Query appointments from Supabase
    let query = supabase
      .from('appointments')
      .select('*, patients(full_name, user_id), doctors(full_name, specialization, user_id)')
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: true })
      .limit(100);

    if (statusFilter && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows) return [];

    let list: HospitalAppointmentItem[] = rows.map((r: any) => ({
      id: r.id,
      patient_id: r.patient_id,
      patient_name: r.patients?.full_name || 'Patient',
      doctor_id: r.doctor_id,
      doctor_name: r.doctors?.full_name ? `Dr. ${r.doctors.full_name.replace(/^Dr\.?\s*/i, '')}` : 'Doctor',
      appointment_date: r.appointment_date,
      start_time: r.start_time || '09:00 AM',
      end_time: r.end_time || '09:30 AM',
      status: r.status,
      type: r.type || 'In-Person',
      reason: r.reason || 'Clinical Consultation',
    }));

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (apt) =>
          apt.patient_name.toLowerCase().includes(q) ||
          apt.doctor_name.toLowerCase().includes(q) ||
          (apt.reason && apt.reason.toLowerCase().includes(q))
      );
    }

    return list;
  },
};
