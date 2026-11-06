import { apiClient } from '../api/client';
import { Appointment, QueueToken, User } from '../../types';

export interface PatientDashboardData {
  patient: User;
  active_token: QueueToken | null;
  upcoming_appointment: Appointment | null;
}

export const patientService = {
  async getProfile(): Promise<PatientDashboardData> {
    return apiClient<PatientDashboardData>('/api/v1/patients/me');
  },

  async updateProfile(data: { name?: string; phone?: string }): Promise<{ message: string; patient: User }> {
    return apiClient<{ message: string; patient: User }>('/api/v1/patients/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getAppointments(): Promise<{ appointments: Appointment[] }> {
    return apiClient<{ appointments: Appointment[] }>('/api/v1/patients/appointments');
  },
};
