import api from "@/lib/api";
import { supabase } from "@/lib/supabase";

export const dashboardService = {
  getPatientDashboard: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const [
        { count: upcoming_appointments },
        { count: total_records },
        { count: active_prescriptions },
        { count: ongoing_orders }
      ] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).in('status', ['PENDING', 'CONFIRMED']),
        supabase.from('medical_records').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).eq('is_archived', false),
        supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).eq('is_dispensed', false),
        supabase.from('medicine_orders').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).in('status', ['PENDING', 'PROCESSING', 'SHIPPED'])
      ]);

      return {
        upcoming_appointments: upcoming_appointments || 0,
        total_records: total_records || 0,
        active_prescriptions: active_prescriptions || 0,
        ongoing_orders: ongoing_orders || 0
      };
    } catch (err) {
      console.error("Failed to fetch patient dashboard:", err);
      return {
        upcoming_appointments: 0,
        total_records: 0,
        active_prescriptions: 0,
        ongoing_orders: 0
      };
    }
  },

  getDoctorDashboard: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const [
        { count: today_appointments },
        { count: pending_prescriptions },
        { count: total_patients },
      ] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id).eq('status', 'CONFIRMED'),
        supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id).eq('is_dispensed', false),
        supabase.from('appointments').select('patient_id', { count: 'exact', head: true }).eq('doctor_id', user.id)
      ]);

      return {
        today_appointments: today_appointments || 0,
        pending_prescriptions: pending_prescriptions || 0,
        total_patients: total_patients || 0,
        new_messages: 0
      };
    } catch (err) {
      console.error("Failed to fetch doctor dashboard:", err);
      return null;
    }
  },

  getDoctorAppointments: async (date: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patients(full_name, user_id)')
        .eq('doctor_id', user.id)
        .eq('appointment_date', date);
        
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Failed to fetch doctor appointments:", err);
      return [];
    }
  },

  getPharmacyDashboard: async () => {
    try {
      return { pending_orders: 0, low_stock_items: 0, today_revenue: 0, active_prescriptions: 0 };
    } catch (err) {
      return null;
    }
  },

  getAdminDashboard: async () => {
    try {
      return { total_users: 0, active_doctors: 0, active_pharmacies: 0, total_hospitals: 0 };
    } catch (err) {
      return null;
    }
  }
};
