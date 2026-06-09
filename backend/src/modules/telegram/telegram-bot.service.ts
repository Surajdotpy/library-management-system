import { Telegraf, type Context } from 'telegraf';
import pool from '../../config/db.ts';
import { sendReceiptEmail } from '../email/email.service.ts';
import { calculateCoverageWindow, formatDateOnly, parseDateOnly } from '../payments/payments.service.ts';
import type { TelegramSummary, PendingPaymentInfo, SeatInfo, AlertInfo, BranchInfo, TodayInfo, StudentSearchResult, RevenueInfo, NotificationItem, BookingInfo, DefaulterInfo } from './telegram-bot.types.ts';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const ADMIN_CHAT_IDS = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
const DAILY_SUMMARY_HOUR = 14;
const DAILY_SUMMARY_MINUTE = 30;

let bot: any = null;
let dailyTimer: ReturnType<typeof setInterval> | null = null;
const rateLimitMap = new Map<string, number>();
const pendingPaymentMessages = new Map<number, Array<{ chatId: number; messageId: number }>>();

function isAuthorized(chatId: number | string): boolean {
  if (ADMIN_CHAT_IDS.length === 0) {
    return false;
  }
  return ADMIN_CHAT_IDS.includes(String(chatId));
}

function checkRateLimit(chatId: string): boolean {
  const now = Date.now();
  const last = rateLimitMap.get(chatId) ?? 0;
  if (now - last < 3000) {
    return false;
  }
  rateLimitMap.set(chatId, now);
  return true;
}

// ─── Database Queries ───────────────────────────────────────────

async function getSummary(): Promise<TelegramSummary> {
  const [studentResult, paymentResult, seatResult, attendanceResult] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active
      FROM students
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'paid' AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE))::int AS paid_this_month,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COALESCE(SUM(CASE WHEN status = 'paid' AND DATE(payment_date) = CURRENT_DATE THEN amount END), 0) AS today_revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN amount END), 0) AS monthly_revenue
      FROM fee_payments
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE assigned_to_student_id IS NOT NULL)::int AS occupied,
        COUNT(*) FILTER (WHERE assigned_to_student_id IS NULL AND status = 'active')::int AS available,
        COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance
      FROM seats
    `),
    pool.query(`
      SELECT COUNT(*)::int AS today_count
      FROM attendance
      WHERE attendance_date = CURRENT_DATE AND entry_time IS NOT NULL
    `),
  ]);

  return {
    total_students: studentResult.rows[0]?.total ?? 0,
    active_students: studentResult.rows[0]?.active ?? 0,
    paid_this_month: paymentResult.rows[0]?.paid_this_month ?? 0,
    pending_payments: paymentResult.rows[0]?.pending_count ?? 0,
    overdue_count: 0,
    overdue_amount: 0,
    today_revenue: Number(paymentResult.rows[0]?.today_revenue ?? 0),
    monthly_revenue: Number(paymentResult.rows[0]?.monthly_revenue ?? 0),
    seats_total: seatResult.rows[0]?.total ?? 0,
    seats_occupied: seatResult.rows[0]?.occupied ?? 0,
    seats_available: seatResult.rows[0]?.available ?? 0,
    seats_maintenance: seatResult.rows[0]?.maintenance ?? 0,
    today_attendance: attendanceResult.rows[0]?.today_count ?? 0,
    alerts_count: paymentResult.rows[0]?.pending_count ?? 0,
  };
}

async function getPendingPayments(): Promise<PendingPaymentInfo[]> {
  const result = await pool.query(`
    SELECT
      s.name AS student_name,
      s.student_id AS student_code,
      p.amount,
      TO_CHAR(p.payment_date, 'DD Mon YYYY') AS due_date,
      b.name AS branch_name
    FROM fee_payments p
    JOIN students s ON s.id = p.student_id
    JOIN branches b ON b.id = s.branch_id
    WHERE p.status = 'pending'
      AND s.is_active = true
    ORDER BY p.payment_date DESC
    LIMIT 15
  `);
  return result.rows;
}

async function getSeatSummary(): Promise<SeatInfo[]> {
  const result = await pool.query(`
    SELECT
      s.seat_number,
      s.floor_name,
      s.status,
      st.name AS student_name,
      b.name AS branch_name
    FROM seats s
    JOIN branches b ON b.id = s.branch_id
    LEFT JOIN students st ON st.id = s.assigned_to_student_id
    ORDER BY b.name, LENGTH(s.seat_number), s.seat_number
    LIMIT 30
  `);
  return result.rows;
}

async function getOverduePayments(): Promise<PendingPaymentInfo[]> {
  const result = await pool.query(`
    SELECT
      s.name AS student_name,
      s.student_id AS student_code,
      p.amount,
      TO_CHAR(p.payment_date, 'DD Mon YYYY') AS due_date,
      b.name AS branch_name
    FROM fee_payments p
    JOIN students s ON s.id = p.student_id
    JOIN branches b ON b.id = s.branch_id
    WHERE p.status = 'pending'
      AND s.is_active = true
      AND p.payment_date < CURRENT_DATE
    ORDER BY p.payment_date ASC
    LIMIT 15
  `);
  return result.rows;
}

async function getBranchSummary(): Promise<BranchInfo[]> {
  const result = await pool.query(`
    SELECT
      b.name AS branch_name,
      COUNT(DISTINCT s.id) FILTER (WHERE s.is_active = true)::int AS active_students,
      COUNT(DISTINCT st.id)::int AS total_seats,
      COUNT(DISTINCT st.id) FILTER (WHERE st.assigned_to_student_id IS NOT NULL)::int AS occupied_seats,
      COALESCE(SUM(fp.amount) FILTER (WHERE fp.status = 'paid' AND EXTRACT(MONTH FROM fp.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fp.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0) AS monthly_revenue
    FROM branches b
    LEFT JOIN students s ON s.branch_id = b.id
    LEFT JOIN seats st ON st.branch_id = b.id
    LEFT JOIN fee_payments fp ON fp.student_id = s.id
    GROUP BY b.id, b.name
    ORDER BY b.name
  `);
  return result.rows;
}

async function getTodayInfo(): Promise<TodayInfo> {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM attendance WHERE attendance_date = CURRENT_DATE AND entry_time IS NOT NULL)::int AS attendance_count,
      (SELECT COUNT(*) FROM students WHERE registration_date = CURRENT_DATE)::int AS new_students,
      (SELECT COALESCE(SUM(amount), 0) FROM fee_payments WHERE status = 'paid' AND DATE(payment_date) = CURRENT_DATE) AS revenue_collected,
      (SELECT COUNT(*) FROM fee_payments WHERE status = 'pending' AND DATE(payment_date) = CURRENT_DATE)::int AS pending_payments
  `);
  return {
    attendance_count: result.rows[0]?.attendance_count ?? 0,
    new_students: result.rows[0]?.new_students ?? 0,
    revenue_collected: Number(result.rows[0]?.revenue_collected ?? 0),
    pending_payments: result.rows[0]?.pending_payments ?? 0,
  };
}

