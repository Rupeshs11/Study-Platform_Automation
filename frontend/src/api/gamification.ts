import client from './client';
import type { ApiResponse, GamificationState } from '../types';

export const gamificationApi = {
  getState: () =>
    client.get<ApiResponse<GamificationState>>('/gamification'),
};
