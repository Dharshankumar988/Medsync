import api from '@/lib/api';

export const authService = {
  login: async (credentials: any) => {
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    const res = await api.post('/api/v1/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res.data;
  },
  register: async (data: any) => {
    const res = await api.post('/api/v1/auth/register', data);
    return res.data;
  },
  me: async () => {
    const res = await api.get('/api/v1/users/me');
    return res.data;
  }
};