async function findStudent(query: string): Promise<StudentSearchResult[]> {
  const result = await pool.query(`
    SELECT
      s.name,
      s.student_id,
      s.is_active,
      s.study_plan,
      s.monthly_fee,
      TO_CHAR(s.registration_date, 'DD Mon YYYY') AS registration_date,
      b.name AS branch_name,
      st.seat_number,
      st.floor_name
    FROM students s
    JOIN branches b ON b.id = s.branch_id
    LEFT JOIN seats st ON st.assigned_to_student_id = s.id
    WHERE s.name ILIKE $1 OR s.student_id ILIKE $1
    ORDER BY s.name
    LIMIT 10
  `, [`%${query}%`]);
  return result.rows;
}

async function getRevenue(): Promise<RevenueInfo> {
  const result = await pool.query(`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE DATE(payment_date) = CURRENT_DATE), 0) AS today,
      COALESCE(SUM(amount) FILTER (WHERE payment_date >= DATE_TRUNC('week', CURRENT_DATE)), 0) AS this_week,
      COALESCE(SUM(amount) FILTER (WHERE EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0) AS this_month,
      COALESCE(SUM(amount) FILTER (WHERE EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0) AS this_year
    FROM fee_payments
    WHERE status = 'paid'
  `);
  return {
    today: Number(result.rows[0]?.today ?? 0),
    this_week: Number(result.rows[0]?.this_week ?? 0),
    this_month: Number(result.rows[0]?.this_month ?? 0),
    this_year: Number(result.rows[0]?.this_year ?? 0),
  };
}

async function getNotifications(): Promise<NotificationItem[]> {
  const result = await pool.query(`
    SELECT
      n.type,
      n.severity,
      n.title,
      n.description,
      b.name AS branch_name,
      TO_CHAR(n.created_at, 'DD Mon HH24:MI') AS created_at
    FROM notifications n
    LEFT JOIN branches b ON b.id = n.branch_id
    ORDER BY n.created_at DESC
    LIMIT 10
  `);
  return result.rows;
}

