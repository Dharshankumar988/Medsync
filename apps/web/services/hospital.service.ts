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
  is_verified: boolean;
  is_active: boolean;
}

class HospitalService {
  async getHospitals() {
    return api.get<{data: Hospital[]}>(`${API_PREFIX}/hospitals`);
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
