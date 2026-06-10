import pool from '../../config/db.ts';
import { getPaymentAlertSummary, getStudentPaymentSnapshots } from '../payments/payments.service.ts';
import type { FeeDashboard, StudentFeeStatus, OverdueStudent, DueGenerationResult, FeePaymentRecord, FeePaymentDetail } from './fees.types.ts';

export async function getDashboard(branchId?: number): Promise<FeeDashboard> {
  const branchFilter = branchId ? 'AND s.branch_id = $2' : '';
  const branchParam = branchId ? [branchId] : [];

  const result = await pool.query(`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE fp.status = 'paid' AND DATE(fp.payment_date) = CURRENT_DATE), 0) AS today_collected,
      COUNT(*) FILTER (WHERE fp.status = 'paid' AND DATE(fp.payment_date) = CURRENT_DATE)::int AS today_count,
      COALESCE(SUM(amount) FILTER (WHERE fp.status = 'paid' AND EXTRACT(MONTH FROM fp.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fp.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0) AS month_collected,
      COUNT(*) FILTER (WHERE fp.status = 'paid' AND EXTRACT(MONTH FROM fp.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fp.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE))::int AS month_count
    FROM fee_payments fp
    JOIN students s ON s.id = fp.student_id
    WHERE 1=1${branchFilter ? ` AND s.branch_id = $1` : ''}
  `, branchParam);

  const alerts = await getPaymentAlertSummary(branchId);

  return {
    today_collected: Number(result.rows[0]?.today_collected ?? 0),
    today_count: result.rows[0]?.today_count ?? 0,
    month_collected: Number(result.rows[0]?.month_collected ?? 0),
    month_count: result.rows[0]?.month_count ?? 0,
    pending_count: alerts.overdue_count + alerts.due_today_count + alerts.due_soon_count,
    pending_amount: 0,
    overdue_count: alerts.overdue_count,
    overdue_amount: 0,
  };
}

export async function getStudentFeeStatuses(branchId?: number): Promise<StudentFeeStatus[]> {
  const snapshots = await getStudentPaymentSnapshots(branchId);

  return snapshots.map((p) => ({
    student_id: p.student_id,
    student_code: p.student_code,
    name: p.student_name,
    branch_name: p.branch_name,
    study_plan: '',
    monthly_fee: p.monthly_fee,
    status: (p.due_status === 'overdue' || p.due_status === 'due_today') ? 'overdue' as const
      : p.due_status === 'due_soon' ? 'pending' as const
      : 'paid' as const,
    paid_amount: 0,
    payment_date: p.paid_through_date as unknown as string ?? null,
    coverage_start: null as string | null,
    coverage_end: null as string | null,
  }));
}

export async function getOverdueStudents(branchId?: number): Promise<OverdueStudent[]> {
  const result = await pool.query(`
    SELECT
      s.id AS student_id,
      s.student_id AS student_code,
      s.name,
      b.name AS branch_name,
      s.phone,
      s.monthly_fee,
      COUNT(fp.id)::int AS overdue_months,
      SUM(fp.amount) AS total_due,
      TO_CHAR(MAX(lp.payment_date), 'DD Mon YYYY') AS last_paid_date
    FROM students s
    JOIN branches b ON b.id = s.branch_id
    JOIN fee_payments fp ON fp.student_id = s.id
      AND fp.status = 'pending'
      AND fp.payment_date < CURRENT_DATE
    LEFT JOIN LATERAL (
      SELECT payment_date FROM fee_payments
      WHERE student_id = s.id AND status = 'paid'
      ORDER BY payment_date DESC
      LIMIT 1
    ) lp ON true
    WHERE s.is_active = true
      ${branchId ? 'AND s.branch_id = $1' : ''}
    GROUP BY s.id, s.student_id, s.name, b.name, s.phone, s.monthly_fee
    ORDER BY total_due DESC
  `, branchId ? [branchId] : []);

  return result.rows;
}

export async function generateDues(month: number, year: number, branchId?: number): Promise<DueGenerationResult> {
  const result: DueGenerationResult = { generated: 0, skipped: 0, errors: [] };

  const students = await pool.query(`
    SELECT id, name, student_id, monthly_fee, branch_id
    FROM students
    WHERE is_active = true
      AND monthly_fee > 0
      ${branchId ? 'AND branch_id = $1' : ''}
  `, branchId ? [branchId] : []);

  for (const student of students.rows) {
    try {
      const existing = await pool.query(`
        SELECT id FROM fee_payments
        WHERE student_id = $1 AND fee_month = $2 AND fee_year = $3
      `, [student.id, month, year]);

      if (existing.rows.length > 0) {
        result.skipped++;
        continue;
      }

      const coverageStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const coverageEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      await pool.query(`
        INSERT INTO fee_payments (student_id, amount, fee_month, fee_year, status, payment_date, coverage_start_date, coverage_end_date, payment_method)
        VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, 'upi')
      `, [student.id, student.monthly_fee, month, year, `${year}-${String(month).padStart(2, '0')}-28`, coverageStart, coverageEnd]);

      result.generated++;
    } catch (error: any) {
      result.errors.push(`Student ${student.student_id} (${student.name}): ${error.message}`);
    }
  }

  return result;
}

