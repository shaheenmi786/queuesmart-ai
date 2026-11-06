import { apiClient } from '../api/client';
import { User } from '../../types';

export interface AuthResponse {
  message: string;
  user: User;
  access_token: string;
}

export const authService = {
  async login(email: string, password: string):Promise<AuthResponse> {
    const res = await apiClient<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.access_token) {
      localStorage.setItem('queuesmart_token', res.access_token);
      localStorage.setItem('queuesmart_user', JSON.stringify(res.user));
    }
    return res;
  },

  async register(name: string, email: string, password: string, phone?: string): Promise<AuthResponse> {
    const res = await apiClient<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    });
    if (res.access_token) {
      localStorage.setItem('queuesmart_token', res.access_token);
      localStorage.setItem('queuesmart_user', JSON.stringify(res.user));
    }
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return apiClient<{ user: User }>('/api/v1/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await apiClient('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network failure on logout
    } finally {
      localStorage.removeItem('queuesmart_token');
      localStorage.removeItem('queuesmart_user');
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, password: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};
