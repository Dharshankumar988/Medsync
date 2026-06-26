import api from '../utils/api';

export const authService = {
  login: async (credentials: any) => {
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    
    // Axios handles FormData automatically in React Native with correct boundaries
    const res = await api.post('/api/v1/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  me: async () => {
    const res = await api.get('/api/v1/users/me');
    return res.data;
  }
};
