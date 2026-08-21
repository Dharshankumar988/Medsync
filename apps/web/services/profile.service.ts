import api from '@/lib/api';

export interface ProfileCompletionData {
  profile_completion_percentage: number;
  [key: string]: any;
}

class ProfileService {
  async updateProfileCompletion(userId: string, data: ProfileCompletionData) {
    return api.put(`/api/v1/profile/${userId}/completion`, data);
  }
}

export const profileService = new ProfileService();
