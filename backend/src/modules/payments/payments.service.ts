import pool from '../../config/db.js';
import type {
  Payment,
  RecordPaymentDTO,
  PaymentWithStudent,
  PendingPayment,
  MonthlyRevenue
} from './payments.types.js';

// Record a new payment
export async function recordPayment(data: RecordPaymentDTO, collectedBy: number): Promise<Payment> {
  // Check if payment already exists for this month/year
  const checkQuery = `
    SELECT * FROM fee_payments 
    WHERE student_id = $1 AND fee_month = $2 AND fee_year = $3
  `;
  
  const existing = await pool.query(checkQuery, [data.student_id, data.fee_month, data.fee_year]);
  
  if (existing.rows.length > 0) {
    throw new Error('Payment already recorded for this month');
  }
  
  // Verify student exists and get their monthly fee
  const studentQuery = `
    SELECT monthly_fee FROM students WHERE id = $1 AND is_active = true
  `;
  
  const studentResult = await pool.query(studentQuery, [data.student_id]);
  
  if (studentResult.rows.length === 0) {
    throw new Error('Student not found or inactive');
  }
  
 const expectedFee = parseFloat(studentResult.rows[0].monthly_fee);

// Validate amount matches student's monthly fee
if (parseFloat(data.amount.toString()) !== expectedFee) {
  throw new Error(`Amount mismatch. Expected: ₹${expectedFee}, Received: ₹${data.amount}`);
}
  
  // Insert payment
  const insertQuery = `
    INSERT INTO fee_payments (
      student_id,
      payment_date,
      amount,
      fee_month,
      fee_year,
      payment_method,
      transaction_id,
      status,
      collected_by,
      notes
    ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, 'paid', $7, $8)
    RETURNING *;
  `;
  
  const result = await pool.query(insertQuery, [
    data.student_id,
    data.amount,
    data.fee_month,
    data.fee_year,
    data.payment_method || 'upi',  // Default to UPI
    data.transaction_id || null,
    collectedBy,
    data.notes || null
  ]);
  
  return result.rows[0];
}

// Get student's payment history
export async function getStudentPaymentHistory(studentId: number, limit: number = 12): Promise<Payment[]> {
  const query = `
    SELECT * FROM fee_payments 
    WHERE student_id = $1 
    ORDER BY fee_year DESC, fee_month DESC 
    LIMIT $2
  `;
  
  const result = await pool.query(query, [studentId, limit]);
  
  return result.rows;
}

// Get all payments with student details
export async function getAllPayments(
  month?: number,
  year?: number,
  branchId?: number,
  limit: number = 50
): Promise<PaymentWithStudent[]> {
  let query = `
    SELECT 
      p.id,
      p.payment_date,
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
  
  const params: any[] = [];
  
  if (month) {
    params.push(month);
    query += ` AND p.fee_month = $${params.length}`;
  }
  
  if (year) {
    params.push(year);
    query += ` AND p.fee_year = $${params.length}`;
  }
  
  if (branchId) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }
  
  query += ` ORDER BY p.payment_date DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  
  const result = await pool.query(query, params);
  
  return result.rows;
}

// Get pending payments
export async function getPendingPayments(branchId?: number): Promise<PendingPayment[]> {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  let query = `
    SELECT 
      s.id as student_id,
      s.name as student_name,
      s.student_id as student_code,
      s.email as student_email,
      s.phone as student_phone,
      s.monthly_fee,
      COUNT(DISTINCT TO_CHAR(generate_series, 'YYYY-MM')) as pending_months,
      s.monthly_fee * COUNT(DISTINCT TO_CHAR(generate_series, 'YYYY-MM')) as total_pending,
      MAX(p.payment_date) as last_payment_date
    FROM students s
    CROSS JOIN generate_series(
      DATE_TRUNC('month', s.registration_date),
      DATE_TRUNC('month', CURRENT_DATE),
      '1 month'::interval
    ) AS generate_series
    LEFT JOIN fee_payments p ON 
      s.id = p.student_id AND 
      EXTRACT(MONTH FROM generate_series) = p.fee_month AND
      EXTRACT(YEAR FROM generate_series) = p.fee_year AND
      p.status = 'paid'
    WHERE s.is_active = true 
      AND s.membership_status = 'active'
      AND p.id IS NULL
  `;
  
  const params: any[] = [];
  
  if (branchId) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }
  
  query += ` GROUP BY s.id, s.name, s.student_id, s.email, s.phone, s.monthly_fee
             HAVING COUNT(DISTINCT TO_CHAR(generate_series, 'YYYY-MM')) > 0
             ORDER BY pending_months DESC, s.name`;
  
  const result = await pool.query(query, params);
  
  return result.rows;
}

// Get monthly revenue report
export async function getMonthlyRevenue(month: number, year: number): Promise<MonthlyRevenue> {
  const revenueQuery = `
    SELECT 
      COUNT(*) as total_payments,
      COALESCE(SUM(amount), 0) as total_amount
    FROM fee_payments
    WHERE fee_month = $1 AND fee_year = $2 AND status = 'paid'
  `;
  
  const revenueResult = await pool.query(revenueQuery, [month, year]);
  
  // Branch-wise breakdown
  const branchQuery = `
    SELECT 
      s.branch_id,
      b.name as branch_name,
      COALESCE(SUM(p.amount), 0) as total_amount,
      COUNT(p.id) as payment_count
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    JOIN branches b ON s.branch_id = b.id
    WHERE p.fee_month = $1 AND p.fee_year = $2 AND p.status = 'paid'
    GROUP BY s.branch_id, b.name
    ORDER BY total_amount DESC
  `;
  
  const branchResult = await pool.query(branchQuery, [month, year]);
  
  return {
    month,
    year,
    total_payments: parseInt(revenueResult.rows[0].total_payments),
    total_amount: parseFloat(revenueResult.rows[0].total_amount),
    branch_wise: branchResult.rows
  };
}

// Get payment by receipt number
export async function getPaymentByReceiptNumber(receiptNumber: string): Promise<PaymentWithStudent | null> {
  const query = `
    SELECT 
      p.id,
      p.payment_date,
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
  
  const result = await pool.query(query, [receiptNumber]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
}