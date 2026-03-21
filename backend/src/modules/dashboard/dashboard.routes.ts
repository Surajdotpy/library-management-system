import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware.ts';
import * as dashboardController from './dashboard.controller.ts';

const router = Router();

router.get('/summary', authenticateToken, dashboardController.getSummary);

export default router;
