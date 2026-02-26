import client from './client';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    client.post<AuthResponse>('/auth/register', data),

  health: () =>
    client.get('/auth/health'),
};
