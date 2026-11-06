export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  doctor_profile?: Doctor;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  location: string;
  average_service_time_mins: number;
  is_active: boolean;
  created_at?: string;
  doctor_count?: number;
}

export interface Doctor {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  department_id: number;
  department_name: string;
  department_code: string;
  specialization: string;
  room_number: string;
  counter_number: string;
  status: 'available' | 'paused' | 'offline';
  consultation_fee: number;
  schedule?: {
    days?: string[];
    hours?: string;
  };
  is_active?: boolean;
}

export type QueueStatus = 'waiting' | 'calling' | 'consulting' | 'completed' | 'absent' | 'cancelled';
export type PriorityLevel = 'normal' | 'urgent' | 'emergency';

export interface QueueToken {
  id: number;
  token_number: string;
  appointment_id?: number;
  patient_id: number;
  patient_name: string;
  patient_phone?: string;
  doctor_id?: number;
  doctor_name: string;
  doctor_status?: 'available' | 'paused' | 'offline';
  department_id: number;
  department_name: string;
  department_code: string;
  priority: PriorityLevel;
  status: QueueStatus;
  counter_number: string;
  room_number: string;
  queue_position: number;
  patients_ahead: number;
  now_serving: string;
  check_in_time?: string;
  call_time?: string;
  consult_start_time?: string;
  consult_end_time?: string;
  actual_wait_minutes?: number;
  actual_service_minutes?: number;
  ml_predicted_wait_minutes?: number;
  ml_predicted_service_minutes?: number;
  triage_urgency?: string;
  triage_status?: string;
  position_ahead?: number;
  created_at?: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone?: string;
  doctor_id: number;
  doctor_name: string;
  department_id: number;
  department_name: string;
  department_code: string;
  room_number?: string;
  counter_number?: string;
  appointment_date: string;
  appointment_time: string;
  reason: string;
  priority: PriorityLevel;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  created_at?: string;
  token_number?: string;
  token_status?: QueueStatus;
  queue_position?: number;
  symptoms?: PatientSymptoms;
  triage_assessment?: TriageAssessment;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  category: 'appointment' | 'queue' | 'doctor' | 'general';
  is_read: boolean;
  created_at: string;
}

export interface CounterRecommendation {
  department_id: number;
  department_name: string;
  department_code: string;
  current_counters: number;
  waiting_patients: number;
  traffic_intensity: number;
  queue_status: 'Optimal' | 'Congested' | 'Underutilized';
  recommended_counters: number;
  action: string;
  reason: string;
  projected_wait_mins: number;
  timestamp: string;
}

export interface CrowdForecastItem {
  hour: string;
  projected_arrivals: number;
  capacity_threshold: number;
  status: 'Peak' | 'Moderate' | 'Light';
}

export interface ModelPerformance {
  algorithm: string;
  service_duration_r2: number;
  service_duration_mae: number;
  waiting_time_r2: number;
  waiting_time_mae: number;
  training_samples: number;
  trained_at: string;
}

export interface AIMetricsResponse {
  actual_vs_predicted_service: Array<{
    token: string;
    department: string;
    actual: number;
    predicted: number;
  }>;
  actual_vs_predicted_wait: Array<{
    token: string;
    department: string;
    actual: number;
    predicted: number;
  }>;
  model_performance: ModelPerformance;
  feature_importance: Array<{
    feature: string;
    importance: number;
  }>;
}

export interface AdminDashboardMetrics {
  registered_patients: number;
  total_doctors: number;
  available_doctors: number;
  active_departments: number;
  active_appointments: number;
  patients_waiting: number;
  completed_consultations: number;
  average_waiting_time_mins: number;
  average_service_duration_mins: number;
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  user_name: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export type TriageUrgencyCategory = 'emergency_warning' | 'urgent_review' | 'normal_priority' | 'priority_pending';
export type TriageReviewStatus = 'pending_review' | 'approved' | 'modified' | 'escalated_emergency' | 'info_requested' | 'completed';

export interface PatientSymptoms {
  id?: number;
  appointment_id?: number;
  patient_id?: number;
  patient_name?: string;
  hospital_id?: number;
  main_symptoms: string;
  symptom_description: string;
  symptom_duration: string;
  reported_severity: 'mild' | 'moderate' | 'severe';
  is_worsening: boolean;
  existing_conditions?: string;
  additional_notes?: string;
  consent_acknowledged: boolean;
  created_at?: string;
}

export interface TriageAssessment {
  id: number;
  appointment_id: number;
  hospital_id?: number;
  patient_id: number;
  preliminary_urgency: TriageUrgencyCategory;
  staff_approved_priority: PriorityLevel | 'pending';
  review_status: TriageReviewStatus;
  reviewed_by?: number;
  reviewer_name?: string;
  reviewed_at?: string;
  clinical_summary?: string;
  warning_flags?: string[];
  assessment_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface PriorityAuditLog {
  id: number;
  appointment_id: number;
  hospital_id?: number;
  triage_assessment_id?: number;
  previous_priority: string;
  new_priority: string;
  changed_by: number;
  changed_by_name: string;
  reason: string;
  action_type: string;
  created_at: string;
}

export interface TriagePendingItem extends TriageAssessment {
  appointment?: Appointment;
  symptoms?: PatientSymptoms;
  token_number?: string;
  token_status?: QueueStatus;
}