async function getActiveBookings(): Promise<BookingInfo[]> {
  const result = await pool.query(`
    SELECT
      s.name AS student_name,
      s.student_id,
      se.seat_number,
      b.name AS branch_name,
      sb.status,
      TO_CHAR(sb.start_date, 'DD Mon YYYY') AS start_date,
      TO_CHAR(sb.end_date, 'DD Mon YYYY') AS end_date
    FROM seat_bookings sb
    JOIN students s ON s.id = sb.student_id
    JOIN seats se ON se.id = sb.seat_id
    JOIN branches b ON b.id = sb.branch_id
    WHERE sb.status = 'active'
    ORDER BY sb.end_date ASC
    LIMIT 15
  `);
  return result.rows;
}

async function getDefaulters(): Promise<DefaulterInfo[]> {
  const result = await pool.query(`
    SELECT
      s.name,
      s.student_id,
      b.name AS branch_name,
      COUNT(fp.id)::int AS overdue_count,
      SUM(fp.amount) AS total_due
    FROM fee_payments fp
    JOIN students s ON s.id = fp.student_id
    JOIN branches b ON b.id = s.branch_id
    WHERE fp.status = 'pending' AND fp.payment_date < CURRENT_DATE
    GROUP BY s.id, s.name, s.student_id, b.name
    ORDER BY total_due DESC
    LIMIT 10
  `);
  return result.rows;
}

// ─── Message Formatters ───────────────────────────────────────────

function bold(text: string): string {
  return `<b>${text}</b>`;
}

function fmtSummary(summary: TelegramSummary): string {
  const lines = [
    bold('Daily Summary'),
    '',
    `Students: ${summary.total_students} total, ${summary.active_students} active`,
    `Today: ${summary.today_attendance} attended`,
    `Revenue today: Rs ${summary.today_revenue.toLocaleString('en-IN')}`,
    `Revenue this month: Rs ${summary.monthly_revenue.toLocaleString('en-IN')} (${summary.paid_this_month} paid)`,
    `Pending payments: ${summary.pending_payments}`,
    '',
    `Seats: ${summary.seats_available} free, ${summary.seats_occupied} occupied, ${summary.seats_maintenance} maintenance`,
    '',
    summary.alerts_count > 0 ? `${summary.alerts_count} alerts — /alerts to view` : 'No alerts',
  ];
  return lines.join('\n');
}

function fmtPayments(payments: PendingPaymentInfo[]): string {
  if (payments.length === 0) {
    return 'No pending payments';
  }

  const parts = [bold(`Pending Payments (${payments.length})`)];
  for (const p of payments) {
    parts.push(`\n${p.student_name} (${p.student_code})`);
    parts.push(`Amount: Rs ${p.amount} | ${p.branch_name}`);
  }
  return parts.join('\n');
}

function fmtSeats(rows: SeatInfo[]): string {
  const byBranch: Record<string, { available: string[]; occupied: string[]; maintenance: string[] }> = {};

  for (const s of rows) {
    if (!byBranch[s.branch_name]) {
      byBranch[s.branch_name] = { available: [], occupied: [], maintenance: [] };
    }
    const label = `#${s.seat_number}`;
    if (s.status === 'maintenance') {
      byBranch[s.branch_name]!.maintenance.push(label);
    } else if (s.student_name) {
      byBranch[s.branch_name]!.occupied.push(label);
    } else {
      byBranch[s.branch_name]!.available.push(label);
    }
  }

  const parts: string[] = [bold('Seat Overview')];
  for (const [branch, data] of Object.entries(byBranch)) {
    parts.push(`\n${bold(branch)}`);
    parts.push(`Available: ${data.available.length} seats`);
    if (data.available.length > 0) parts.push(data.available.join(', '));
    parts.push(`Occupied: ${data.occupied.length} seats`);
    parts.push(`Maintenance: ${data.maintenance.length} seats`);
  }
  return parts.join('\n');
}

function fmtAlerts(overdue: PendingPaymentInfo[]): string {
  if (overdue.length === 0) {
    return 'No alerts';
  }

  const parts = [bold(`Alerts - ${overdue.length} overdue payments`)];
  for (const p of overdue) {
    parts.push(`\n${p.student_name} — Rs ${p.amount}`);
    parts.push(`Due: ${p.due_date} | ${p.branch_name}`);
  }
  return parts.join('\n');
}

