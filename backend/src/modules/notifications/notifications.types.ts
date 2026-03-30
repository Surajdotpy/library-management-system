export type AppNotificationType = 'payment_received';
export type AppNotificationSeverity = 'critical' | 'warning' | 'info';

export interface AppNotification {
  id: number;
  type: AppNotificationType;
  severity: AppNotificationSeverity;
  branch_id: number | null;
  branch_name: string | null;
  title: string;
  description: string;
  action_route: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
}

export interface AppNotificationList {
  unread_count: number;
  notifications: AppNotification[];
}

export interface CreateNotificationInput {
  type: AppNotificationType;
  severity: AppNotificationSeverity;
  branch_id: number | null;
  title: string;
  description: string;
  action_route: string;
  metadata?: Record<string, unknown> | null;
  source_key?: string | null;
}
