import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface ProfileCompletionData {
  profile_completion_percentage: number;
  [key: string]: any;
}

class ProfileService {
  async updateProfileCompletion(userId: string, data: ProfileCompletionData) {
    return axios.put(`${API_URL}/profile/${userId}/completion`, data);
  }
}

export const profileService = new ProfileService();