function fmtBranches(rows: BranchInfo[]): string {
  if (rows.length === 0) return 'No branches found';
  const parts = [bold('Branch Overview')];
  for (const b of rows) {
    parts.push(`\n${bold(b.branch_name)}`);
    parts.push(`Students: ${b.active_students} active`);
    parts.push(`Seats: ${b.occupied_seats}/${b.total_seats} occupied`);
    parts.push(`Revenue: Rs ${b.monthly_revenue.toLocaleString('en-IN')}`);
  }
  return parts.join('\n');
}

function fmtToday(info: TodayInfo): string {
  const lines = [
    bold("Today's Activity"),
    '',
    `Attendance: ${info.attendance_count} students`,
    `New registrations: ${info.new_students}`,
    `Revenue collected: Rs ${info.revenue_collected.toLocaleString('en-IN')}`,
    `Pending payments logged: ${info.pending_payments}`,
  ];
  return lines.join('\n');
}

function fmtStudent(rows: StudentSearchResult[]): string {
  if (rows.length === 0) return 'No students found';
  const parts = [bold(`Students (${rows.length})`)];
  for (const s of rows) {
    parts.push(`\n${s.name} (${s.student_id})`);
    parts.push(`Branch: ${s.branch_name} | ${s.is_active ? 'Active' : 'Inactive'}`);
    parts.push(`Plan: ${s.study_plan ?? 'N/A'} | Fee: Rs ${s.monthly_fee}`);
    parts.push(`Seat: ${s.seat_number ?? 'Not assigned'}${s.floor_name ? ` (${s.floor_name})` : ''}`);
    parts.push(`Joined: ${s.registration_date}`);
  }
  return parts.join('\n');
}

function fmtRevenue(r: RevenueInfo): string {
  const lines = [
    bold('Revenue Report'),
    '',
    `Today: Rs ${r.today.toLocaleString('en-IN')}`,
    `This week: Rs ${r.this_week.toLocaleString('en-IN')}`,
    `This month: Rs ${r.this_month.toLocaleString('en-IN')}`,
    `This year: Rs ${r.this_year.toLocaleString('en-IN')}`,
  ];
  return lines.join('\n');
}

function fmtNotifications(rows: NotificationItem[]): string {
  if (rows.length === 0) return 'No notifications';
  const parts = [bold('Recent Notifications')];
  for (const n of rows) {
    const icon = n.severity === 'critical' ? '[CRIT]' : n.severity === 'warning' ? '[WARN]' : '[INFO]';
    parts.push(`\n${icon} ${bold(n.title)}`);
    parts.push(`${n.description}`);
    parts.push(`${n.branch_name ?? 'All'} \u00B7 ${n.created_at}`);
  }
  return parts.join('\n');
}

function fmtBookings(rows: BookingInfo[]): string {
  if (rows.length === 0) return 'No active seat bookings';
  const parts = [bold(`Active Bookings (${rows.length})`)];
  for (const b of rows) {
    parts.push(`\n${b.student_name} (${b.student_id})`);
    parts.push(`Seat: #${b.seat_number} | ${b.branch_name}`);
    parts.push(`${b.start_date} \u2192 ${b.end_date}`);
  }
  return parts.join('\n');
}

function fmtDefaulters(rows: DefaulterInfo[]): string {
  if (rows.length === 0) return 'No defaulters';
  const parts = [bold(`Top Defaulters (${rows.length})`)];
  for (const d of rows) {
    parts.push(`\n${d.name} (${d.student_id})`);
    parts.push(`Due: Rs ${Number(d.total_due).toLocaleString('en-IN')} (${d.overdue_count} payments)`);
    parts.push(`${d.branch_name}`);
  }
  return parts.join('\n');
}

function getMainKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Summary', callback_data: 'summary' },
          { text: 'Payments', callback_data: 'payments' },
          { text: 'Seats', callback_data: 'seats' },
        ],
        [
          { text: 'Alerts', callback_data: 'alerts' },
          { text: 'Revenue', callback_data: 'revenue' },
          { text: 'Branches', callback_data: 'branches' },
        ],
        [
          { text: 'Today', callback_data: 'today' },
          { text: 'Help', callback_data: 'help' },
        ],
      ],
    },
  };
}

// ─── Payment Helpers ─────────────────────────────────

