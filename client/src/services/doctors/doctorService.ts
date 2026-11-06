import { apiClient } from '../api/client';
import { Doctor, QueueToken } from '../../types';

export interface DoctorQueueResponse {
  queue: QueueToken[];
  metrics: {
    patients_waiting: number;
    currently_consulting: QueueToken | null;
    completed_today: number;
    average_service_duration_mins: number;
    doctor_status: 'available' | 'paused' | 'offline';
  };
}

export const doctorService = {
  async getDoctors(department_id?: number): Promise<{ doctors: Doctor[] }> {
    const query = department_id ? `?department_id=${department_id}` : '';
    return apiClient<{ doctors: Doctor[] }>(`/api/v1/doctors${query}`);
  },

  async getDoctorProfile(): Promise<{ doctor: Doctor }> {
    return apiClient<{ doctor: Doctor }>('/api/v1/doctors/me');
  },

  async getDoctorQueue(doctor_id?: number): Promise<DoctorQueueResponse> {
    const query = doctor_id ? `?doctor_id=${doctor_id}` : '';
    return apiClient<DoctorQueueResponse>(`/api/v1/doctors/queue${query}`);
  },

  async updateAvailability(payload: { status?: 'available' | 'paused' | 'offline'; counter_number?: string; room_number?: string }): Promise<{ message: string; doctor: Doctor }> {
    return apiClient<{ message: string; doctor: Doctor }>('/api/v1/doctors/availability', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
