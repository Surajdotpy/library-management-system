import pool from '../../config/db.ts';
import * as notificationsService from '../notifications/notifications.service.ts';
import type {
  Payment,
  PaymentAlertSummary,
  PaymentCommunication,
  PaymentCommunicationQueryOptions,
  PaymentCommunicationRequestChannel,
  PaymentReminderBatchResult,
  PaymentReminderStage,
  PaymentWithStudent,
  PendingPayment,
  RecordPaymentDTO,
  MonthlyRevenue,
  ReceiptData,
} from './payments.types.ts';
import {
  buildReceiptMessage,
  buildReminderMessage,
  dispatchPaymentCommunication,
  resolveRequestedChannels,
} from './payments.communication.ts';

const PAYMENT_CYCLE_DAYS = 30;
const PAYMENT_CYCLE_END_OFFSET = PAYMENT_CYCLE_DAYS - 1;
const DUE_SOON_WINDOW_DAYS = 7;

interface StudentPaymentSnapshot {
  student_id: number;
  student_name: string;
  student_code: string;
  student_email: string | null;
  student_phone: string;
  branch_id: number;
  branch_name: string;
  monthly_fee: string | number;
  registration_date: string;
  last_payment_date: string | null;
  paid_through_date: string | null;
  last_paid_fee_month: number | null;
  last_paid_fee_year: number | null;
}

interface StudentPaymentRecord {
  id: number;
  name: string;
  student_code: string;
  email: string | null;
  phone: string;
  branch_id: number;
  branch_name: string;
  monthly_fee: string | number;
}

interface LatestReminderSnapshot {
  student_id: number;
  sent_at: Date;
  channel: 'sms' | 'whatsapp';
  reminder_stage: PaymentReminderStage;
}

interface PaymentCommunicationRow extends PaymentCommunication {
  receipt_snapshot: ReceiptData | null;
}

function parseDateOnly(value: string): Date {
  const [yearPart = '1970', monthPart = '1', dayPart = '1'] = value.split('-');
  const year = Number.parseInt(yearPart, 10);
  const month = Number.parseInt(monthPart, 10);
  const day = Number.parseInt(dayPart, 10);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  const nextValue = new Date(value);
  nextValue.setUTCDate(nextValue.getUTCDate() + days);
  return nextValue;
}

function diffDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

