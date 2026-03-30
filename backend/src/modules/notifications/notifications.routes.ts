import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware.ts';
import * as notificationsController from './notifications.controller.ts';

const router = Router();

router.get('/', authenticateToken, notificationsController.getNotifications);
router.patch(
  '/:notificationId/read',
  authenticateToken,
  notificationsController.markNotificationAsRead,
);

export default router;
