import apiClient from './client';
import type { 
  Student, 
  CreateStudentRequest, 
  UpdateStudentRequest,
  StudentWithDetails,
  ApiResponse
} from '@/types';

export const studentsApi = {
  async getAll(includeInactive: boolean = false): Promise<Student[]> {
    const response = await apiClient.get<ApiResponse<Student[]>>('/students', {
      params: includeInactive ? { include_inactive: true } : undefined,
    });
    return response.data.data || [];
  },

  async search(query: string, options: { includeInactive?: boolean; limit?: number } = {}): Promise<Student[]> {
    const response = await apiClient.get<ApiResponse<Student[]>>('/students', {
      params: {
        include_inactive: options.includeInactive ? true : undefined,
        search: query,
        limit: options.limit,
      },
    });

    return response.data.data || [];
  },

  async getById(id: number): Promise<Student> {
    const response = await apiClient.get<ApiResponse<Student>>(`/students/${id}`);
    if (!response.data.data) {
      throw new Error('Student not found');
    }
    return response.data.data;
  },

  async create(data: CreateStudentRequest): Promise<Student> {
    const response = await apiClient.post<ApiResponse<Student>>('/students', data);
    if (!response.data.data) {
      throw new Error('Failed to create student');
    }
    return response.data.data;
  },

  async update(id: number, data: UpdateStudentRequest): Promise<Student> {
    const response = await apiClient.put<ApiResponse<Student>>(`/students/${id}`, data);
    if (!response.data.data) {
      throw new Error('Failed to update student');
    }
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/students/${id}`);
  },

  async reactivate(id: number): Promise<Student> {
    const response = await apiClient.patch<ApiResponse<Student>>(`/students/${id}/reactivate`);
    if (!response.data.data) {
      throw new Error('Failed to reactivate student');
    }
    return response.data.data;
  },

  async getWithDetails(id: number): Promise<StudentWithDetails> {
    const response = await apiClient.get<ApiResponse<StudentWithDetails>>(`/students/${id}/details`);
    if (!response.data.data) {
      throw new Error('Student details not found');
    }
    return response.data.data;
  },
};
