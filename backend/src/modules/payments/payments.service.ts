import pool from '../../config/db.ts';
import type {
  Payment,
  PaymentAlertSummary,
  PaymentWithStudent,
  PendingPayment,
  RecordPaymentDTO,
  MonthlyRevenue,
} from './payments.types.ts';

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

  return snapshotResult.rows.map((row) => buildPendingPayment(today, row));
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
      SELECT id, monthly_fee
      FROM students
      WHERE id = $1 AND is_active = true
    `;

    if (branchId != null) {
      studentParams.push(branchId);
      studentQuery += ` AND branch_id = $${studentParams.length}`;
    }

    studentQuery += ' FOR UPDATE';

    const studentResult = await client.query<{
      id: number;
      monthly_fee: string | number;
    }>(studentQuery, studentParams);

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

    await client.query('COMMIT');
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
      s.phone as student_phone
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
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
      s.phone as student_phone
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    WHERE p.receipt_number = $1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  const result = await pool.query<PaymentWithStudent>(query, params);
  return result.rows[0] ?? null;
}
