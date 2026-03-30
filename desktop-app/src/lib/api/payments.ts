import apiClient from './client';
import type {
  ApiResponse,
  CashfreePaymentRequestResult,
  ConfirmPaymentRequest,
  CreateCashfreePaymentRequest,
  PaymentCommunication,
  PaymentCommunicationQueryOptions,
  PaymentReminderBatchResult,
  MonthlyRevenue,
  Payment,
  PaymentQueryOptions,
  PaymentReceipt,
  PendingPayment,
  RecordPaymentRequest,
  SendPaymentReceiptRequest,
  SendPaymentReminderRequest,
} from '@/types';

export const paymentsApi = {
  async record(data: RecordPaymentRequest): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<Payment>>('/payments', data);

    if (!response.data.data) {
      throw new Error('Failed to record payment');
    }

    return response.data.data;
  },

  async confirm(
    paymentId: number,
    data: ConfirmPaymentRequest = {},
  ): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<Payment>>(
      `/payments/${paymentId}/confirm`,
      data,
    );

    if (!response.data.data) {
      throw new Error('Failed to confirm payment');
    }

    return response.data.data;
  },

  async createCashfreeRequest(
    data: CreateCashfreePaymentRequest,
  ): Promise<CashfreePaymentRequestResult> {
    const response = await apiClient.post<ApiResponse<CashfreePaymentRequestResult>>(
      '/payments/cashfree/request',
      data,
    );

    if (!response.data.data) {
      throw new Error('Failed to create Cashfree payment request');
    }

    return response.data.data;
  },

  async simulateCashfreeSuccess(paymentId: number): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<Payment>>(
      `/payments/cashfree/mock-success/${paymentId}`,
    );

    if (!response.data.data) {
      throw new Error('Failed to simulate Cashfree success');
    }

    return response.data.data;
  },

  async getAll(options: PaymentQueryOptions = {}): Promise<Payment[]> {
    const response = await apiClient.get<ApiResponse<Payment[]>>('/payments', {
      params: {
        month: options.month,
        year: options.year,
        limit: options.limit,
      },
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

  async getCommunications(
    options: PaymentCommunicationQueryOptions = {},
  ): Promise<PaymentCommunication[]> {
    const response = await apiClient.get<ApiResponse<PaymentCommunication[]>>(
      '/payments/communications',
      {
        params: {
          student_id: options.student_id,
          payment_id: options.payment_id,
          limit: options.limit,
        },
      },
    );

    return response.data.data || [];
  },

  async sendReminder(
    data: SendPaymentReminderRequest,
  ): Promise<PaymentCommunication[]> {
    const response = await apiClient.post<ApiResponse<PaymentCommunication[]>>(
      '/payments/reminders/send',
      data,
    );

    return response.data.data || [];
  },

  async runReminderBatch(
    channel: SendPaymentReminderRequest['channel'] = 'both',
  ): Promise<PaymentReminderBatchResult> {
    const response = await apiClient.post<ApiResponse<PaymentReminderBatchResult>>(
      '/payments/reminders/run-daily',
      { channel },
    );

    if (!response.data.data) {
      throw new Error('Failed to run reminder batch');
    }

    return response.data.data;
  },

  async getMonthlyRevenue(year: number, month: number): Promise<MonthlyRevenue> {
    const response = await apiClient.get<ApiResponse<MonthlyRevenue>>(
      `/payments/revenue/${month}/${year}`,
    );

    if (!response.data.data) {
      throw new Error('Failed to get revenue data');
    }

    return response.data.data;
  },

  async getReceipt(receiptNumber: string): Promise<PaymentReceipt> {
    const response = await apiClient.get<ApiResponse<PaymentReceipt>>(
      `/payments/receipt/${receiptNumber}`,
    );

    if (!response.data.data) {
      throw new Error('Receipt not found');
    }

    return response.data.data;
  },

  async sendReceipt(
    paymentId: number,
    data: SendPaymentReceiptRequest = {},
  ): Promise<PaymentCommunication[]> {
    const response = await apiClient.post<ApiResponse<PaymentCommunication[]>>(
      `/payments/receipt/${paymentId}/send`,
      data,
    );

    return response.data.data || [];
  },
};