export async function recordManualPayment(
  studentId: number,
  amount: number,
  feeMonth: number,
  feeYear: number,
  paymentMethod: string,
  transactionId: string | null,
  notes: string | null,
  collectedBy: number,
): Promise<FeePaymentRecord> {
  const coverageStart = `${feeYear}-${String(feeMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(feeYear, feeMonth, 0).getDate();
  const coverageEnd = `${feeYear}-${String(feeMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const result = await pool.query(`
    INSERT INTO fee_payments (student_id, amount, fee_month, fee_year, status, payment_date, coverage_start_date, coverage_end_date, payment_method, transaction_id, notes, collected_by, verification_source)
    VALUES ($1, $2, $3, $4, 'paid', CURRENT_DATE, $5, $6, $7, $8, $9, $10, 'manual_entry')
    ON CONFLICT (student_id, fee_month, fee_year)
    DO UPDATE SET
      status = 'paid',
      amount = EXCLUDED.amount,
      payment_date = CURRENT_DATE,
      coverage_start_date = EXCLUDED.coverage_start_date,
      coverage_end_date = EXCLUDED.coverage_end_date,
      payment_method = EXCLUDED.payment_method,
      transaction_id = EXCLUDED.transaction_id,
      notes = EXCLUDED.notes,
      collected_by = EXCLUDED.collected_by,
      verification_source = 'manual_entry'
    RETURNING id, payment_date
  `, [studentId, amount, feeMonth, feeYear, coverageStart, coverageEnd, paymentMethod, transactionId, notes, collectedBy]);

  const payment = result.rows[0];
  const receiptNumber = `RCP-${payment.id.toString().padStart(6, '0')}`;

  await pool.query(`
    UPDATE fee_payments SET receipt_number = $1 WHERE id = $2
  `, [receiptNumber, payment.id]);

  const full = await pool.query(`
    SELECT
      fp.id,
      fp.student_id,
      fp.amount,
      TO_CHAR(fp.payment_date, 'DD Mon YYYY') AS payment_date,
      fp.fee_month,
      fp.fee_year,
      fp.status,
      fp.payment_method,
      fp.transaction_id,
      fp.receipt_number,
      s.name AS student_name,
      s.student_id AS student_code,
      b.name AS branch_name
    FROM fee_payments fp
    JOIN students s ON s.id = fp.student_id
    JOIN branches b ON b.id = s.branch_id
    WHERE fp.id = $1
  `, [payment.id]);

  return full.rows[0];
}

export async function getStudentPayments(studentId: number): Promise<FeePaymentDetail[]> {
  const result = await pool.query(`
    SELECT
      fp.id,
      fp.student_id,
      fp.amount,
      TO_CHAR(fp.payment_date, 'DD Mon YYYY') AS payment_date,
      fp.fee_month,
      fp.fee_year,
      fp.status,
      fp.payment_method,
      fp.transaction_id,
      fp.receipt_number,
      TO_CHAR(fp.coverage_start_date, 'DD Mon YYYY') AS coverage_start_date,
      TO_CHAR(fp.coverage_end_date, 'DD Mon YYYY') AS coverage_end_date,
      fp.notes,
      u.name AS collected_by,
      fp.verification_source,
      TO_CHAR(fp.created_at, 'DD Mon YYYY HH24:MI') AS created_at
    FROM fee_payments fp
    LEFT JOIN users u ON u.id = fp.collected_by
    WHERE fp.student_id = $1
    ORDER BY fp.fee_year DESC, fp.fee_month DESC, fp.created_at DESC
  `, [studentId]);

  return result.rows;
}

export async function getPaymentHistory(
  branchId?: number,
  status?: string,
  month?: number,
  year?: number,
  limit: number = 50,
  offset: number = 0,
): Promise<{ data: FeePaymentRecord[]; total: number }> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (branchId) {
    conditions.push(`s.branch_id = $${paramIndex++}`);
    params.push(branchId);
  }
  if (status) {
    conditions.push(`fp.status = $${paramIndex++}`);
    params.push(status);
  }
  if (month) {
    conditions.push(`fp.fee_month = $${paramIndex++}`);
    params.push(month);
  }
  if (year) {
    conditions.push(`fp.fee_year = $${paramIndex++}`);
    params.push(year);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(`
    SELECT COUNT(*)::int AS total
    FROM fee_payments fp
    JOIN students s ON s.id = fp.student_id
    JOIN branches b ON b.id = s.branch_id
    ${whereClause}
  `, params);

  params.push(limit);
  params.push(offset);

  const payments = await pool.query(`
    SELECT
      fp.id,
      fp.student_id,
      fp.amount,
      TO_CHAR(fp.payment_date, 'DD Mon YYYY') AS payment_date,
      fp.fee_month,
      fp.fee_year,
      fp.status,
      fp.payment_method,
      fp.transaction_id,
      fp.receipt_number,
      s.name AS student_name,
      s.student_id AS student_code,
      b.name AS branch_name
    FROM fee_payments fp
    JOIN students s ON s.id = fp.student_id
    JOIN branches b ON b.id = s.branch_id
    ${whereClause}
    ORDER BY fp.payment_date DESC, fp.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `, params);

  return { data: payments.rows, total: countResult.rows[0]?.total ?? 0 };
}
