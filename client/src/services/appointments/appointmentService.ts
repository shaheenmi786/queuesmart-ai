import { apiClient } from '../api/client';
import { Appointment, QueueToken, PatientSymptoms, TriageAssessment } from '../../types';

export interface CreateAppointmentPayload {
  department_id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  reason?: string;
  priority?: 'normal' | 'urgent' | 'emergency';
  main_symptoms?: string;
  symptom_description?: string;
  symptom_duration?: string;
  reported_severity?: 'mild' | 'moderate' | 'severe';
  is_worsening?: boolean;
  existing_conditions?: string;
  additional_notes?: string;
  consent_acknowledged?: boolean;
}

export interface CreateAppointmentResponse {
  message: string;
  appointment: Appointment;
  token: QueueToken;
  triage?: {
    assessment: TriageAssessment;
    symptoms: PatientSymptoms;
    requires_immediate_escalation: boolean;
    emergency_message?: string;
    warning_flags?: string[];
    clinical_summary?: string;
    clinical_disclaimer?: string;
  };
  ai_insights?: {
    predicted_service_minutes?: number;
    predicted_wait_minutes?: number;
    no_show_risk?: string;
  };
}

export const appointmentService = {
  async getAppointments(): Promise<{ appointments: Appointment[] }> {
    return apiClient<{ appointments: Appointment[] }>('/api/v1/appointments');
  },

  async createAppointment(payload: CreateAppointmentPayload): Promise<CreateAppointmentResponse> {
    return apiClient<CreateAppointmentResponse>('/api/v1/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async cancelAppointment(id: number): Promise<{ message: string; appointment: Appointment }> {
    return apiClient<{ message: string; appointment: Appointment }>(`/api/v1/appointments/${id}/cancel`, {
      method: 'PATCH',
    });
  },
};
