import type { Payment, RecordPaymentDTO, PaymentWithStudent, PendingPayment, MonthlyRevenue } from './payments.types.js';
export declare function recordPayment(data: RecordPaymentDTO, collectedBy: number, branchId?: number): Promise<Payment>;
export declare function getStudentPaymentHistory(studentId: number, limit?: number, branchId?: number): Promise<Payment[]>;
export declare function getAllPayments(month?: number, year?: number, branchId?: number, limit?: number): Promise<PaymentWithStudent[]>;
export declare function getPendingPayments(branchId?: number): Promise<PendingPayment[]>;
export declare function getMonthlyRevenue(month: number, year: number, branchId?: number): Promise<MonthlyRevenue>;
export declare function getPaymentByReceiptNumber(receiptNumber: string, branchId?: number): Promise<PaymentWithStudent | null>;
//# sourceMappingURL=payments.service.d.ts.map