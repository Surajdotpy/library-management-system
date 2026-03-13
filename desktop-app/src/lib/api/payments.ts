import apiClient from './client';
import type { 
  Payment,
  RecordPaymentRequest,
  PendingPayment,
  MonthlyRevenue,
  PaymentReceipt,
  ApiResponse
} from '@/types';

export const paymentsApi = {
  async record(data: RecordPaymentRequest): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<Payment>>('/payments', data);
    if (!response.data.data) {
      throw new Error('Failed to record payment');
    }
    return response.data.data;
  },

  async getAll(startDate?: string, endDate?: string): Promise<Payment[]> {
    const response = await apiClient.get<ApiResponse<Payment[]>>('/payments', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data.data || [];
  },

  async getStudentPayments(studentId: number): Promise<Payment[]> {
    const response = await apiClient.get<ApiResponse<Payment[]>>(`/payments/student/${studentId}`);
    return response.data.data || [];
  },

  async getPending(): Promise<PendingPayment[]> {
    const response = await apiClient.get<ApiResponse<PendingPayment[]>>('/payments/pending');
    return response.data.data || [];
  },

  async getMonthlyRevenue(year?: number, month?: number): Promise<MonthlyRevenue> {
    const response = await apiClient.get<ApiResponse<MonthlyRevenue>>('/payments/revenue/monthly', {
      params: { year, month }
    });
    if (!response.data.data) {
      throw new Error('Failed to get revenue data');
    }
    return response.data.data;
  },

  async getReceipt(paymentId: number): Promise<PaymentReceipt> {
    const response = await apiClient.get<ApiResponse<PaymentReceipt>>(`/payments/${paymentId}/receipt`);
    if (!response.data.data) {
      throw new Error('Receipt not found');
    }
    return response.data.data;
  },
};