import { Router } from 'express';
import * as attendanceController from './attendance.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
const router = Router();
// All routes require authentication
router.post('/entry', authenticateToken, attendanceController.markEntry);
router.post('/exit', authenticateToken, attendanceController.markExit);
router.get('/today', authenticateToken, attendanceController.getTodayAttendance);
router.get('/student/:studentId', authenticateToken, attendanceController.getStudentAttendance);
router.get('/student/:studentId/stats', authenticateToken, attendanceController.getStudentStats);
export default router;
//# sourceMappingURL=attendance.routes.js.map