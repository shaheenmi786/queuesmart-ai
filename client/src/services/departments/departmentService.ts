import { apiClient } from '../api/client';
import { Department } from '../../types';

export const departmentService = {
  async getDepartments(): Promise<{ departments: Department[] }> {
    return apiClient<{ departments: Department[] }>('/api/v1/departments');
  },

  async getDepartment(id: number): Promise<{ department: Department }> {
    return apiClient<{ department: Department }>(`/api/v1/departments/${id}`);
  },
};
