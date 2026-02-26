import client from './client';
import type { ApiResponse, DoubtRequest, DoubtResponse, DoubtHistory, LearningInsights } from '../types';

export const doubtApi = {
  ask: (data: DoubtRequest) =>
    client.post<ApiResponse<DoubtResponse>>('/doubts', data),

  getHistory: (limit: number = 20) =>
    client.get<ApiResponse<DoubtHistory[]>>(`/doubts/history?limit=${limit}`),

  getInsights: () =>
    client.get<ApiResponse<LearningInsights>>('/doubts/insights'),
};