async function getLatestReminderMap(
  studentIds: number[],
): Promise<Map<number, LatestReminderSnapshot>> {
  if (studentIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<LatestReminderSnapshot>(
    `
      SELECT DISTINCT ON (student_id)
        student_id,
        sent_at,
        channel,
        reminder_stage
      FROM payment_communications
      WHERE communication_type = 'fee_reminder'
        AND reminder_stage IS NOT NULL
        AND student_id = ANY($1)
      ORDER BY student_id, sent_at DESC, id DESC
    `,
    [studentIds],
  );

  return new Map(result.rows.map((row) => [row.student_id, row]));
}

function buildPendingPayment(today: Date, snapshot: StudentPaymentSnapshot): PendingPayment {
  const registrationDate = parseDateOnly(snapshot.registration_date);
  const paidThroughDate = snapshot.paid_through_date
    ? parseDateOnly(snapshot.paid_through_date)
    : null;
  const nextDueDate = paidThroughDate ? addDays(paidThroughDate, 1) : registrationDate;
  const daysUntilDue = diffDays(today, nextDueDate);
  const dueStatus: PendingPayment['due_status'] =
    daysUntilDue < 0
      ? 'overdue'
      : daysUntilDue === 0
        ? 'due_today'
        : daysUntilDue <= DUE_SOON_WINDOW_DAYS
        ? 'due_soon'
        : 'current';

  const pendingCycles =
    daysUntilDue <= 0 ? Math.floor(Math.abs(daysUntilDue) / PAYMENT_CYCLE_DAYS) + 1 : 0;
  const monthlyFee = Number.parseFloat(String(snapshot.monthly_fee));
  const recommendedReminderStage =
    dueStatus === 'overdue'
      ? 'overdue'
      : dueStatus === 'due_today'
        ? 'due_today'
        : daysUntilDue <= 3
          ? 'before_3_days'
          : null;

  return {
    student_id: snapshot.student_id,
    student_name: snapshot.student_name,
    student_code: snapshot.student_code,
    student_email: snapshot.student_email,
    student_phone: snapshot.student_phone,
    branch_id: snapshot.branch_id,
    branch_name: snapshot.branch_name,
    monthly_fee: monthlyFee,
    pending_cycles: pendingCycles,
    total_pending: pendingCycles * monthlyFee,
    last_payment_date: snapshot.last_payment_date ? parseDateOnly(snapshot.last_payment_date) : null,
    paid_through_date: paidThroughDate,
    next_due_date: nextDueDate,
    days_until_due: daysUntilDue,
    due_status: dueStatus,
    renewal_amount: monthlyFee,
    last_paid_fee_month: snapshot.last_paid_fee_month,
    last_paid_fee_year: snapshot.last_paid_fee_year,
    recommended_reminder_stage: recommendedReminderStage,
    last_reminder_at: null,
    last_reminder_channel: null,
    last_reminder_stage: null,
  };
}

async function getTodayDateString(): Promise<string> {
  const result = await pool.query<{ today: string }>('SELECT CURRENT_DATE::text AS today');
  return result.rows[0]?.today ?? new Date().toISOString().slice(0, 10);
}

async function getStudentPaymentSnapshots(branchId?: number): Promise<PendingPayment[]> {
  const params: number[] = [];
  let query = `
    SELECT
      s.id AS student_id,
      s.name AS student_name,
      s.student_id AS student_code,
      s.email AS student_email,
      s.phone AS student_phone,
      s.branch_id,
      b.name AS branch_name,
      s.monthly_fee,
      s.registration_date::date::text AS registration_date,
      latest.last_payment_date,
      latest.paid_through_date,
      latest.last_paid_fee_month,
      latest.last_paid_fee_year
    FROM students s
    JOIN branches b ON b.id = s.branch_id
    LEFT JOIN LATERAL (
      SELECT
        p.payment_date::date::text AS last_payment_date,
        p.coverage_end_date::text AS paid_through_date,
        p.fee_month AS last_paid_fee_month,
        p.fee_year AS last_paid_fee_year
      FROM fee_payments p
      WHERE p.student_id = s.id
        AND p.status = 'paid'
      ORDER BY p.coverage_end_date DESC, p.payment_date DESC, p.id DESC
      LIMIT 1
    ) latest ON true
    WHERE s.is_active = true
      AND s.membership_status = 'active'
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  query += ' ORDER BY s.name ASC';

  const [snapshotResult, todayString] = await Promise.all([
    pool.query<StudentPaymentSnapshot>(query, params),
    getTodayDateString(),
  ]);

  const today = parseDateOnly(todayString);
  const pendingPayments = snapshotResult.rows.map((row) => buildPendingPayment(today, row));
  const reminderMap = await getLatestReminderMap(
    pendingPayments.map((item) => item.student_id),
  );

  return pendingPayments.map((item) => {
    const latestReminder = reminderMap.get(item.student_id);

    if (!latestReminder) {
      return item;
    }

    return {
      ...item,
      last_reminder_at: latestReminder.sent_at,
      last_reminder_channel: latestReminder.channel,
      last_reminder_stage: latestReminder.reminder_stage,
    };
  });
}

function buildPaymentAlertSummary(statuses: PendingPayment[]): PaymentAlertSummary {
  const overdue = statuses.filter((status) => status.due_status === 'overdue');
  const dueToday = statuses.filter((status) => status.due_status === 'due_today');
  const dueSoon = statuses.filter((status) => status.due_status === 'due_soon');
  const current = statuses.filter((status) => status.due_status === 'current');

  const overdueAmount = overdue.reduce((sum, item) => sum + item.total_pending, 0);
  const dueTodayAmount = dueToday.reduce((sum, item) => sum + item.total_pending, 0);
  const dueSoonAmount = dueSoon.reduce((sum, item) => sum + item.renewal_amount, 0);

  return {
    overdue_count: overdue.length,
    due_today_count: dueToday.length,
    due_soon_count: dueSoon.length,
    current_count: current.length,
    overdue_amount: overdueAmount,
    due_today_amount: dueTodayAmount,
    due_soon_amount: dueSoonAmount,
    attention_required_count: overdue.length + dueToday.length,
    attention_required_amount: overdueAmount + dueTodayAmount,
    watchlist: [...overdue, ...dueToday, ...dueSoon].sort((left, right) => {
      if (left.days_until_due !== right.days_until_due) {
        return left.days_until_due - right.days_until_due;
      }

      return left.student_name.localeCompare(right.student_name);
    }),
  };
}

async function hasReminderBeenSentToday(
  studentId: number,
  stage: PaymentReminderStage,
  channel: 'sms' | 'whatsapp',
): Promise<boolean> {
  const result = await pool.query<{ id: number }>(
    `
      SELECT id
      FROM payment_communications
      WHERE student_id = $1
        AND communication_type = 'fee_reminder'
        AND reminder_stage = $2
        AND channel = $3
        AND sent_at::date = CURRENT_DATE
      LIMIT 1
    `,
    [studentId, stage, channel],
  );

  return result.rows.length > 0;
}

async function getPaymentWithDetailsById(
  paymentId: number,
  branchId?: number,
): Promise<PaymentWithStudent | null> {
  const params: Array<number | string> = [paymentId];
  let query = `
    SELECT
      p.id,
      p.payment_date,
      p.coverage_start_date,
      p.coverage_end_date,
      p.amount,
      p.fee_month,
      p.fee_year,
      p.payment_method,
      p.transaction_id,
      p.status,
      p.receipt_number,
      p.student_id,
      s.name AS student_name,
      s.student_id AS student_code,
      s.email AS student_email,
      s.phone AS student_phone,
      s.branch_id,
      b.name AS branch_name
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    JOIN branches b ON b.id = s.branch_id
    WHERE p.id = $1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  const result = await pool.query<PaymentWithStudent>(query, params);
  return result.rows[0] ?? null;
}

function toReceiptSnapshot(payment: PaymentWithStudent): ReceiptData {
  return {
    receipt_number: payment.receipt_number,
    student_name: payment.student_name,
    student_code: payment.student_code,
    student_email: payment.student_email,
    student_phone: payment.student_phone,
    amount: payment.amount,
    payment_date: payment.payment_date,
    coverage_start_date: payment.coverage_start_date,
    coverage_end_date: payment.coverage_end_date,
    fee_month: payment.fee_month,
    fee_year: payment.fee_year,
    payment_method: payment.payment_method,
    transaction_id: payment.transaction_id,
  };
}

async function insertCommunicationLog(input: {
  studentId: number;
  paymentId: number | null;
  branchId: number;
  communicationType: 'fee_reminder' | 'payment_receipt';
  reminderStage: PaymentReminderStage | null;
  channel: 'sms' | 'whatsapp';
  deliveryStatus: 'logged' | 'sent' | 'failed';
  deliveryMode: 'log_only' | 'webhook' | 'provider';
  providerName: string | null;
  externalMessageId: string | null;
  recipientPhone: string;
  recipientEmail: string | null;
  subject: string | null;
  messageBody: string;
  receiptSnapshot: ReceiptData | null;
  sentBy: number | null;
}): Promise<PaymentCommunication> {
  const result = await pool.query<PaymentCommunicationRow>(
    `
      INSERT INTO payment_communications (
        student_id,
        payment_id,
        branch_id,
        communication_type,
        reminder_stage,
        channel,
        delivery_status,
        delivery_mode,
        provider_name,
        external_message_id,
        recipient_phone,
        recipient_email,
        subject,
        message_body,
        receipt_snapshot,
        sent_by,
        sent_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        NOW()
      )
      RETURNING
        id,
        student_id,
        payment_id,
        branch_id,
        communication_type,
        reminder_stage,
        channel,
        delivery_status,
        delivery_mode,
        provider_name,
        external_message_id,
        recipient_phone,
        recipient_email,
        subject,
        message_body,
        receipt_snapshot,
        sent_by,
        sent_at,
        created_at,
        updated_at
    `,
    [
      input.studentId,
      input.paymentId,
      input.branchId,
      input.communicationType,
      input.reminderStage,
      input.channel,
      input.deliveryStatus,
      input.deliveryMode,
      input.providerName,
      input.externalMessageId,
      input.recipientPhone,
      input.recipientEmail,
      input.subject,
      input.messageBody,
      input.receiptSnapshot ? JSON.stringify(input.receiptSnapshot) : null,
      input.sentBy,
    ],
  );

  const communication = result.rows[0];

  if (!communication) {
    throw new Error('Communication log entry was not returned after creation');
  }

  return {
    ...communication,
    student_name: '',
    student_code: '',
    receipt_number: input.receiptSnapshot?.receipt_number ?? null,
  };
}

// Record a new payment
export async function recordPayment(
  data: RecordPaymentDTO,
  collectedBy: number,
  branchId?: number,
): Promise<Payment> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const studentParams: number[] = [data.student_id];
    let studentQuery = `
      SELECT
        s.id,
        s.name,
        s.student_id AS student_code,
        s.email,
        s.phone,
        s.branch_id,
        b.name AS branch_name,
        s.monthly_fee
      FROM students s
      JOIN branches b ON b.id = s.branch_id
      WHERE s.id = $1 AND s.is_active = true
    `;

    if (branchId != null) {
      studentParams.push(branchId);
      studentQuery += ` AND s.branch_id = $${studentParams.length}`;
    }

    studentQuery += ' FOR UPDATE';

    const studentResult = await client.query<StudentPaymentRecord>(studentQuery, studentParams);

    if (studentResult.rows.length === 0) {
      throw new Error('Student not found or inactive');
    }

    const studentRow = studentResult.rows[0];

    if (!studentRow) {
      throw new Error('Student not found or inactive');
    }

    const expectedFee = Number.parseFloat(String(studentRow.monthly_fee));

    if (Number.parseFloat(data.amount.toString()) !== expectedFee) {
      throw new Error(
        `Amount mismatch. Expected: Rs.${expectedFee}, Received: Rs.${data.amount}`,
      );
    }

    const todayResult = await client.query<{ today: string }>(
      'SELECT CURRENT_DATE::text AS today',
    );
    const todayRow = todayResult.rows[0];
    const todayDate = parseDateOnly(todayRow?.today ?? new Date().toISOString().slice(0, 10));

    const latestCoverageResult = await client.query<{
      coverage_end_date: string;
      payment_date: string;
    }>(
      `
        SELECT
          coverage_end_date::text,
          payment_date::date::text AS payment_date
        FROM fee_payments
        WHERE student_id = $1
          AND status = 'paid'
        ORDER BY coverage_end_date DESC, payment_date DESC, id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [data.student_id],
    );

    const latestCoverageEnd = latestCoverageResult.rows[0]?.coverage_end_date
      ? parseDateOnly(latestCoverageResult.rows[0].coverage_end_date)
      : null;
    const latestPaymentDate = latestCoverageResult.rows[0]?.payment_date
      ? parseDateOnly(latestCoverageResult.rows[0].payment_date)
      : null;

    if (latestPaymentDate?.getTime() === todayDate.getTime()) {
      throw new Error('Payment already recorded today for this student');
    }

    const coverageStartDate =
      latestCoverageEnd && latestCoverageEnd >= todayDate
        ? addDays(latestCoverageEnd, 1)
        : todayDate;
    const coverageEndDate = addDays(coverageStartDate, PAYMENT_CYCLE_END_OFFSET);

    const insertQuery = `
      INSERT INTO fee_payments (
        student_id,
        payment_date,
        coverage_start_date,
        coverage_end_date,
        amount,
        fee_month,
        fee_year,
        payment_method,
        transaction_id,
        status,
        collected_by,
        notes
      ) VALUES (
        $1,
        NOW(),
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        'paid',
        $9,
        $10
      )
      RETURNING *;
    `;

    const result = await client.query<Payment>(insertQuery, [
      data.student_id,
      formatDateOnly(coverageStartDate),
      formatDateOnly(coverageEndDate),
      data.amount,
      data.fee_month ?? coverageEndDate.getUTCMonth() + 1,
      data.fee_year ?? coverageEndDate.getUTCFullYear(),
      data.payment_method || 'upi',
      data.transaction_id || null,
      collectedBy,
      data.notes || null,
    ]);

    const createdPayment = result.rows[0];

    if (!createdPayment) {
      throw new Error('Payment record was not returned after creation');
    }

    await notificationsService.createPaymentReceivedNotification(client, {
      paymentId: createdPayment.id,
      studentId: createdPayment.student_id,
      studentName: studentRow.name,
      branchId: studentRow.branch_id,
      branchName: studentRow.branch_name,
      amount: createdPayment.amount,
      receiptNumber: createdPayment.receipt_number,
    });

    await client.query('COMMIT');

    try {
      await sendPaymentReceipt(createdPayment.id, collectedBy, branchId, 'both');
    } catch (communicationError) {
      console.error('Automatic payment receipt logging failed:', communicationError);
    }

    return createdPayment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get student's payment history
export async function getStudentPaymentHistory(
  studentId: number,
  limit: number = 12,
  branchId?: number,
): Promise<Payment[]> {
  const params: number[] = [studentId];
  let query = `
    SELECT p.*
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    WHERE p.student_id = $1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  query += ` ORDER BY p.payment_date DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query<Payment>(query, params);
  return result.rows;
}

// Get all payments with student details
export async function getAllPayments(
  month?: number,
  year?: number,
  branchId?: number,
  limit: number = 50,
): Promise<PaymentWithStudent[]> {
  let query = `
    SELECT
      p.id,
      p.payment_date,
      p.coverage_start_date,
      p.coverage_end_date,
      p.amount,
      p.fee_month,
      p.fee_year,
      p.payment_method,
      p.transaction_id,
      p.status,
      p.receipt_number,
      p.student_id,
      s.name as student_name,
      s.student_id as student_code,
      s.email as student_email,
      s.phone as student_phone,
      s.branch_id,
      b.name as branch_name
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    JOIN branches b ON s.branch_id = b.id
    WHERE 1=1
  `;

  const params: number[] = [];

  if (month) {
    params.push(month);
    query += ` AND EXTRACT(MONTH FROM p.payment_date) = $${params.length}`;
  }

  if (year) {
    params.push(year);
    query += ` AND EXTRACT(YEAR FROM p.payment_date) = $${params.length}`;
  }

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  query += ` ORDER BY p.payment_date DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query<PaymentWithStudent>(query, params);
  return result.rows;
}

// Get pending payments
export async function getPendingPayments(branchId?: number): Promise<PendingPayment[]> {
  const statuses = await getStudentPaymentSnapshots(branchId);

  return statuses
    .filter((status) => status.due_status !== 'current')
    .sort((left, right) => {
      if (left.days_until_due !== right.days_until_due) {
        return left.days_until_due - right.days_until_due;
      }

      return left.student_name.localeCompare(right.student_name);
    });
}

export async function getPaymentAlertSummary(branchId?: number): Promise<PaymentAlertSummary> {
  const statuses = await getStudentPaymentSnapshots(branchId);
  return buildPaymentAlertSummary(statuses);
}

export async function getPaymentCommunicationHistory(
  options: PaymentCommunicationQueryOptions = {},
  branchId?: number,
): Promise<PaymentCommunication[]> {
  const params: Array<number | string> = [];
  let query = `
    SELECT
      c.id,
      c.student_id,
      c.payment_id,
      c.branch_id,
      c.communication_type,
      c.reminder_stage,
      c.channel,
      c.delivery_status,
      c.delivery_mode,
      c.provider_name,
      c.external_message_id,
      c.recipient_phone,
      c.recipient_email,
      c.subject,
      c.message_body,
      c.receipt_snapshot,
      c.sent_by,
      c.sent_at,
      c.created_at,
      c.updated_at,
      s.name AS student_name,
      s.student_id AS student_code,
      p.receipt_number
    FROM payment_communications c
    JOIN students s ON s.id = c.student_id
    LEFT JOIN fee_payments p ON p.id = c.payment_id
    WHERE 1 = 1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND c.branch_id = $${params.length}`;
  }

  if (options.student_id != null) {
    params.push(options.student_id);
    query += ` AND c.student_id = $${params.length}`;
  }

  if (options.payment_id != null) {
    params.push(options.payment_id);
    query += ` AND c.payment_id = $${params.length}`;
  }

  const limit = Math.min(options.limit ?? 50, 200);
  params.push(limit);
  query += ` ORDER BY c.sent_at DESC, c.id DESC LIMIT $${params.length}`;

  const result = await pool.query<PaymentCommunicationRow>(query, params);
  return result.rows;
}

