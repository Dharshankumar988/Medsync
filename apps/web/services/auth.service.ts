import api from '@/lib/api';

export const authService = {
  login: async (credentials: any) => {
    const res = await api.post('/api/v1/auth/login', {
      email: credentials.email,
      password: credentials.password
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
