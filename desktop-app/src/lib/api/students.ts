/**
 * Students API calls
 */

import apiClient from './client';
import type { 
  Student, 
  CreateStudentRequest, 
  UpdateStudentRequest,
  StudentWithDetails 
} from '@/types';

export const studentsApi = {
  /**
   * Get all students
   */
  getAll: async (): Promise<Student[]> => {
    const response = await apiClient.get<{ students: Student[] }>('/students');
    return response.data.students;
  },

  /**
   * Get student by ID
   */
  getById: async (id: number): Promise<Student> => {
    const response = await apiClient.get<{ student: Student }>(`/students/${id}`);
    return response.data.student;
  },

  /**
   * Create new student
   */
  create: async (data: CreateStudentRequest): Promise<Student> => {
    const response = await apiClient.post<{ student: Student }>('/students', data);
    return response.data.student;
  },

  /**
   * Update student
   */
  update: async (id: number, data: UpdateStudentRequest): Promise<Student> => {
    const response = await apiClient.put<{ student: Student }>(`/students/${id}`, data);
    return response.data.student;
  },

  /**
   * Delete student
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/students/${id}`);
  },

  /**
   * Get student with full details (payments, attendance)
   */
  getWithDetails: async (id: number): Promise<StudentWithDetails> => {
    const response = await apiClient.get<{ student: StudentWithDetails }>(`/students/${id}/details`);
    return response.data.student;
  },
};