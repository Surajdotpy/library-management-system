import pool from '../../config/db.ts';
import type { TelegramSummary, PendingPaymentInfo, SeatInfo, AlertInfo } from './telegram-bot.types.ts';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const ADMIN_CHAT_IDS = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
const DAILY_SUMMARY_HOUR = 20;

let bot: any = null;
let dailyTimer: ReturnType<typeof setInterval> | null = null;
const rateLimitMap = new Map<string, number>();

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
    ORDER BY b.name, CAST(s.seat_number AS INTEGER)
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

// ─── Bot ───────────────────────────────────────────

async function respond(chatId: number | string, text: string): Promise<void> {
  if (!bot) {
    console.error('Bot not initialized');
    return;
  }
  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  } catch (error: any) {
    console.error('Telegram sendMessage error:', error?.message ?? error);
    // Fallback: send without formatting
    try {
      await bot.sendMessage(chatId, text);
    } catch (e2: any) {
      console.error('Telegram sendMessage fallback also failed:', e2?.message ?? e2);
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
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DAILY_SUMMARY_HOUR, 0, 0);
  let ms = target.getTime() - now.getTime();
  if (ms < 0) ms += 24 * 60 * 60 * 1000;

  setTimeout(() => {
    sendDailySummary();
    dailyTimer = setInterval(sendDailySummary, 24 * 60 * 60 * 1000);
  }, ms);

  console.log(`Telegram daily summary scheduled at ${DAILY_SUMMARY_HOUR}:00`);
}

async function handleCommand(chatId: number, text: string): Promise<void> {
  const cmd = text.split(' ')[0]?.toLowerCase() ?? '';

  try {
    switch (cmd) {
      case '/start':
        await respond(chatId,
          `Hello! I send library updates here.\n\nCommands:\n/summary — quick overview\n/payments — pending payments\n/overdue — overdue payments\n/seats — seat status\n/alerts — current issues\n/help — all commands`
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

      case '/help':
        await respond(chatId,
          `Commands:\n/summary — daily overview\n/payments — pending payments\n/overdue — overdue payments\n/seats — seat availability\n/alerts — issues needing attention\n/help — this message`
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
    const mod = await import('node-telegram-bot-api');
    const TelegramBot = mod.default ?? mod;
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

    bot.on('message', async (msg: any) => {
      try {
        const chatId = msg.chat?.id;
        const text = msg.text ?? '';
        if (!chatId || !text.startsWith('/')) return;
        if (!isAuthorized(chatId)) {
          await respond(chatId, 'Unauthorized');
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

    bot.on('polling_error', (error: any) => {
      const msg = error?.message ?? String(error);
      if (msg.includes('404')) {
        console.error('TELEGRAM_BOT_TOKEN is invalid — bot disabled');
        stopTelegramBot();
      } else if (!msg.includes('ECONNRESET') && !msg.includes('ETIMEDOUT')) {
        console.error('Telegram polling error:', msg);
      }
    });

    // Set command menu so users see available commands
    try {
      await bot.setMyCommands([
        { command: 'summary', description: 'Daily overview' },
        { command: 'payments', description: 'Pending payments' },
        { command: 'overdue', description: 'Overdue payments' },
        { command: 'seats', description: 'Seat availability' },
        { command: 'alerts', description: 'Issues needing attention' },
        { command: 'help', description: 'Show all commands' },
      ]);
    } catch {}

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
      bot.stopPolling();
    } catch {}
    bot = null;
    console.log('Telegram bot stopped');
  }
}