export async function sendPaymentReminder(
  studentId: number,
  sentBy: number,
  branchId?: number,
  requestedChannel: PaymentCommunicationRequestChannel = 'both',
): Promise<PaymentCommunication[]> {
  const pendingPayment = (await getStudentPaymentSnapshots(branchId)).find(
    (item) => item.student_id === studentId,
  );

  if (!pendingPayment) {
    throw new Error('Student not found or not accessible');
  }

  const reminder = buildReminderMessage(pendingPayment);
  const channels = resolveRequestedChannels(requestedChannel);
  const eligibleChannels: Array<'sms' | 'whatsapp'> = [];

  for (const channel of channels) {
    const alreadySent = await hasReminderBeenSentToday(
      pendingPayment.student_id,
      reminder.stage,
      channel,
    );

    if (!alreadySent) {
      eligibleChannels.push(channel);
    }
  }

  if (eligibleChannels.length === 0) {
    throw new Error('Reminder already sent today for the selected channels');
  }

  const communications: PaymentCommunication[] = [];

  for (const channel of eligibleChannels) {
    const dispatchResult = await dispatchPaymentCommunication({
      channel,
      recipientPhone: pendingPayment.student_phone,
      recipientEmail: pendingPayment.student_email,
      subject: reminder.subject,
      messageBody: reminder.messageBody,
      metadata: {
        communication_type: 'fee_reminder',
        reminder_stage: reminder.stage,
        student_id: pendingPayment.student_id,
        student_code: pendingPayment.student_code,
        next_due_date: formatDateOnly(pendingPayment.next_due_date),
      },
    });

    const communication = await insertCommunicationLog({
      studentId: pendingPayment.student_id,
      paymentId: null,
      branchId: pendingPayment.branch_id,
      communicationType: 'fee_reminder',
      reminderStage: reminder.stage,
      channel,
      deliveryStatus: dispatchResult.deliveryStatus,
      deliveryMode: dispatchResult.deliveryMode,
      providerName: dispatchResult.providerName,
      externalMessageId: dispatchResult.externalMessageId,
      recipientPhone: pendingPayment.student_phone,
      recipientEmail: pendingPayment.student_email,
      subject: reminder.subject,
      messageBody: reminder.messageBody,
      receiptSnapshot: null,
      sentBy,
    });

    communications.push({
      ...communication,
      student_name: pendingPayment.student_name,
      student_code: pendingPayment.student_code,
      receipt_number: null,
    });
  }

  return communications;
}