async function processPaymentConfirm(
  paymentId: number,
  isConfirm: boolean,
  chatId: number | string,
): Promise<{ processed: boolean; status?: string }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const check = await client.query(`SELECT id, status, student_id FROM fee_payments WHERE id = $1`, [paymentId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      await respond(chatId, `Payment #${paymentId} not found`);
      return { processed: false };
    }
    const currentStatus = check.rows[0].status;
    if (currentStatus !== 'pending') {
      await client.query('ROLLBACK');
      await respond(chatId, `Payment #${paymentId} is already ${currentStatus}`);
      return { processed: false, status: currentStatus };
    }

    if (isConfirm) {
      const coverageResult = await client.query(
        `SELECT coverage_end_date::text FROM fee_payments WHERE student_id = $1 AND status = 'paid' AND id != $2 ORDER BY coverage_end_date DESC LIMIT 1 FOR UPDATE`,
        [check.rows[0].student_id, paymentId],
      );
      const today = new Date();
      const latestEnd = coverageResult.rows[0]?.coverage_end_date ? parseDateOnly(coverageResult.rows[0].coverage_end_date) : null;
      const { coverageStartDate, coverageEndDate } = calculateCoverageWindow(today, latestEnd);

      const updateResult = await client.query(
        `UPDATE fee_payments SET status = 'paid', coverage_start_date = $2, coverage_end_date = $3, payment_date = $4, verification_source = 'superadmin_review', verified_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'pending'`,
        [paymentId, formatDateOnly(coverageStartDate), formatDateOnly(coverageEndDate), formatDateOnly(today)],
      );

      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        await respond(chatId, `Payment #${paymentId} was already processed by another admin`);
        return { processed: false };
      }

      const payInfo = await client.query(`
        SELECT fp.amount, fp.receipt_number, TO_CHAR(fp.payment_date, 'DD Mon YYYY') AS payment_date,
               s.name AS student_name, s.phone, s.email, b.name AS branch_name,
               fp.student_id, s.branch_id
        FROM fee_payments fp
        JOIN students s ON s.id = fp.student_id
        JOIN branches b ON b.id = s.branch_id
        WHERE fp.id = $1
      `, [paymentId]);

      if (payInfo.rows[0]) {
        const p = payInfo.rows[0];
        const receiptMsg = [
          `Receipt: ${p.receipt_number ?? 'N/A'}`,
          `Student: ${p.student_name}`,
          `Amount: Rs ${Number(p.amount).toLocaleString('en-IN')}`,
          `Date: ${p.payment_date}`,
          `Branch: ${p.branch_name}`,
          `Status: Verified by admin`,
        ].join('\n');

        await client.query(`
          INSERT INTO payment_communications (student_id, payment_id, branch_id, communication_type, channel, delivery_status, delivery_mode, recipient_phone, message_body, sent_at)
          SELECT fp.student_id, fp.id, s.branch_id, 'payment_receipt', 'sms', 'logged', 'log_only', $2, $3, CURRENT_TIMESTAMP
          FROM fee_payments fp
          JOIN students s ON s.id = fp.student_id
          WHERE fp.id = $1
        `, [paymentId, p.phone, receiptMsg]);

        await client.query(`
          INSERT INTO notifications (type, severity, branch_id, title, description, action_route, metadata, source_key)
          VALUES ('payment_received', 'info', $2, $3, $4, '/payments', $5, $6)
        `, [
          paymentId,
          p.branch_id,
          `${p.student_name} payment confirmed (Telegram)`,
          `Rs ${Number(p.amount).toLocaleString('en-IN')} confirmed for ${p.student_name} at ${p.branch_name}.`,
          JSON.stringify({ payment_id: paymentId, student_id: p.student_id, receipt_number: p.receipt_number, amount: Number(p.amount) }),
          `payment-confirmed-${paymentId}`,
        ]);

        let emailNote = '';
        if (p.email) {
          const emailResult = await sendReceiptEmail(
            p.email,
            p.student_name,
            p.receipt_number ?? `RCP-${String(paymentId).padStart(6, '0')}`,
            Number(p.amount),
            p.payment_date,
            p.branch_name,
          );
          if (!emailResult.sent) {
            emailNote = ` (email: ${emailResult.error})`;
          }
        }

        await client.query('COMMIT');

        pendingPaymentMessages.delete(paymentId);

        const ioServer = (globalThis as any).io;
        if (ioServer && typeof ioServer.to === 'function') {
          ioServer.to('role:superadmin').emit('payment_activity', {
            paymentId,
            studentId: p.student_id,
            branchId: p.branch_id,
            status: 'paid',
          });
        }

        await respond(chatId, `Payment #${paymentId} confirmed and receipt logged${emailNote}`);
        return { processed: true };
      }

      await client.query('COMMIT');
      pendingPaymentMessages.delete(paymentId);
      await respond(chatId, `Payment #${paymentId} confirmed`);
      return { processed: true };
    }

    const updateResult = await client.query(
      `UPDATE fee_payments SET status = 'rejected', verification_source = 'superadmin_review', verified_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'pending'`,
      [paymentId],
    );

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      await respond(chatId, `Payment #${paymentId} was already processed by another admin`);
      return { processed: false };
    }

    const rejectInfo = await client.query(`
      SELECT fp.amount, s.name AS student_name, s.branch_id, fp.student_id
      FROM fee_payments fp
      JOIN students s ON s.id = fp.student_id
      WHERE fp.id = $1
    `, [paymentId]);

    const rj = rejectInfo.rows[0];
    if (rj) {
      await client.query(`
        INSERT INTO notifications (type, severity, branch_id, title, description, action_route, metadata, source_key)
        VALUES ('payment_rejected', 'warning', $2, $3, $4, '/payments', $5, $6)
      `, [
        paymentId,
        rj.branch_id,
        `${rj.student_name} payment rejected (Telegram)`,
        `Rs ${Number(rj.amount).toLocaleString('en-IN')} payment for ${rj.student_name} was rejected.`,
        JSON.stringify({ payment_id: paymentId, student_id: rj.student_id, amount: Number(rj.amount) }),
        `payment-rejected-${paymentId}`,
      ]);
    }

    await client.query('COMMIT');

    pendingPaymentMessages.delete(paymentId);

    const r = rejectInfo.rows[0];
    if (r) {
      const ioServer = (globalThis as any).io;
      if (ioServer && typeof ioServer.to === 'function') {
        ioServer.to('role:superadmin').emit('payment_activity', {
          paymentId,
          studentId: r.student_id,
          branchId: r.branch_id,
          status: 'rejected',
        });
      }
    }

    await respond(chatId, `Payment #${paymentId} rejected`);
    return { processed: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('processPaymentConfirm error:', error?.message ?? error);
    await respond(chatId, `Failed to process payment #${paymentId}: ${error?.message ?? 'unknown error'}`);
    return { processed: false };
  } finally {
    client.release();
  }
}

