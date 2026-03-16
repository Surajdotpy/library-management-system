import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import * as dashboardController from './dashboard.controller.js';
const router = Router();
router.get('/summary', authenticateToken, dashboardController.getSummary);
export default router;
//# sourceMappingURL=dashboard.routes.js.map