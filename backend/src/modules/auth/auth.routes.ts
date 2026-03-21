import { Router } from 'express';
import * as authController from './auth.controller.ts';
import { authenticateToken } from '../../middleware/auth.middleware.ts';

const router = Router();

// POST /api/auth/login - Admin login (no auth required)
router.post('/login', authController.login);

// POST /api/auth/logout - Admin logout (no auth required)
router.post('/logout', authController.logout);

// GET /api/auth/me - Get current user (auth required)
router.get('/me', authenticateToken, authController.getCurrentUser);

export default router;