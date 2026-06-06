import { Router } from 'express';
import * as feesController from './fees.controller.ts';
import { authenticateToken } from '../../middleware/auth.middleware.ts';

const router = Router();

router.get('/dashboard', authenticateToken, feesController.getDashboard);
router.get('/student-statuses', authenticateToken, feesController.getStudentStatuses);
router.get('/overdue', authenticateToken, feesController.getOverdueStudents);
router.post('/dues', authenticateToken, feesController.generateDues);
router.post('/payments', authenticateToken, feesController.recordPayment);
router.get('/payments', authenticateToken, feesController.getPaymentHistory);
router.get('/students/:studentId/payments', authenticateToken, feesController.getStudentPayments);

export default router;
