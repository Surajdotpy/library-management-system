import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import * as branchesController from './branches.controller.js';
const router = Router();
router.get('/', authenticateToken, branchesController.getBranches);
export default router;
//# sourceMappingURL=branches.routes.js.map