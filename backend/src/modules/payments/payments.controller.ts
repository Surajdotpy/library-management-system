import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.ts';
import * as paymentService from './payments.service.ts';
import type { RecordPaymentDTO } from './payments.types.ts';
import {
  isAuthorizationError,
  requireAuthenticatedUser,
  resolveAuthorizedBranchId,
} from '../auth/auth.authorization.ts';

function badRequest(res: Response, error: string) {
  return res.status(400).json({
    success: false,
    error,
  });
}

function parseBranchId(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? Number.NaN : parsedValue;
}

// POST /api/payments - Record a new payment
export async function recordPayment(req: AuthRequest, res: Response) {
  try {
    const data: RecordPaymentDTO = req.body;

    if (!data.student_id || !data.amount || !data.fee_month || !data.fee_year) {
      return badRequest(
        res,
        'Missing required fields: student_id, amount, fee_month, fee_year',
      );
    }

    if (data.fee_month < 1 || data.fee_month > 12) {
      return badRequest(res, 'Invalid fee_month. Must be between 1 and 12');
    }

    const currentYear = new Date().getFullYear();
    if (data.fee_year < 2020 || data.fee_year > currentYear + 1) {
      return badRequest(
        res,
        `Invalid fee_year. Must be between 2020 and ${currentYear + 1}`,
      );
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const payment = await paymentService.recordPayment(
      data,
      user.userId,
      branchId,
    );

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Record payment error:', error);

    if (
      error.message.includes('already recorded') ||
      error.message.includes('not found') ||
      error.message.includes('Amount mismatch')
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to record payment',
    });
  }
}

// GET /api/payments/student/:studentId - Get student's payment history
export async function getStudentPayments(req: AuthRequest, res: Response) {
  try {
    const studentId = Number.parseInt(req.params.studentId as string, 10);

    if (Number.isNaN(studentId)) {
      return badRequest(res, 'Invalid student ID');
    }

    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 12;
    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const history = await paymentService.getStudentPaymentHistory(
      studentId,
      limit,
      branchId,
    );

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get student payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment history',
    });
  }
}

// GET /api/payments - Get all payments (with filters)
export async function getAllPayments(req: AuthRequest, res: Response) {
  try {
    const month = req.query.month ? Number.parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? Number.parseInt(req.query.year as string, 10) : undefined;
    const requestedBranchId = parseBranchId(req.query.branch_id);
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;

    if (Number.isNaN(requestedBranchId)) {
      return badRequest(res, 'Invalid branch ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user, requestedBranchId);
    const payments = await paymentService.getAllPayments(
      month,
      year,
      branchId,
      limit,
    );

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payments',
    });
  }
}

// GET /api/payments/pending - Get pending payments
export async function getPendingPayments(req: AuthRequest, res: Response) {
  try {
    const requestedBranchId = parseBranchId(req.query.branch_id);

    if (Number.isNaN(requestedBranchId)) {
      return badRequest(res, 'Invalid branch ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user, requestedBranchId);
    const pending = await paymentService.getPendingPayments(branchId);

    res.status(200).json({
      success: true,
      count: pending.length,
      data: pending,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get pending payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending payments',
    });
  }
}

// GET /api/payments/revenue/:month/:year - Get monthly revenue report
export async function getMonthlyRevenue(req: AuthRequest, res: Response) {
  try {
    const month = Number.parseInt(req.params.month as string, 10);
    const year = Number.parseInt(req.params.year as string, 10);

    if (Number.isNaN(month) || Number.isNaN(year)) {
      return badRequest(res, 'Invalid month or year');
    }

    if (month < 1 || month > 12) {
      return badRequest(res, 'Month must be between 1 and 12');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const revenue = await paymentService.getMonthlyRevenue(month, year, branchId);

    res.status(200).json({
      success: true,
      data: revenue,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get monthly revenue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue report',
    });
  }
}

// GET /api/payments/receipt/:receiptNumber - Get payment by receipt number
export async function getPaymentByReceipt(req: AuthRequest, res: Response) {
  try {
    const receiptNumber = req.params.receiptNumber as string;

    if (!receiptNumber) {
      return badRequest(res, 'Receipt number is required');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const payment = await paymentService.getPaymentByReceiptNumber(
      receiptNumber,
      branchId,
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get payment by receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment',
    });
  }
}
