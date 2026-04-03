import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware.ts';
import * as notificationsController from './notifications.controller.ts';

const router = Router();

// GET /api/notifications — fetch all notifications for the authenticated user
router.get('/', authenticateToken, notificationsController.getNotifications);

// PATCH /api/notifications/read-all — mark all notifications as read
router.patch('/read-all', authenticateToken, notificationsController.markAllNotificationsAsRead);

// PATCH /api/notifications/:notificationId/read — mark a single notification as read
router.patch(
  '/:notificationId/read',
  authenticateToken,
  notificationsController.markNotificationAsRead,
);

export default router;
