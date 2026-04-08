import { Router } from 'express';
import * as authController from './auth.controller.ts';
import { authenticateToken } from '../../middleware/auth.middleware.ts';
import { authLoginRateLimiter } from '../../middleware/rate-limit.middleware.ts';

const router = Router();

// POST /api/auth/login - Admin login (no auth required)
router.post('/login', authLoginRateLimiter, authController.login);

// POST /api/auth/logout - Invalidate the current session token
router.post('/logout', authenticateToken, authController.logout);

// GET /api/auth/me - Get current user (auth required)
router.get('/me', authenticateToken, authController.getCurrentUser);

export default router;
