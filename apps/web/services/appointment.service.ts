import api from "@/lib/api";

export const appointmentService = {
  getAppointments: async (params?: { limit?: number, skip?: number, status?: string }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.skip) queryParams.append('skip', params.skip.toString());
      if (params?.status) queryParams.append('status', params.status);

      const queryString = queryParams.toString();
      const res = await api.get(`/api/v1/appointments/${queryString ? `?${queryString}` : ''}`);
      return res.data.data;
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      return null;
    }
  }
};
