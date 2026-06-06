import { Router } from 'express';
import { z } from 'zod';
import * as authController from './auth.controller.ts';
import { authenticateToken } from '../../middleware/auth.middleware.ts';
import { authLoginRateLimiter } from '../../middleware/rate-limit.middleware.ts';

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const router = Router();

// POST /api/auth/login - Admin login (no auth required)
router.post(
  '/login',
  authLoginRateLimiter,
  (req, res, next) => {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error.issues.map((e: z.ZodIssue) => e.message).join(', '),
      });
    }

    req.body = result.data;
    next();
  },
  authController.login,
);

// POST /api/auth/logout - Invalidate the current session token
router.post('/logout', authenticateToken, authController.logout);

// GET /api/auth/me - Get current user (auth required)
router.get('/me', authenticateToken, authController.getCurrentUser);

export default router;
