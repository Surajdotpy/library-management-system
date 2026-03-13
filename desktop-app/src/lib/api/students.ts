import apiClient from './client';
import type { 
  Student, 
  CreateStudentRequest, 
  UpdateStudentRequest,
  StudentWithDetails,
  ApiResponse
} from '@/types';

export const studentsApi = {
  async getAll(): Promise<Student[]> {
    const response = await apiClient.get<ApiResponse<Student[]>>('/students');
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

  async getWithDetails(id: number): Promise<StudentWithDetails> {
    const response = await apiClient.get<ApiResponse<StudentWithDetails>>(`/students/${id}/details`);
    if (!response.data.data) {
      throw new Error('Student details not found');
    }
    return response.data.data;
  },
};