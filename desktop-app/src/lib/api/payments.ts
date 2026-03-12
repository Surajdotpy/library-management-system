/**
 * Payments API calls
 */

import apiClient from './client';
import type { 
  Payment, 
  RecordPaymentRequest,
  PendingPayment,
  MonthlyRevenue,
  PaymentReceipt 
} from '@/types';

export const paymentsApi = {
  /**
   * Record new payment
   */
  record: async (data: RecordPaymentRequest): Promise<Payment> => {
    const response = await apiClient.post<{ payment: Payment }>('/payments', data);
    return response.data.payment;
  },

  /**
   * Get all payments
   */
  getAll: async (): Promise<Payment[]> => {
    const response = await apiClient.get<{ payments: Payment[] }>('/payments');
    return response.data.payments;
  },

  /**
   * Get student payment history
   */
  getStudentPayments: async (studentId: number): Promise<Payment[]> => {
    const response = await apiClient.get<{ payments: Payment[] }>(`/payments/student/${studentId}`);
    return response.data.payments;
  },

  /**
   * Get pending payments (who hasn't paid)
   */
  getPending: async (): Promise<PendingPayment[]> => {
    const response = await apiClient.get<{ pending_payments: PendingPayment[] }>('/payments/pending');
    return response.data.pending_payments;
  },

  /**
   * Get monthly revenue
   */
  getMonthlyRevenue: async (month: number, year: number): Promise<MonthlyRevenue> => {
    const response = await apiClient.get<MonthlyRevenue>(`/payments/revenue/${month}/${year}`);
    return response.data;
  },

  /**
   * Get payment receipt
   */
  getReceipt: async (receiptNumber: string): Promise<PaymentReceipt> => {
    const response = await apiClient.get<{ receipt: PaymentReceipt }>(`/payments/receipt/${receiptNumber}`);
    return response.data.receipt;
  },
};