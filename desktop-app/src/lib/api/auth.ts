/**
 * Authentication API calls
 */

import apiClient from './client';
import type { LoginRequest, LoginResponse, User } from '@/types';
import { clearStoredSession } from '@/lib/auth/session';

export const authApi = {
  /**
   * Login user
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Get current user (verify token)
   */
  me: async (): Promise<User> => {
    const response = await apiClient.get<{ user: User }>('/auth/me');
    return response.data.user;
  },

  /**
   * Logout user (client-side only)
   */
  logout: () => {
    clearStoredSession();
  },
};
