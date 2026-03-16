import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';
export declare function recordPayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getStudentPayments(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getAllPayments(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getPendingPayments(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getMonthlyRevenue(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getPaymentByReceipt(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=payments.controller.d.ts.map