// ─── Bot ───────────────────────────────────────────

async function respond(chatId: number | string, text: string, extra: Record<string, any> = {}): Promise<any> {
  if (!bot) {
    console.error('Bot not initialized');
    return null;
  }
  try {
    return await bot.telegram.sendMessage(Number(chatId), text, { parse_mode: 'HTML', ...extra });
  } catch (error: any) {
    console.error('Telegram sendMessage error:', error?.message ?? error);
    try {
      return await bot.telegram.sendMessage(Number(chatId), text, extra);
    } catch (e2: any) {
      console.error('Telegram sendMessage fallback also failed:', e2?.message ?? e2);
      return null;
    }
  }
}

async function sendDailySummary(): Promise<void> {
  if (ADMIN_CHAT_IDS.length === 0) return;
  try {
    const summary = await getSummary();
    const message = fmtSummary(summary);
    for (const chatId of ADMIN_CHAT_IDS) {
      await respond(chatId, message);
    }
  } catch (error: any) {
    console.error('Daily summary failed:', error?.message ?? error);
  }
}

function setupDailyCron(): void {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DAILY_SUMMARY_HOUR, DAILY_SUMMARY_MINUTE, 0);
  let ms = target.getTime() - now.getTime();
  if (ms < 0) ms += 24 * 60 * 60 * 1000;

  setTimeout(() => {
    sendDailySummary();
    dailyTimer = setInterval(sendDailySummary, 24 * 60 * 60 * 1000);
  }, ms);

  console.log(`Telegram daily summary scheduled at ${DAILY_SUMMARY_HOUR}:${String(DAILY_SUMMARY_MINUTE).padStart(2, '0')} UTC (8:${String(DAILY_SUMMARY_MINUTE).padStart(2, '0')} PM IST)`);
}