export async function runReminderBatch(
  sentBy: number,
  branchId?: number,
  requestedChannel: PaymentCommunicationRequestChannel = 'both',
): Promise<PaymentReminderBatchResult> {
  const watchlist = (await getStudentPaymentSnapshots(branchId)).filter(
    (item) => item.recommended_reminder_stage != null,
  );

  const channels = resolveRequestedChannels(requestedChannel);
  const communications: PaymentCommunication[] = [];
  let skipped = 0;

  for (const pendingPayment of watchlist) {
    const reminder = buildReminderMessage(pendingPayment);
    const eligibleChannels: Array<'sms' | 'whatsapp'> = [];

    for (const channel of channels) {
      const alreadySent = await hasReminderBeenSentToday(
        pendingPayment.student_id,
        reminder.stage,
        channel,
      );

      if (alreadySent) {
        skipped += 1;
        continue;
      }

      eligibleChannels.push(channel);
    }

    for (const channel of eligibleChannels) {
      const dispatchResult = await dispatchPaymentCommunication({
        channel,
        recipientPhone: pendingPayment.student_phone,
        recipientEmail: pendingPayment.student_email,
        subject: reminder.subject,
        messageBody: reminder.messageBody,
        metadata: {
          communication_type: 'fee_reminder',
          reminder_stage: reminder.stage,
          student_id: pendingPayment.student_id,
          student_code: pendingPayment.student_code,
          next_due_date: formatDateOnly(pendingPayment.next_due_date),
        },
      });

      const communication = await insertCommunicationLog({
        studentId: pendingPayment.student_id,
        paymentId: null,
        branchId: pendingPayment.branch_id,
        communicationType: 'fee_reminder',
        reminderStage: reminder.stage,
        channel,
        deliveryStatus: dispatchResult.deliveryStatus,
        deliveryMode: dispatchResult.deliveryMode,
        providerName: dispatchResult.providerName,
        externalMessageId: dispatchResult.externalMessageId,
        recipientPhone: pendingPayment.student_phone,
        recipientEmail: pendingPayment.student_email,
        subject: reminder.subject,
        messageBody: reminder.messageBody,
        receiptSnapshot: null,
        sentBy,
      });

      communications.push({
        ...communication,
        student_name: pendingPayment.student_name,
        student_code: pendingPayment.student_code,
        receipt_number: null,
      });
    }
  }

  return {
    attempted: watchlist.length,
    sent: communications.length,
    skipped,
    communications,
  };
}

