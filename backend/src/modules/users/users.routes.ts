import { Router } from 'express';
import { authenticateToken, requireRole } from '../../middleware/auth.middleware.js';
import * as usersController from './users.controller.js';

const router = Router();

router.use(authenticateToken, requireRole('superadmin'));
router.get('/admins', usersController.getAdmins);
router.post('/admins', usersController.createAdmin);

export default router;