async function handleCommand(chatId: number, text: string): Promise<void> {
  const cmd = text.split(' ')[0]?.toLowerCase() ?? '';

  try {
    const args = text.split(' ').slice(1).join(' ');

    switch (cmd) {
      case '/start':
        await respond(chatId,
          `Hello! I send library updates here.\n\nCommands:\n/summary — quick overview\n/payments — pending payments\n/overdue — overdue payments\n/seats — seat status\n/alerts — current issues\n/branches — branch-wise snapshot\n/today — today\'s activity\n/revenue — revenue breakdown\n/bookings — active seat bookings\n/defaulters — top defaulters\n/find <name> — search student\n/confirm <id> — confirm pending payment\n/notifications — recent notifications\n/help — all commands`,
          getMainKeyboard()
        );
        break;

      case '/summary': {
        const summary = await getSummary();
        await respond(chatId, fmtSummary(summary));
        break;
      }

      case '/payments': {
        const payments = await getPendingPayments();
        await respond(chatId, fmtPayments(payments));
        break;
      }

      case '/overdue': {
        const overdue = await getOverduePayments();
        await respond(chatId, fmtPayments(overdue));
        break;
      }

      case '/seats': {
        const seats = await getSeatSummary();
        await respond(chatId, fmtSeats(seats));
        break;
      }

      case '/alerts': {
        const overdue = await getOverduePayments();
        await respond(chatId, fmtAlerts(overdue));
        break;
      }

      case '/branches': {
        const branches = await getBranchSummary();
        await respond(chatId, fmtBranches(branches));
        break;
      }

      case '/today': {
        const info = await getTodayInfo();
        await respond(chatId, fmtToday(info));
        break;
      }

      case '/revenue': {
        const revenue = await getRevenue();
        await respond(chatId, fmtRevenue(revenue));
        break;
      }

      case '/bookings': {
        const bookings = await getActiveBookings();
        await respond(chatId, fmtBookings(bookings));
        break;
      }

      case '/defaulters': {
        const defaulters = await getDefaulters();
        await respond(chatId, fmtDefaulters(defaulters));
        break;
      }

      case '/notifications': {
        const notifications = await getNotifications();
        await respond(chatId, fmtNotifications(notifications));
        break;
      }

      case '/find': {
        if (!args) {
          await respond(chatId, 'Usage: /find <student name or ID>');
          break;
        }
        const students = await findStudent(args);
        await respond(chatId, fmtStudent(students));
        break;
      }

      case '/confirm': {
        if (!args || isNaN(Number(args))) {
          await respond(chatId, 'Usage: /confirm <paymentId>');
          break;
        }
        await processPaymentConfirm(Number(args), true, chatId);
        break;
      }

      case '/help':
        await respond(chatId,
          `Commands:\n/summary — daily overview\n/payments — pending payments\n/overdue — overdue payments\n/seats — seat availability\n/alerts — issues needing attention\n/branches — branch-wise snapshot\n/today — today\'s activity\n/revenue — revenue breakdown\n/bookings — active seat bookings\n/defaulters — top defaulters\n/find <name> — search student\n/confirm <id> — confirm pending payment\n/notifications — recent notifications\n/help — this message`,
          getMainKeyboard()
        );
        break;

      default:
        await respond(chatId, `Unknown command. Try /help`);
    }
  } catch (error: any) {
    console.error(`Command ${cmd} failed:`, error?.message ?? error);
    await respond(chatId, `Command failed: ${error?.message ?? 'unknown error'}`);
  }
}

