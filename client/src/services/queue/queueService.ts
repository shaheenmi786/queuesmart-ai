import { apiClient } from '../api/client';
import { QueueToken } from '../../types';

export const queueService = {
  async getQueue(params?: { department_id?: number; doctor_id?: number; status?: string }): Promise<{ queue: QueueToken[] }> {
    const searchParams = new URLSearchParams();
    if (params?.department_id) searchParams.append('department_id', params.department_id.toString());
    if (params?.doctor_id) searchParams.append('doctor_id', params.doctor_id.toString());
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient<{ queue: QueueToken[] }>(`/api/v1/queue${query}`);
  },

  async getTokenByNumber(tokenNumber: string): Promise<{ token: QueueToken }> {
    return apiClient<{ token: QueueToken }>(`/api/v1/queue/${tokenNumber}`);
  },

  async callToken(tokenId: number): Promise<{ message: string; token: QueueToken }> {
    return apiClient<{ message: string; token: QueueToken }>(`/api/v1/queue/${tokenId}/call`, {
      method: 'POST',
    });
  },

  async startConsultation(tokenId: number): Promise<{ message: string; token: QueueToken }> {
    return apiClient<{ message: string; token: QueueToken }>(`/api/v1/queue/${tokenId}/start`, {
      method: 'POST',
    });
  },

  async completeConsultation(tokenId: number): Promise<{ message: string; token: QueueToken }> {
    return apiClient<{ message: string; token: QueueToken }>(`/api/v1/queue/${tokenId}/complete`, {
      method: 'POST',
    });
  },

  async markAbsent(tokenId: number): Promise<{ message: string; token: QueueToken }> {
    return apiClient<{ message: string; token: QueueToken }>(`/api/v1/queue/${tokenId}/absent`, {
      method: 'POST',
    });
  },

  async getPatientQueueTokens(patientId: number): Promise<{ tokens: QueueToken[]; active_token?: QueueToken }> {
    return apiClient<{ tokens: QueueToken[]; active_token?: QueueToken }>(`/api/v1/queue/patient/${patientId}`);
  },
};
