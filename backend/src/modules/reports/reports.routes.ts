import { Router } from 'express';
import { authenticateToken, requireSuperAdmin } from '../../middleware/auth.middleware.ts';
import * as reportsController from './reports.controller.ts';

const router = Router();

// All reports routes require superadmin role
router.use(authenticateToken, requireSuperAdmin);

// GET /api/reports/overview - Get overview stats
router.get('/overview', reportsController.getOverview);

// GET /api/reports/revenue-trend - Get revenue trend (last 6 months)
router.get('/revenue-trend', reportsController.getRevenueTrend);

// GET /api/reports/student-growth - Get student growth (last 6 months)
router.get('/student-growth', reportsController.getStudentGrowth);

// GET /api/reports/branch-comparison - Compare all branches
router.get('/branch-comparison', reportsController.getBranchComparison);

// GET /api/reports/attendance-patterns - Attendance patterns
router.get('/attendance-patterns', reportsController.getAttendancePatterns);

export default router;