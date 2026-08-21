import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api/v1`;

export class SecurityService {
  static async getStatus(token: string) {
    const response = await axios.get(`${API_URL}/security/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  static async enrollPin(token: string, pin: string) {
    const formData = new FormData();
    formData.append('pin', pin);
    const response = await axios.post(`${API_URL}/security/enroll-pin`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  static async enrollFace(token: string, images: File[]) {
    const formData = new FormData();
    images.forEach(img => {
      formData.append('images', img);
    });
    const response = await axios.post(`${API_URL}/security/enroll-face`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  static async authorizeDownload(token: string, prescriptionId: string, pin: string, password: string, faceImage: File) {
    const formData = new FormData();
    formData.append('pin', pin);
    formData.append('password', password);
    formData.append('face_image', faceImage);
    const response = await axios.post(`${API_URL}/prescriptions/${prescriptionId}/authorize-download`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
}
