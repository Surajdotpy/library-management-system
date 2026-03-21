import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware.ts';
import * as branchesController from './branches.controller.ts';

const router = Router();

router.get('/', authenticateToken, branchesController.getBranches);

export default router;
