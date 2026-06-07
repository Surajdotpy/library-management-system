import apiClient from './client';
import type {
  ApiResponse,
  FeeDashboard,
  StudentFeeStatus,
  OverdueStudent,
  DueGenerationResult,
  FeePaymentRecord,
  FeePaymentDetail,
  RecordManualPaymentRequest,
  PaginatedResponse,
} from '@/types';

export const feesApi = {
  async getDashboard(branchId?: number): Promise<FeeDashboard> {
    const response = await apiClient.get<ApiResponse<FeeDashboard>>('/fees/dashboard', {
      params: branchId ? { branch_id: branchId } : undefined,
    });
    if (!response.data.data) throw new Error('Failed to load fee dashboard');
    return response.data.data;
  },

  async getStudentStatuses(
    branchId?: number,
    month?: number,
    year?: number,
  ): Promise<StudentFeeStatus[]> {
    const response = await apiClient.get<ApiResponse<StudentFeeStatus[]>>('/fees/student-statuses', {
      params: { branch_id: branchId, month, year },
    });
    return response.data.data || [];
  },

  async getOverdueStudents(branchId?: number): Promise<OverdueStudent[]> {
    const response = await apiClient.get<ApiResponse<OverdueStudent[]>>('/fees/overdue', {
      params: branchId ? { branch_id: branchId } : undefined,
    });
    return response.data.data || [];
  },

  async generateDues(
    month: number,
    year: number,
    branchId?: number,
  ): Promise<DueGenerationResult> {
    const response = await apiClient.post<ApiResponse<DueGenerationResult>>('/fees/dues', {
      month,
      year,
      branch_id: branchId,
    });
    if (!response.data.data) throw new Error('Failed to generate dues');
    return response.data.data;
  },

  async recordPayment(data: RecordManualPaymentRequest): Promise<FeePaymentDetail> {
    const response = await apiClient.post<ApiResponse<FeePaymentDetail>>('/fees/payments', data);
    if (!response.data.data) throw new Error('Failed to record payment');
    return response.data.data;
  },

  async getPaymentHistory(
    options: {
      branchId?: number;
      status?: string;
      month?: number;
      year?: number;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<PaginatedResponse<FeePaymentRecord>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<FeePaymentRecord>>>(
      '/fees/payments',
      { params: options },
    );
    return (
      response.data.data || {
        data: [],
        total: 0,
        page: 1,
        limit: options.limit ?? 25,
        totalPages: 1,
      }
    );
  },

  async getStudentPayments(studentId: number): Promise<FeePaymentDetail[]> {
    const response = await apiClient.get<ApiResponse<FeePaymentDetail[]>>(
      `/fees/students/${studentId}/payments`,
    );
    return response.data.data || [];
  },
};
