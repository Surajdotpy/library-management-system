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
  PaginatedResponse,
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

  async getAll(options: PaymentQueryOptions = {}): Promise<PaginatedResponse<Payment>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Payment>>>('/payments', {
      params: {
        month: options.month,
        year: options.year,
        search: options.search,
        page: options.page,
        limit: options.limit,
      },
    });

    return (
      response.data.data || {
        data: [],
        total: 0,
        page: options.page ?? 1,
        limit: options.limit ?? 25,
        totalPages: 1,
      }
    );
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

  async downloadMonthlyHistoryPdf(year: number, month: number): Promise<void> {
    const response = await apiClient.get<Blob>(`/payments/export/monthly-pdf/${year}/${month}`, {
      responseType: 'blob',
      timeout: 30000,
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const dispositionHeader = response.headers['content-disposition'];
    const filenameMatch = dispositionHeader?.match(/filename=\"?([^"]+)\"?/i);
    const filename = filenameMatch?.[1] || `payment-history-${year}-${month}.pdf`;
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
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
