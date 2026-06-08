import { Router } from 'express';
import * as paymentController from './payments.controller.ts';
import {
  authenticateToken,
  requireSuperAdmin,
} from '../../middleware/auth.middleware.ts';
import {
  publicPaymentRateLimiter,
  webhookRateLimiter,
} from '../../middleware/rate-limit.middleware.ts';

const router = Router();

// -------------------- WEBHOOKS --------------------
router.post('/cashfree/webhook', webhookRateLimiter, paymentController.handleCashfreeWebhook);
router.post('/webhooks/confirm', webhookRateLimiter, paymentController.confirmPaymentWebhook);

// -------------------- CASHFREE --------------------
router.post(
  '/cashfree/request',
  authenticateToken,
  paymentController.createCashfreePaymentRequest,
);

router.post(
  '/cashfree/mock-success/:paymentId',
  authenticateToken,
  requireSuperAdmin,
  paymentController.simulateCashfreeSuccess,
);

// -------------------- PAYMENTS --------------------
router.post('/', authenticateToken, paymentController.recordPayment);

router.post(
  '/:paymentId/confirm',
  authenticateToken,
  requireSuperAdmin,
  paymentController.confirmPayment,
);

router.post(
  '/:paymentId/cancel',
  authenticateToken,
  paymentController.cancelPayment,
);

// -------------------- REMINDERS --------------------
router.post('/reminders/send', authenticateToken, paymentController.sendPaymentReminder);
router.post('/reminders/run-daily', authenticateToken, paymentController.runReminderBatch);

// -------------------- RECEIPTS --------------------
router.post('/receipt/:paymentId/send', authenticateToken, paymentController.sendPaymentReceipt);
router.get('/receipt/:receiptNumber', authenticateToken, paymentController.getPaymentByReceipt);

// -------------------- OTHER --------------------
router.get('/public/:accessToken', publicPaymentRateLimiter, paymentController.getPublicPaymentByAccessToken);
router.get('/student/:studentId', authenticateToken, paymentController.getStudentPayments);
router.get('/communications', authenticateToken, paymentController.getPaymentCommunications);
router.get('/pending', authenticateToken, paymentController.getPendingPayments);
router.get(
  '/export/monthly-pdf/:year/:month',
  authenticateToken,
  paymentController.downloadMonthlyPaymentHistoryPdf,
);
router.get('/revenue/:month/:year', authenticateToken, paymentController.getMonthlyRevenue);
router.get('/', authenticateToken, paymentController.getAllPayments);

export default router;
