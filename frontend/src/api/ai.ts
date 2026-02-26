import client from './client';
import type { ApiResponse, AIModelsResponse } from '../types';

export const aiApi = {
  getModels: () =>
    client.get<ApiResponse<AIModelsResponse>>('/ai/models'),
};
