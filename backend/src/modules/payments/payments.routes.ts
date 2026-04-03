import { Router } from 'express';
import * as paymentController from './payments.controller.ts';
import {
  authenticateToken,
  requireSuperAdmin,
} from '../../middleware/auth.middleware.ts';

const router = Router();

// -------------------- PUBLIC (NO AUTH) --------------------
// 👇 IMPORTANT: student payment page needs this
router.get('/:paymentId', paymentController.getPaymentById);

// -------------------- WEBHOOKS --------------------
router.post('/cashfree/webhook', paymentController.handleCashfreeWebhook);
router.post('/webhooks/confirm', paymentController.confirmPaymentWebhook);

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

// -------------------- REMINDERS --------------------
router.post('/reminders/send', authenticateToken, paymentController.sendPaymentReminder);
router.post('/reminders/run-daily', authenticateToken, paymentController.runReminderBatch);

// -------------------- RECEIPTS --------------------
router.post('/receipt/:paymentId/send', authenticateToken, paymentController.sendPaymentReceipt);
router.get('/receipt/:receiptNumber', authenticateToken, paymentController.getPaymentByReceipt);

// -------------------- OTHER --------------------
router.get('/student/:studentId', authenticateToken, paymentController.getStudentPayments);
router.get('/communications', authenticateToken, paymentController.getPaymentCommunications);
router.get('/pending', authenticateToken, paymentController.getPendingPayments);
router.get('/revenue/:month/:year', authenticateToken, paymentController.getMonthlyRevenue);
router.get('/', authenticateToken, paymentController.getAllPayments);

export default router;