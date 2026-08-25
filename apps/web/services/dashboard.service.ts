import api from "@/lib/api";

export const dashboardService = {
  getPatientDashboard: async () => {
    try {
      const res = await api.get('/api/v1/dashboard/patient');
      return res.data.data;
    } catch (err) {
      console.error("Failed to fetch patient dashboard:", err);
      return null;
    }
  },

  getDoctorDashboard: async () => {
    try {
      const res = await api.get('/api/v1/dashboard/doctor');
      return res.data.data;
    } catch (err) {
      console.error("Failed to fetch doctor dashboard:", err);
      return null;
    }
  },

  getDoctorAppointments: async (date: string) => {
    try {
      const res = await api.get(`/api/v1/appointments/?date_from=${date}&date_to=${date}`);
      return res.data.data.items || [];
    } catch (err) {
      console.error("Failed to fetch doctor appointments:", err);
      return [];
    }
  },

  getPharmacyDashboard: async () => {
    try {
      const res = await api.get('/api/v1/dashboard/pharmacy');
      return res.data.data;
    } catch (err) {
      console.error("Failed to fetch pharmacy dashboard:", err);
      return null;
    }
  },

  getAdminDashboard: async () => {
    try {
      const res = await api.get('/api/v1/dashboard/admin');
      return res.data.data;
    } catch (err) {
      console.error("Failed to fetch admin dashboard:", err);
      return null;
    }
  }
};
