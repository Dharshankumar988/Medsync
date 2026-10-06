import axios from 'axios';

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const BASE_URL = RAW_BASE_URL.replace(/\/api\/v1\/?$/, '');
const API_URL = `${BASE_URL}/api/v1`;

export class SecurityService {
  static async getStatus(token: string) {
    const response = await axios.get(`${API_URL}/security/status?_t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  static async enrollPin(token: string, pin: string) {
    const formData = new FormData();
    formData.append('pin', pin);
    const response = await axios.post(`${API_URL}/security/enroll-pin`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }

  static async authorizeDownload(token: string, prescriptionId: string, pin: string, password: string) {
    const formData = new FormData();
    formData.append('pin', pin);
    formData.append('password', password);
    const response = await axios.post(`${API_URL}/prescriptions/${prescriptionId}/authorize-download`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }

  static async resetPinWithPassword(token: string, currentPassword: string, newPin: string) {
    const formData = new FormData();
    formData.append('current_password', currentPassword);
    formData.append('new_pin', newPin);
    const response = await axios.post(`${API_URL}/security/reset-pin-with-password`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
}
