import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.ts';
import {
  isAuthorizationError,
  requireAuthenticatedUser,
} from '../auth/auth.authorization.ts';
import * as notificationsService from './notifications.service.ts';

function badRequest(res: Response, error: string) {
  return res.status(400).json({
    success: false,
    error,
  });
}

export async function getNotifications(req: AuthRequest, res: Response) {
  try {
    const limit = req.query.limit
      ? Number.parseInt(req.query.limit as string, 10)
      : 20;

    if (Number.isNaN(limit) || limit < 1) {
      return badRequest(res, 'Invalid limit');
    }

    const user = requireAuthenticatedUser(req.user);
    const notifications = await notificationsService.getNotificationsForUser(
      user,
      limit,
    );

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
    });
  }
}

export async function markNotificationAsRead(req: AuthRequest, res: Response) {
  try {
    const notificationId = Number.parseInt(req.params.notificationId as string, 10);

    if (Number.isNaN(notificationId)) {
      return badRequest(res, 'Invalid notification ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const markedAsRead = await notificationsService.markNotificationAsRead(
      notificationId,
      user,
    );

    if (!markedAsRead) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: {
        notification_id: notificationId,
      },
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
    });
  }
}

export async function markAllNotificationsAsRead(req: AuthRequest, res: Response) {
  try {
    const user = requireAuthenticatedUser(req.user);
    const markedCount = await notificationsService.markAllNotificationsAsRead(user);

    res.status(200).json({
      success: true,
      message: `${markedCount} notification(s) marked as read`,
      data: {
        marked_count: markedCount,
      },
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status((error as any).statusCode).json({
        success: false,
        error: (error as any).message,
      });
    }

    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
    });
  }
}
