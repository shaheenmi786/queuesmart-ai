import { apiClient } from '../api/client';
import { AdminDashboardMetrics, AuditLogItem, Department, Doctor } from '../../types';

export const adminService = {
  async getDashboard(): Promise<{ metrics: AdminDashboardMetrics }> {
    return apiClient<{ metrics: AdminDashboardMetrics }>('/api/v1/admin/dashboard');
  },

  async getDepartments(): Promise<{ departments: Department[] }> {
    return apiClient<{ departments: Department[] }>('/api/v1/admin/departments');
  },

  async createDepartment(data: Partial<Department>): Promise<{ message: string; department: Department }> {
    return apiClient<{ message: string; department: Department }>('/api/v1/admin/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDepartment(id: number, data: Partial<Department>): Promise<{ message: string; department: Department }> {
    return apiClient<{ message: string; department: Department }>(`/api/v1/admin/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getDoctors(): Promise<{ doctors: Doctor[] }> {
    return apiClient<{ doctors: Doctor[] }>('/api/v1/admin/doctors');
  },

  async createDoctor(data: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    department_id: number;
    specialization: string;
    room_number?: string;
    counter_number?: string;
    consultation_fee?: number;
  }): Promise<{ message: string; doctor: Doctor }> {
    return apiClient<{ message: string; doctor: Doctor }>('/api/v1/admin/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDoctor(id: number, data: Partial<Doctor>): Promise<{ message: string; doctor: Doctor }> {
    return apiClient<{ message: string; doctor: Doctor }>(`/api/v1/admin/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getAnalytics(): Promise<{
    department_workload: Array<{ department: string; total_tokens: number; completed: number; code: string }>;
    doctor_utilization: Array<{ doctor: string; department: string; completed_consultations: number; status: string }>;
  }> {
    return apiClient('/api/v1/admin/analytics');
  },

  async getAuditLogs(): Promise<{ audit_logs: AuditLogItem[] }> {
    return apiClient<{ audit_logs: AuditLogItem[] }>('/api/v1/admin/audit-logs');
  },
};
