import api from '@/lib/api';

const API_PREFIX = '/api/v1';

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone_number?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  is_verified: boolean;
  is_active: boolean;
  type?: string;
  google_maps_url?: string;
}

class HospitalService {
  async getHospitals(params?: { type?: string }) {
    const query = params?.type ? `?type=${params.type}` : '';
    return api.get<{data: Hospital[]}>(`${API_PREFIX}/hospitals${query}`);
  }

  async createHospital(data: Partial<Hospital>) {
    return api.post<{data: Hospital}>(`${API_PREFIX}/hospitals`, data);
  }

  async updateHospital(id: string, data: Partial<Hospital>) {
    return api.put<{data: Hospital}>(`${API_PREFIX}/hospitals/${id}`, data);
  }

  async deactivateHospital(id: string) {
    return api.delete<{message: string}>(`${API_PREFIX}/hospitals/${id}`);
  }
}

export const hospitalService = new HospitalService();