export async function startTelegramBot(): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('Telegram bot disabled — TELEGRAM_BOT_TOKEN not set');
    return;
  }

  if (ADMIN_CHAT_IDS.length === 0) {
    console.log('Telegram bot not started — TELEGRAM_ADMIN_CHAT_IDS is empty');
    return;
  }

  try {
    bot = new Telegraf(TELEGRAM_BOT_TOKEN);

    bot.catch((err: any) => {
      const msg = err?.message ?? String(err);
      if (msg.includes('404')) {
        console.error('TELEGRAM_BOT_TOKEN is invalid — bot disabled');
        stopTelegramBot();
      } else if (!msg.includes('ECONNRESET') && !msg.includes('ETIMEDOUT') && !msg.includes('socket hang up')) {
        console.error('Telegraf error:', msg);
      }
    });

    bot.on('text', async (ctx: Context) => {
      try {
        const chatId = ctx.chat?.id;
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text;
        if (!chatId || !text.startsWith('/')) return;
        if (!isAuthorized(chatId)) {
          await ctx.reply('Unauthorized');
          return;
        }
        if (!checkRateLimit(String(chatId))) {
          return;
        }
        await handleCommand(chatId, text);
      } catch (error: any) {
        console.error('Message handler error:', error?.message ?? error);
      }
    });

    bot.on('callback_query', async (ctx: Context) => {
      try {
        const chatId = ctx.chat?.id;
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
        const data = ctx.callbackQuery.data;
        if (!chatId || !data) return;
        if (!isAuthorized(chatId)) return;
        await ctx.answerCbQuery();

        if (data.startsWith('confirm_payment_') || data.startsWith('reject_payment_')) {
          const parts = data.split('_');
          const paymentId = Number(parts[parts.length - 1]);
          const isConfirm = data.startsWith('confirm_payment_');
          const result = await processPaymentConfirm(paymentId, isConfirm, chatId);
          if (result.processed) {
            try {
              await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
            } catch {}
          }
          return;
        }

        await handleCommand(chatId, `/${data}`);
      } catch (error: any) {
        console.error('Callback query error:', error?.message ?? error);
      }
    });

    // Set command menu
    try {
      await bot.telegram.setMyCommands([
        { command: 'summary', description: 'Daily overview' },
        { command: 'payments', description: 'Pending payments' },
        { command: 'overdue', description: 'Overdue payments' },
        { command: 'seats', description: 'Seat availability' },
        { command: 'alerts', description: 'Issues needing attention' },
        { command: 'branches', description: 'Branch-wise snapshot' },
        { command: 'today', description: "Today's activity" },
        { command: 'revenue', description: 'Revenue breakdown' },
        { command: 'bookings', description: 'Active seat bookings' },
        { command: 'defaulters', description: 'Top defaulters' },
        { command: 'find', description: 'Search student by name' },
        { command: 'notifications', description: 'Recent notifications' },
        { command: 'confirm', description: 'Confirm <paymentId>' },
        { command: 'help', description: 'Show all commands' },
      ]);
    } catch {}

    bot.launch().catch((err: any) => {
      const msg = err?.message ?? String(err);
      console.error('Telegram bot launch error:', msg);
      if (msg.includes('409: conflict')) {
        console.log('↳ Another bot instance is already running — continuing without Telegram');
        bot = null;
      }
    });
    console.log('Telegram bot started');
    setupDailyCron();
  } catch (error: any) {
    console.error('Telegram bot failed to start:', error?.message ?? error);
  }
}

export function stopTelegramBot(): void {
  if (dailyTimer) {
    clearInterval(dailyTimer);
    dailyTimer = null;
  }
  if (bot) {
    try {
      bot.stop();
    } catch {}
    bot = null;
    console.log('Telegram bot stopped');
  }
}

export async function pushPaymentAlert(payment: {
  id: number;
  student_name: string;
  amount: number;
  branch_name: string;
  payment_method: string;
}): Promise<void> {
  if (ADMIN_CHAT_IDS.length === 0 || !bot) return;

  const text = [
    bold('New Payment Received'),
    '',
    `Student: ${payment.student_name}`,
    `Amount: Rs ${payment.amount.toLocaleString('en-IN')}`,
    `Method: ${payment.payment_method}`,
    `Branch: ${payment.branch_name}`,
    '',
    `Tap Confirm to verify or Reject to undo.`,
  ].join('\n');

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Confirm', callback_data: `confirm_payment_${payment.id}` },
          { text: 'Reject', callback_data: `reject_payment_${payment.id}` },
        ],
      ],
    },
  };

  const messages: Array<{ chatId: number; messageId: number }> = [];
  for (const chatId of ADMIN_CHAT_IDS) {
    const sent = await respond(chatId, text, keyboard);
    if (sent && sent.message_id) {
      messages.push({ chatId: Number(chatId), messageId: sent.message_id });
    }
  }
  if (messages.length > 0) {
    pendingPaymentMessages.set(payment.id, messages);
  }
}

export async function resolvePaymentAlert(paymentId: number, resolvedBy: string, action: 'confirmed' | 'rejected'): Promise<void> {
  const messages = pendingPaymentMessages.get(paymentId);
  if (!messages || messages.length === 0 || !bot) return;

  const actionText = action === 'confirmed' ? 'Confirmed' : 'Rejected';
  for (const { chatId, messageId } of messages) {
    try {
      await bot.telegram.editMessageReplyMarkup(chatId, messageId, undefined, { inline_keyboard: [] });
      await bot.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        { parse_mode: 'HTML', text: `${bold('Payment #' + paymentId)} — ${actionText} by ${resolvedBy}` },
      );
    } catch { }
  }
  pendingPaymentMessages.delete(paymentId);
}