export async function sendPaymentReceipt(
  paymentId: number,
  sentBy: number,
  branchId?: number,
  requestedChannel: PaymentCommunicationRequestChannel = 'both',
): Promise<PaymentCommunication[]> {
  const payment = await getPaymentWithDetailsById(paymentId, branchId);

  if (!payment) {
    throw new Error('Payment not found');
  }

  const receiptSnapshot = toReceiptSnapshot(payment);
  const receipt = buildReceiptMessage(receiptSnapshot);
  const channels = resolveRequestedChannels(requestedChannel);
  const communications: PaymentCommunication[] = [];
  const paymentBranchId = payment.branch_id;

  if (paymentBranchId == null) {
    throw new Error('Payment branch details are missing');
  }

  for (const channel of channels) {
    const dispatchResult = await dispatchPaymentCommunication({
      channel,
      recipientPhone: payment.student_phone,
      recipientEmail: payment.student_email,
      subject: receipt.subject,
      messageBody: receipt.messageBody,
      metadata: {
        communication_type: 'payment_receipt',
        payment_id: payment.id,
        receipt_number: payment.receipt_number,
        student_id: payment.student_id,
        student_code: payment.student_code,
      },
    });

    const communication = await insertCommunicationLog({
      studentId: payment.student_id,
      paymentId: payment.id,
      branchId: paymentBranchId,
      communicationType: 'payment_receipt',
      reminderStage: null,
      channel,
      deliveryStatus: dispatchResult.deliveryStatus,
      deliveryMode: dispatchResult.deliveryMode,
      providerName: dispatchResult.providerName,
      externalMessageId: dispatchResult.externalMessageId,
      recipientPhone: payment.student_phone,
      recipientEmail: payment.student_email,
      subject: receipt.subject,
      messageBody: receipt.messageBody,
      receiptSnapshot,
      sentBy,
    });

    communications.push({
      ...communication,
      student_name: payment.student_name,
      student_code: payment.student_code,
      receipt_number: payment.receipt_number,
    });
  }

  return communications;
}

