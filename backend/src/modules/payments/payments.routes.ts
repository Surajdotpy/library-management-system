import { Router } from 'express';
import * as paymentController from './payments.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.post('/', authenticateToken, paymentController.recordPayment);
router.get('/student/:studentId', authenticateToken, paymentController.getStudentPayments);
router.get('/pending', authenticateToken, paymentController.getPendingPayments);
router.get('/revenue/:month/:year', authenticateToken, paymentController.getMonthlyRevenue);
router.get('/receipt/:receiptNumber', authenticateToken, paymentController.getPaymentByReceipt);
router.get('/', authenticateToken, paymentController.getAllPayments);

export default router;