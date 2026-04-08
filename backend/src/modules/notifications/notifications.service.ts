import type { PoolClient } from 'pg';
import pool from '../../config/db.ts';
import type { JWTPayload } from '../auth/auth.types.ts';
import { resolveAuthorizedBranchId } from '../auth/auth.authorization.ts';
import type {
  AppNotification,
  AppNotificationList,
  CreateNotificationInput,
} from './notifications.types.ts';

type Queryable = Pick<PoolClient, 'query'>;

interface NotificationRow {
  id: number;
  type: AppNotification['type'];
  severity: AppNotification['severity'];
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

function mapNotificationRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    branch_id: row.branch_id,
    branch_name: row.branch_name,
    title: row.title,
    description: row.description,
    action_route: row.action_route,
    metadata: row.metadata ?? null,
    is_read: row.is_read,
    read_at: row.read_at,
    created_at: row.created_at,
  };
}

function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`;
}

function getVisibleBranchId(user: JWTPayload): number | undefined {
  return resolveAuthorizedBranchId(user);
}

export async function createNotification(
  db: Queryable,
  input: CreateNotificationInput,
): Promise<void> {
  await db.query(
    `
      INSERT INTO notifications (
        type,
        severity,
        branch_id,
        title,
        description,
        action_route,
        metadata,
        source_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (source_key) DO NOTHING
    `,
    [
      input.type,
      input.severity,
      input.branch_id,
      input.title,
      input.description,
      input.action_route,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.source_key ?? null,
    ],
  );
}

export async function createPaymentReceivedNotification(
  db: Queryable,
  input: {
    paymentId: number;
    studentId: number;
    studentName: string;
    branchId: number;
    branchName: string;
    amount: number;
    receiptNumber: string;
  },
): Promise<void> {
  await createNotification(db, {
    type: 'payment_received',
    severity: 'info',
    branch_id: input.branchId,
    title: `${input.studentName} payment received`,
    description: `${formatCurrency(input.amount)} received for receipt ${input.receiptNumber} at ${input.branchName}.`,
    action_route: '/payments',
    metadata: {
      payment_id: input.paymentId,
      student_id: input.studentId,
      receipt_number: input.receiptNumber,
      amount: input.amount,
    },
    source_key: `payment-received-${input.paymentId}`,
  });
}

export async function createPaymentSubmittedNotification(
  db: Queryable,
  input: {
    paymentId: number;
    studentId: number;
    studentName: string;
    branchId: number;
    branchName: string;
    amount: number;
    receiptNumber: string;
  },
): Promise<void> {
  await createNotification(db, {
    type: 'payment_submitted',
    severity: 'info',
    branch_id: input.branchId,
    title: `${input.studentName} payment submitted`,
    description: `${formatCurrency(input.amount)} was submitted for receipt ${input.receiptNumber} at ${input.branchName} and is awaiting verification.`,
    action_route: '/payments',
    metadata: {
      payment_id: input.paymentId,
      student_id: input.studentId,
      receipt_number: input.receiptNumber,
      amount: input.amount,
      status: 'pending',
    },
    source_key: `payment-submitted-${input.paymentId}`,
  });
}

async function getUnreadCountForUser(user: JWTPayload): Promise<number> {
  const visibleBranchId = getVisibleBranchId(user);
  const params: Array<number> = [user.userId];
  let query = `
    SELECT COUNT(*)::int AS unread_count
    FROM notifications n
    LEFT JOIN notification_reads nr
      ON nr.notification_id = n.id
     AND nr.user_id = $1
    WHERE nr.notification_id IS NULL
  `;

  if (visibleBranchId !== undefined && visibleBranchId !== null) {
    params.push(visibleBranchId);
    query += ` AND n.branch_id = $${params.length}`;
  }

  const result = await pool.query<{ unread_count: number }>(query, params);
  return result.rows[0]?.unread_count ?? 0;
}

export async function getNotificationsForUser(
  user: JWTPayload,
  limit: number = 20,
): Promise<AppNotificationList> {
  const visibleBranchId = getVisibleBranchId(user);
  const params: Array<number> = [user.userId];
  let query = `
    SELECT
      n.id,
      n.type,
      n.severity,
      n.branch_id,
      b.name AS branch_name,
      n.title,
      n.description,
      n.action_route,
      n.metadata,
      (nr.notification_id IS NOT NULL) AS is_read,
      nr.read_at,
      n.created_at
    FROM notifications n
    LEFT JOIN branches b ON b.id = n.branch_id
    LEFT JOIN notification_reads nr
      ON nr.notification_id = n.id
     AND nr.user_id = $1
    WHERE 1 = 1
  `;

  if (visibleBranchId !== undefined && visibleBranchId !== null) {
    params.push(visibleBranchId);
    query += ` AND n.branch_id = $${params.length}`;
  }

  params.push(Math.min(limit, 100));
  query += `
    ORDER BY
      CASE WHEN nr.notification_id IS NULL THEN 0 ELSE 1 END,
      n.created_at DESC,
      n.id DESC
    LIMIT $${params.length}
  `;

  const [notificationsResult, unreadCount] = await Promise.all([
    pool.query<NotificationRow>(query, params),
    getUnreadCountForUser(user),
  ]);

  return {
    unread_count: unreadCount,
    notifications: notificationsResult.rows.map(mapNotificationRow),
  };
}

export async function markNotificationAsRead(
  notificationId: number,
  user: JWTPayload,
): Promise<boolean> {
  const visibleBranchId = getVisibleBranchId(user);
  const params: number[] = [notificationId];
  let query = `
    SELECT id
    FROM notifications
    WHERE id = $1
  `;

  if (visibleBranchId !== undefined && visibleBranchId !== null) {
    params.push(visibleBranchId);
    query += ` AND branch_id = $${params.length}`;
  }

  const notificationResult = await pool.query<{ id: number }>(query, params);

  if (notificationResult.rows.length === 0) {
    return false;
  }

  await pool.query(
    `
      INSERT INTO notification_reads (
        notification_id,
        user_id,
        read_at
      ) VALUES ($1, $2, NOW())
      ON CONFLICT (notification_id, user_id) DO NOTHING
    `,
    [notificationId, user.userId],
  );

  return true;
}

export async function markAllNotificationsAsRead(user: JWTPayload): Promise<number> {
  const visibleBranchId = getVisibleBranchId(user);
  const params: Array<number> = [user.userId];

  // Find all unread notification IDs visible to this user
  let selectQuery = `
    SELECT n.id
    FROM notifications n
    LEFT JOIN notification_reads nr
      ON nr.notification_id = n.id
     AND nr.user_id = $1
    WHERE nr.notification_id IS NULL
  `;

  if (visibleBranchId !== undefined && visibleBranchId !== null) {
    params.push(visibleBranchId);
    selectQuery += ` AND n.branch_id = $${params.length}`;
  }

  const unreadResult = await pool.query<{ id: number }>(selectQuery, params);

  if (unreadResult.rows.length === 0) {
    return 0;
  }

  const unreadIds = unreadResult.rows.map((row) => row.id);

  // Bulk insert reads for all unread notifications
  await pool.query(
    `
      INSERT INTO notification_reads (notification_id, user_id, read_at)
      SELECT unnest($1::int[]), $2, NOW()
      ON CONFLICT (notification_id, user_id) DO NOTHING
    `,
    [unreadIds, user.userId],
  );

  return unreadIds.length;
}
