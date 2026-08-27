import api from "@/lib/api";
import { supabase } from "@/lib/supabase";

export const dashboardService = {
  getPatientDashboard: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const [
        { count: upcoming_appointments, data: appointmentsData },
        { count: total_records, data: recordsData },
        { count: active_prescriptions, data: prescriptionsData },
        { count: ongoing_orders, data: ordersData }
      ] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact' }).eq('patient_id', user.id).in('status', ['PENDING', 'CONFIRMED']).order('appointment_date', { ascending: true }).limit(5),
        supabase.from('medical_records').select('*', { count: 'exact' }).eq('patient_id', user.id).eq('is_archived', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('prescriptions').select('*', { count: 'exact' }).eq('patient_id', user.id).eq('is_dispensed', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('medicine_orders').select('*', { count: 'exact' }).eq('patient_id', user.id).in('status', ['PENDING', 'PROCESSING', 'SHIPPED']).order('created_at', { ascending: false }).limit(5)
      ]);

      return {
        upcoming_appointments: upcoming_appointments || 0,
        total_records: total_records || 0,
        active_prescriptions: active_prescriptions || 0,
        ongoing_orders: ongoing_orders || 0,
        recent_appointments: appointmentsData || [],
        recent_records: recordsData || [],
        recent_prescriptions: prescriptionsData || [],
        recent_orders: ordersData || []
      };
    } catch (err) {
      console.error("Failed to fetch patient dashboard:", err);
      return {
        upcoming_appointments: 0,
        total_records: 0,
        active_prescriptions: 0,
        ongoing_orders: 0,
        recent_appointments: [],
        recent_records: [],
        recent_prescriptions: [],
        recent_orders: []
      };
    }
  },

  getDoctorDashboard: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const today = new Date().toISOString().split('T')[0];

      const [
        { count: today_appointments, data: appointmentsData },
        { count: pending_prescriptions, data: prescriptionsData },
        { count: total_patients },
      ] = await Promise.all([
        supabase.from('appointments').select('*, patients(full_name, user_id)', { count: 'exact' }).eq('doctor_id', user.id).eq('appointment_date', today).eq('status', 'CONFIRMED').order('start_time', { ascending: true }),
        supabase.from('prescriptions').select('*', { count: 'exact' }).eq('doctor_id', user.id).eq('is_dispensed', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('appointments').select('patient_id', { count: 'exact', head: true }).eq('doctor_id', user.id)
      ]);

      return {
        today_appointments: today_appointments || 0,
        pending_prescriptions: pending_prescriptions || 0,
        total_patients: total_patients || 0,
        new_messages: 0,
        recent_appointments: appointmentsData || [],
        recent_prescriptions: prescriptionsData || []
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [
        { count: pending_orders, data: recent_orders },
        { count: active_prescriptions, data: recent_prescriptions },
        { count: all_inventory, data: inventory_data }
      ] = await Promise.all([
        supabase.from('medicine_orders').select('*', { count: 'exact' }).eq('pharmacy_id', user.id).in('status', ['PENDING', 'PROCESSING']).order('created_at', { ascending: false }).limit(5),
        supabase.from('prescriptions').select('*', { count: 'exact' }).eq('pharmacy_id', user.id).eq('is_dispensed', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('medicine_inventory').select('*', { count: 'exact' }).eq('pharmacy_id', user.id)
      ]);

      let low_stock_items = 0;
      if (inventory_data) {
        low_stock_items = inventory_data.filter((item: any) => item.stock_level < 100).length;
      }

      return { 
        pending_orders: pending_orders || 0, 
        low_stock_items: low_stock_items || 0, 
        today_revenue: 0, 
        active_prescriptions: active_prescriptions || 0,
        recent_orders: recent_orders || [],
        recent_prescriptions: recent_prescriptions || [],
        inventory_data: inventory_data || []
      };
    } catch (err) {
      console.error("Failed to fetch pharmacy dashboard:", err);
      return null;
    }
  },

  getHospitalDashboard: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [
        { count: active_doctors, data: doctorsData },
        { count: today_appointments, data: appointmentsData }
      ] = await Promise.all([
        supabase.from('doctors').select('*', { count: 'exact' }).eq('hospital_id', user.id).limit(5),
        supabase.from('appointments').select('*, doctor_locations!inner(hospital_id)', { count: 'exact' }).eq('doctor_locations.hospital_id', user.id).eq('appointment_date', new Date().toISOString().split('T')[0]).limit(5)
      ]);

      return {
        active_doctors: active_doctors || 0,
        today_appointments: today_appointments || 0,
        total_patients: 0,
        recent_doctors: doctorsData || [],
        recent_appointments: appointmentsData || []
      };
    } catch (err) {
      console.error("Failed to fetch hospital dashboard:", err);
      return null;
    }
  },

  getAdminDashboard: async () => {
    try {
      const [
        { count: total_users },
        { count: total_patients },
        { count: total_doctors },
        { count: total_pharmacies },
        { count: pending_verification, data: pending_users_data },
        { count: total_appointments },
        { count: total_prescriptions },
        { count: total_orders }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'PATIENT'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'DOCTOR'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'PHARMACY'),
        supabase.from('users').select('*', { count: 'exact' }).eq('is_verified', false).in('role', ['DOCTOR', 'PHARMACY']).limit(5),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('prescriptions').select('*', { count: 'exact', head: true }),
        supabase.from('medicine_orders').select('*', { count: 'exact', head: true })
      ]);

      return {
        users: {
          total: total_users || 0,
          patients: total_patients || 0,
          doctors: total_doctors || 0,
          pharmacies: total_pharmacies || 0,
          pending_verification: pending_verification || 0
        },
        operations: {
          appointments: total_appointments || 0,
          prescriptions: total_prescriptions || 0,
          orders: total_orders || 0
        },
        recent_pending_verifications: pending_users_data || []
      };
    } catch (err) {
      console.error("Failed to fetch admin dashboard:", err);
      return null;
    }
  }
};

