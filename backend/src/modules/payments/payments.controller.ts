import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.ts';
import * as paymentService from './payments.service.ts';
import type {
  PaymentCommunicationQueryOptions,
  RecordPaymentDTO,
  SendPaymentReceiptDTO,
  SendPaymentReminderDTO,
} from './payments.types.ts';
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

function parseInteger(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? Number.NaN : parsedValue;
}

function isValidRequestedChannel(value: unknown): boolean {
  return value == null || value === 'sms' || value === 'whatsapp' || value === 'both';
}

// POST /api/payments - Record a new payment
export async function recordPayment(req: AuthRequest, res: Response) {
  try {
    const data: RecordPaymentDTO = req.body;

    if (!data.student_id || !data.amount) {
      return badRequest(res, 'Missing required fields: student_id, amount');
    }

    if (data.fee_month != null && (data.fee_month < 1 || data.fee_month > 12)) {
      return badRequest(res, 'Invalid fee_month. Must be between 1 and 12');
    }

    const currentYear = new Date().getFullYear();
    if (
      data.fee_year != null &&
      (data.fee_year < 2020 || data.fee_year > currentYear + 1)
    ) {
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

// GET /api/payments/communications - Get reminder and receipt history
export async function getPaymentCommunications(req: AuthRequest, res: Response) {
  try {
    const requestedBranchId = parseBranchId(req.query.branch_id);
    const studentId = parseInteger(req.query.student_id);
    const paymentId = parseInteger(req.query.payment_id);
    const limit = parseInteger(req.query.limit) ?? 50;

    if (
      Number.isNaN(requestedBranchId) ||
      Number.isNaN(studentId) ||
      Number.isNaN(paymentId) ||
      Number.isNaN(limit)
    ) {
      return badRequest(res, 'Invalid communications query');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user, requestedBranchId);
    const options: PaymentCommunicationQueryOptions = {
      limit,
      ...(studentId != null && { student_id: studentId }),
      ...(paymentId != null && { payment_id: paymentId }),
    };
    const communications = await paymentService.getPaymentCommunicationHistory(
      options,
      branchId,
    );

    res.status(200).json({
      success: true,
      count: communications.length,
      data: communications,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get payment communications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment communications',
    });
  }
}

// POST /api/payments/reminders/send - Send a due reminder to one student
export async function sendPaymentReminder(req: AuthRequest, res: Response) {
  try {
    const data: SendPaymentReminderDTO = req.body;

    if (!data.student_id) {
      return badRequest(res, 'student_id is required');
    }

    if (!isValidRequestedChannel(data.channel)) {
      return badRequest(res, 'Invalid channel. Use sms, whatsapp, or both');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const communications = await paymentService.sendPaymentReminder(
      data.student_id,
      user.userId,
      branchId,
      data.channel,
    );

    res.status(200).json({
      success: true,
      message: 'Reminder sent successfully',
      count: communications.length,
      data: communications,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Send payment reminder error:', error);

    if (
      error.message.includes('not found') ||
      error.message.includes('reminder window') ||
      error.message.includes('already sent')
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to send payment reminder',
    });
  }
}

// POST /api/payments/reminders/run-daily - Send reminder batch for due/overdue students
export async function runReminderBatch(req: AuthRequest, res: Response) {
  try {
    const body = (req.body ?? {}) as { channel?: 'sms' | 'whatsapp' | 'both' };

    if (!isValidRequestedChannel(body.channel)) {
      return badRequest(res, 'Invalid channel. Use sms, whatsapp, or both');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const result = await paymentService.runReminderBatch(
      user.userId,
      branchId,
      body.channel,
    );

    res.status(200).json({
      success: true,
      message: 'Reminder batch processed successfully',
      data: result,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Run reminder batch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run reminder batch',
    });
  }
}

// POST /api/payments/receipt/:paymentId/send - Resend payment receipt
export async function sendPaymentReceipt(req: AuthRequest, res: Response) {
  try {
    const paymentId = Number.parseInt(req.params.paymentId as string, 10);
    const data = (req.body ?? {}) as SendPaymentReceiptDTO;

    if (Number.isNaN(paymentId)) {
      return badRequest(res, 'Invalid payment ID');
    }

    if (!isValidRequestedChannel(data.channel)) {
      return badRequest(res, 'Invalid channel. Use sms, whatsapp, or both');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const communications = await paymentService.sendPaymentReceipt(
      paymentId,
      user.userId,
      branchId,
      data.channel,
    );

    res.status(200).json({
      success: true,
      message: 'Receipt sent successfully',
      count: communications.length,
      data: communications,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Send payment receipt error:', error);

    if (error.message.includes('not found')) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to send payment receipt',
    });
  }
}
