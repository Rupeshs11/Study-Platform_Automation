import client from './client';
import type { ApiResponse, UserProfile } from '../types';

export const userApi = {
  getProfile: () =>
    client.get<ApiResponse<UserProfile>>('/users/me'),

  updateProfile: (data: { fullName?: string; learningGoal?: string; currentLevel?: string }) =>
    client.put<ApiResponse<UserProfile>>('/users/me', data),

  updatePreferences: (data: { learningGoal?: string; currentLevel?: string; interests?: string[] }) =>
    client.put<ApiResponse<string>>('/users/me/preferences', data),
};
