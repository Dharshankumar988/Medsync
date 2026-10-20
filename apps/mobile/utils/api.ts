import api from '../lib/api';

export const apiRequest = async (method: string, url: string, data?: any) => {
  return api({ method, url, data });
};

export { api };
export default api;
