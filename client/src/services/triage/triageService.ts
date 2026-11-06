import { apiClient } from '../api/client';
import {
  TriageAssessment,
  PatientSymptoms,
  PriorityAuditLog,
  TriagePendingItem,
  TriageUrgencyCategory,
  PriorityLevel,
} from '../../types';

export interface PreliminaryAssessmentResult {
  preliminary_urgency: TriageUrgencyCategory;
  staff_initial_priority: string;
  warning_flags: string[];
  clinical_summary: string;
  emergency_message?: string;
  requires_immediate_escalation: boolean;
  clinical_disclaimer: string;
}

export const triageService = {
  /**
   * Run preliminary symptom triage evaluation (preview before or during booking)
   */
  async assessSymptoms(payload: {
    main_symptoms: string;
    symptom_description?: string;
    symptom_duration?: string;
    reported_severity?: 'mild' | 'moderate' | 'severe';
    is_worsening?: boolean;
    existing_conditions?: string;
  }): Promise<{ assessment: PreliminaryAssessmentResult }> {
    return apiClient<{ assessment: PreliminaryAssessmentResult }>('/api/v1/triage/assess', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Retrieve list of pending triage items awaiting staff review
   */
  async getPendingTriage(params?: {
    department_id?: number;
    status?: string;
  }): Promise<{ pending_triage: TriagePendingItem[]; count: number }> {
    const searchParams = new URLSearchParams();
    if (params?.department_id) searchParams.append('department_id', params.department_id.toString());
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient<{ pending_triage: TriagePendingItem[]; count: number }>(`/api/v1/triage/pending${query}`);
  },

  /**
   * Get complete details of a triage assessment including audit log
   */
  async getTriageDetails(assessmentId: number): Promise<{
    assessment: TriageAssessment;
    appointment: any;
    symptoms?: PatientSymptoms;
    audit_logs: PriorityAuditLog[];
  }> {
    return apiClient<{
      assessment: TriageAssessment;
      appointment: any;
      symptoms?: PatientSymptoms;
      audit_logs: PriorityAuditLog[];
    }>(`/api/v1/triage/${assessmentId}`);
  },

  /**
   * Clinical staff action: Approve or modify priority with mandatory clinical reason
   */
  async updatePriority(
    assessmentId: number,
    payload: {
      priority: PriorityLevel;
      reason: string;
      action?: 'approved' | 'priority_changed' | 'modified';
      assessment_notes?: string;
    }
  ): Promise<{
    message: string;
    assessment: TriageAssessment;
    token?: any;
    audit_log: PriorityAuditLog;
  }> {
    return apiClient<{
      message: string;
      assessment: TriageAssessment;
      token?: any;
      audit_log: PriorityAuditLog;
    }>(`/api/v1/triage/${assessmentId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Clinical staff action: Escalate directly to Hospital Emergency Protocol
   */
  async escalateEmergency(
    assessmentId: number,
    payload?: { reason: string }
  ): Promise<{
    message: string;
    assessment: TriageAssessment;
    token?: any;
  }> {
    return apiClient<{
      message: string;
      assessment: TriageAssessment;
      token?: any;
    }>(`/api/v1/triage/${assessmentId}/escalate`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },
};
