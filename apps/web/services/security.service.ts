import axios from 'axios';
import { getApiUrl } from '@/lib/backend-config';

export class SecurityService {
  static async getStatus(token: string) {
    const response = await axios.get(`${getApiUrl()}/security/status?_t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  static async enrollPin(token: string, pin: string) {
    const formData = new FormData();
    formData.append('pin', pin);
    const response = await axios.post(`${getApiUrl()}/security/enroll-pin`, formData, {
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
    const response = await axios.post(`${getApiUrl()}/prescriptions/${prescriptionId}/authorize-download`, formData, {
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
    const response = await axios.post(`${getApiUrl()}/security/reset-pin-with-password`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
}