// Get monthly revenue report
export async function getMonthlyRevenue(
  month: number,
  year: number,
  branchId?: number,
): Promise<MonthlyRevenue> {
  const revenueParams: number[] = [month, year];
  let revenueQuery = `
    SELECT
      COUNT(*) as total_payments,
      COALESCE(SUM(p.amount), 0) as total_amount
    FROM fee_payments p
  `;

  if (branchId != null) {
    revenueParams.push(branchId);
    revenueQuery += `
      JOIN students s ON p.student_id = s.id
      WHERE EXTRACT(MONTH FROM p.payment_date) = $1
        AND EXTRACT(YEAR FROM p.payment_date) = $2
        AND p.status = 'paid'
        AND s.branch_id = $3
    `;
  } else {
    revenueQuery += `
      WHERE EXTRACT(MONTH FROM p.payment_date) = $1
        AND EXTRACT(YEAR FROM p.payment_date) = $2
        AND p.status = 'paid'
    `;
  }

  const revenueResult = await pool.query(revenueQuery, revenueParams);

  const branchParams: number[] = [month, year];
  let branchQuery = `
    SELECT
      s.branch_id,
      b.name as branch_name,
      COALESCE(SUM(p.amount), 0) as total_amount,
      COUNT(p.id) as payment_count
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    JOIN branches b ON s.branch_id = b.id
    WHERE EXTRACT(MONTH FROM p.payment_date) = $1
      AND EXTRACT(YEAR FROM p.payment_date) = $2
      AND p.status = 'paid'
  `;

  if (branchId != null) {
    branchParams.push(branchId);
    branchQuery += ` AND s.branch_id = $${branchParams.length}`;
  }

  branchQuery += `
    GROUP BY s.branch_id, b.name
    ORDER BY total_amount DESC
  `;

  const branchResult = await pool.query(branchQuery, branchParams);

  return {
    month,
    year,
    total_payments: Number.parseInt(revenueResult.rows[0].total_payments, 10),
    total_amount: Number.parseFloat(revenueResult.rows[0].total_amount),
    branch_wise: branchResult.rows,
  };
}

// Get payment by receipt number
export async function getPaymentByReceiptNumber(
  receiptNumber: string,
  branchId?: number,
): Promise<PaymentWithStudent | null> {
  const params: Array<string | number> = [receiptNumber];
  let query = `
    SELECT
      p.id,
      p.payment_date,
      p.coverage_start_date,
      p.coverage_end_date,
      p.amount,
      p.fee_month,
      p.fee_year,
      p.payment_method,
      p.transaction_id,
      p.status,
      p.receipt_number,
      p.student_id,
      s.name as student_name,
      s.student_id as student_code,
      s.email as student_email,
      s.phone as student_phone,
      s.branch_id,
      b.name as branch_name
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    JOIN branches b ON s.branch_id = b.id
    WHERE p.receipt_number = $1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  const result = await pool.query<PaymentWithStudent>(query, params);
  return result.rows[0] ?? null;
}
