import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.ts';
import * as paymentService from './payments.service.ts';
import { resolvePaymentAlert } from '../telegram/telegram-bot.service.ts';
import type {
  CreateCashfreePaymentRequestDTO,
  ConfirmPaymentDTO,
  ConfirmPaymentWebhookDTO,
  PaymentCommunicationQueryOptions,
  PaymentHistoryQueryOptions,
  RecordPaymentDTO,
  SendPaymentReceiptDTO,
  SendPaymentReminderDTO,
} from './payments.types.ts';
import {
  rememberProcessedCashfreeWebhook,
  parseCashfreeSuccessfulPaymentWebhook,
  validateCashfreeWebhookRequest,
} from './payments.cashfree.ts';
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

function secretsMatch(
  configuredSecret: string | null | undefined,
  providedSecret: string | null | undefined,
): boolean {
  if (!configuredSecret || !providedSecret) {
    return false;
  }

  const configuredBuffer = Buffer.from(configuredSecret);
  const providedBuffer = Buffer.from(providedSecret);

  if (configuredBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(configuredBuffer, providedBuffer);
}

interface RawBodyRequest extends Request {
  rawBody?: string;
}

// POST /api/payments - Record a new payment
export async function recordPayment(req: AuthRequest, res: Response) {
  try {
    const body = (req.body ?? {}) as Partial<RecordPaymentDTO>;
    const data: RecordPaymentDTO = {
      student_id: body.student_id as number,
      amount: body.amount as number,
      ...(body.fee_month != null ? { fee_month: body.fee_month } : {}),
      ...(body.fee_year != null ? { fee_year: body.fee_year } : {}),
      ...(body.payment_method ? { payment_method: body.payment_method } : {}),
      ...(body.transaction_id ? { transaction_id: body.transaction_id } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
      ...(body.payment_date ? { payment_date: body.payment_date } : {}),
    };

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
      message: 'Payment submitted for verification',
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
      error.message.includes('already submitted') ||
      error.message.includes('already pending verification') ||
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

// POST /api/payments/:paymentId/confirm - Confirm a pending payment after bank verification
export async function confirmPayment(req: AuthRequest, res: Response) {
  try {
    const paymentId = Number.parseInt(req.params.paymentId as string, 10);
    const data = (req.body ?? {}) as ConfirmPaymentDTO;

    if (Number.isNaN(paymentId)) {
      return badRequest(res, 'Invalid payment ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const payment = await paymentService.confirmPayment(paymentId, user.userId, branchId, data);

    resolvePaymentAlert(paymentId, user.email ?? `Admin #${user.userId}`, 'confirmed');

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully',
      data: payment,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Confirm payment error:', error);

    if (
      error.message.includes('not found') ||
      error.message.includes('Only pending payments') ||
      error.message.includes('Amount mismatch') ||
      error.message.includes('Invalid confirmed_at')
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment',
    });
  }
}

// POST /api/payments/:paymentId/cancel - Cancel a pending payment
export async function cancelPayment(req: AuthRequest, res: Response) {
  try {
    const paymentId = Number.parseInt(req.params.paymentId as string, 10);

    if (Number.isNaN(paymentId)) {
      return badRequest(res, 'Invalid payment ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    await paymentService.cancelPayment(paymentId, user.userId, branchId);

    res.status(200).json({
      success: true,
      message: 'Payment cancelled',
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Cancel payment error:', error);

    if (
      error.message.includes('not found') ||
      error.message.includes('Only pending payments')
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to cancel payment',
    });
  }
}

// POST /api/payments/webhooks/confirm - Confirm a pending payment from an external payment system
export async function confirmPaymentWebhook(req: Request, res: Response) {
  try {
    const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
    const providedSecret = req.get('x-payment-webhook-secret')?.trim();

    if (!configuredSecret) {
      return res.status(503).json({
        success: false,
        error: 'Payment webhook confirmation is not configured',
      });
    }

    if (!secretsMatch(configuredSecret, providedSecret)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook secret',
      });
    }

    const data = (req.body ?? {}) as ConfirmPaymentWebhookDTO;

    if (data.payment_id == null && !data.transaction_id?.trim()) {
      return badRequest(res, 'payment_id or transaction_id is required');
    }

    const payment = await paymentService.confirmPaymentFromWebhook(data);

    res.status(200).json({
      success: true,
      message: 'Payment confirmed via webhook',
      data: payment,
    });
  } catch (error: any) {
    console.error('Confirm payment webhook error:', error);

    if (
      error.message.includes('required') ||
      error.message.includes('not found') ||
      error.message.includes('Only pending payments') ||
      error.message.includes('Amount mismatch') ||
      error.message.includes('Invalid confirmed_at')
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment from webhook',
    });
  }
}

// POST /api/payments/cashfree/request - Create a Cashfree-style payment request
export async function createCashfreePaymentRequest(req: AuthRequest, res: Response) {
  try {
    const data = (req.body ?? {}) as CreateCashfreePaymentRequestDTO;

    if (!data.student_id) {
      return badRequest(res, 'student_id is required');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const result = await paymentService.createCashfreePaymentRequest(
      data,
      user.userId,
      branchId,
    );

    res.status(201).json({
      success: true,
      message: 'Cashfree payment request created',
      data: result,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Create Cashfree payment request error:', error);

    if (
      error.message.includes('student_id is required') ||
      error.message.includes('pending verification') ||
      error.message.includes('not found') ||
      error.message.includes('credentials are missing') ||
      error.message.includes('Cashfree')
    ) {
      return badRequest(res, error.message);
    }

    if (process.env.NODE_ENV !== 'production' && typeof error.message === 'string' && error.message.trim()) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create Cashfree payment request',
    });
  }
}

// POST /api/payments/cashfree/webhook - Handle Cashfree payment success webhooks
export async function handleCashfreeWebhook(req: RawBodyRequest, res: Response) {
  try {
    const rawBody = req.rawBody;

    if (!rawBody) {
      return res.status(400).json({
        success: false,
        error: 'Missing webhook request body',
      });
    }
    const timestamp = req.get('x-webhook-timestamp');
    const signature = req.get('x-webhook-signature');

    const validation = validateCashfreeWebhookRequest(rawBody, timestamp, signature);

    if (!validation.isValid) {
      return res.status(401).json({
        success: false,
        error: validation.error ?? 'Invalid Cashfree webhook request',
      });
    }

    if (validation.isDuplicate) {
      return res.status(200).json({
        success: true,
        message: 'Cashfree webhook already processed',
      });
    }

    const paymentUpdate = parseCashfreeSuccessfulPaymentWebhook(req.body);

    if (!paymentUpdate) {
      return res.status(200).json({
        success: true,
        message: 'Cashfree webhook ignored',
      });
    }

    const webhookConfirmation: ConfirmPaymentWebhookDTO = {
      transaction_id: paymentUpdate.orderId,
      ...(paymentUpdate.cfPaymentId
        ? { verification_reference: paymentUpdate.cfPaymentId }
        : {}),
      ...(paymentUpdate.paidAt ? { confirmed_at: paymentUpdate.paidAt } : {}),
      ...(paymentUpdate.amount != null ? { amount: paymentUpdate.amount } : {}),
    };
    const payment = await paymentService.confirmPaymentFromWebhook(webhookConfirmation);
    rememberProcessedCashfreeWebhook(timestamp, signature);

    res.status(200).json({
      success: true,
      message: 'Cashfree payment confirmed',
      data: payment,
    });
  } catch (error: any) {
    console.error('Cashfree webhook error:', error);

    if (
      error.message.includes('required') ||
      error.message.includes('not found') ||
      error.message.includes('Only pending payments') ||
      error.message.includes('Amount mismatch') ||
      error.message.includes('Invalid confirmed_at')
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process Cashfree webhook',
    });
  }
}

// POST /api/payments/cashfree/mock-success/:paymentId - Simulate a Cashfree success callback in mock mode
export async function simulateCashfreeSuccess(req: AuthRequest, res: Response) {
  try {
    const paymentId = Number.parseInt(req.params.paymentId as string, 10);

    if (Number.isNaN(paymentId)) {
      return badRequest(res, 'Invalid payment ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const payment = await paymentService.simulateCashfreePaymentSuccess(
      paymentId,
      user.userId,
      branchId,
    );

    res.status(200).json({
      success: true,
      message: 'Mock Cashfree success processed',
      data: payment,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Mock Cashfree success error:', error);

    if (
      error.message.includes('not found') ||
      error.message.includes('missing') ||
      error.message.includes('Amount mismatch')
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to simulate Cashfree success',
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
    const search =
      typeof req.query.search === 'string' && req.query.search.trim() !== ''
        ? req.query.search.trim()
        : undefined;
    const requestedBranchId = parseBranchId(req.query.branch_id);
    const page = parseInteger(req.query.page) ?? 1;
    const limit = parseInteger(req.query.limit) ?? 25;

    if (requestedBranchId !== undefined && Number.isNaN(requestedBranchId)) {
      return badRequest(res, 'Invalid branch ID');
    }

    if (Number.isNaN(page) || page < 1) {
      return badRequest(res, 'Invalid page');
    }

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return badRequest(res, 'Invalid limit. Must be between 1 and 100');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user, requestedBranchId);
    const options: PaymentHistoryQueryOptions = {
      ...(month != null ? { month } : {}),
      ...(year != null ? { year } : {}),
      ...(branchId != null ? { branchId } : {}),
      ...(search ? { search } : {}),
      page,
      limit,
    };
    const paymentHistory = await paymentService.getAllPayments(options);

    res.status(200).json({
      success: true,
      count: paymentHistory.payments.length,
      data: {
        data: paymentHistory.payments,
        total: paymentHistory.total,
        page: paymentHistory.page,
        limit: paymentHistory.limit,
        totalPages: paymentHistory.totalPages,
      },
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

    if (requestedBranchId !== undefined && Number.isNaN(requestedBranchId)) {
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

export async function downloadMonthlyPaymentHistoryPdf(req: AuthRequest, res: Response) {
  try {
    const month = Number.parseInt(req.params.month as string, 10);
    const year = Number.parseInt(req.params.year as string, 10);
    const requestedBranchId = parseBranchId(req.query.branch_id);

    if (Number.isNaN(month) || Number.isNaN(year)) {
      return badRequest(res, 'Invalid month or year');
    }

    if (month < 1 || month > 12) {
      return badRequest(res, 'Month must be between 1 and 12');
    }

    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > currentYear + 1) {
      return badRequest(res, `Year must be between 2020 and ${currentYear + 1}`);
    }

    if (requestedBranchId !== undefined && Number.isNaN(requestedBranchId)) {
      return badRequest(res, 'Invalid branch ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user, requestedBranchId);
    const report = await paymentService.exportMonthlyPaymentHistoryPdf(month, year, branchId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.status(200).send(report.buffer);
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Download monthly payment history PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export monthly payment history PDF',
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
      (requestedBranchId !== undefined && Number.isNaN(requestedBranchId)) ||
      (studentId !== undefined && Number.isNaN(studentId)) ||
      (paymentId !== undefined && Number.isNaN(paymentId)) ||
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

    // FIX: Added 'pending verification' so the new guard in sendPaymentReminder
    // returns 400 instead of 500 when student already has a pending payment
    if (
      error.message.includes('not found') ||
      error.message.includes('reminder window') ||
      error.message.includes('already sent') ||
      error.message.includes('pending verification')
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

    if (
      error.message.includes('not found') ||
      error.message.includes('only after payment verification')
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to send payment receipt',
    });
  }
}

// GET /api/payments/public/:accessToken - Get a public payment view for the student payment page
export async function getPublicPaymentByAccessToken(req: Request, res: Response) {
  try {
    const accessToken =
      typeof req.params.accessToken === 'string' ? req.params.accessToken.trim() : '';

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment access token',
      });
    }

    const payment = await paymentService.getPublicPaymentByAccessToken(accessToken);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment link is invalid, expired, or no longer available',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Get public payment by token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment details',
    });
  }
}