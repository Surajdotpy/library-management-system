export type NotificationType = 'app_update' | 'payment_received' | 'payment_submitted';
export type NotificationSeverity = 'critical' | 'warning' | 'info';

export interface NotificationItem {
  id: number | string;
  type: NotificationType;
  severity: NotificationSeverity;
  branch_id: number | null;
  branch_name: string | null;
  title: string;
  description: string;
  action_route: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationList {
  unread_count: number;
  notifications: NotificationItem[];
}
