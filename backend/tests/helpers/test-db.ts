import pool from '../../src/config/db.js';
import { hashPassword } from '../../src/modules/auth/auth.service.js';

interface EnsureTestUserOptions {
  email: string;
  password?: string;
  role: 'superadmin' | 'admin';
  branchId?: number | null;
  name?: string;
  realName?: string;
}

export async function ensureTestUser({
  email,
  password = 'admin123',
  role,
  branchId = null,
  name = role,
  realName = role === 'superadmin' ? 'Super Admin' : 'Branch Admin',
}: EnsureTestUserOptions): Promise<void> {
  const hashedPassword = await hashPassword(password);

  await pool.query(
    `
      INSERT INTO users (
        name,
        email,
        password,
        role,
        branch_id,
        is_active,
        real_name
      ) VALUES ($1, $2, $3, $4, $5, true, $6)
      ON CONFLICT (email) DO UPDATE
      SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        branch_id = EXCLUDED.branch_id,
        is_active = true,
        real_name = EXCLUDED.real_name
    `,
    [name, email, hashedPassword, role, branchId, realName],
  );
}

export async function ensureTestAdminPassword(
  email: string = 'superadmin@library.com',
  password: string = 'admin123',
): Promise<void> {
  await ensureTestUser({
    email,
    password,
    role: email === 'superadmin@library.com' ? 'superadmin' : 'admin',
    branchId: email === 'superadmin@library.com' ? null : 1,
  });
}

export async function syncTableIdSequence(
  tableName: 'students' | 'fee_payments' | 'seat_bookings',
): Promise<void> {
  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence('${tableName}', 'id'),
      COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1,
      false
    )
  `);
}

export async function deleteFeePayment(
  studentId: number,
  feeMonth: number,
  feeYear: number,
): Promise<void> {
  await pool.query(
    'DELETE FROM fee_payments WHERE student_id = $1 AND fee_month = $2 AND fee_year = $3',
    [studentId, feeMonth, feeYear],
  );

  await syncTableIdSequence('fee_payments');
}

export async function deleteSeatBookings(
  studentId: number,
  bookingMonth: number,
  bookingYear: number,
): Promise<void> {
  await pool.query(
    `
      DELETE FROM seat_bookings
      WHERE student_id = $1
        AND booking_month = $2
        AND booking_year = $3
    `,
    [studentId, bookingMonth, bookingYear],
  );

  await syncTableIdSequence('seat_bookings');
}

export async function ensureTestSeat(
  branchId: number,
  seatNumber: string,
  section: 'general' | 'ac' | 'non_ac' | 'silent_zone' = 'general',
): Promise<{ id: number; seat_number: string }> {
  const result = await pool.query<{ id: number; seat_number: string }>(
    `
      INSERT INTO seats (
        branch_id,
        seat_number,
        floor_name,
        section,
        status,
        is_available,
        assigned_to_student_id,
        assigned_date
      ) VALUES ($1, $2, 'Test Floor', $3, 'active', true, NULL, NULL)
      ON CONFLICT (branch_id, seat_number) DO UPDATE
      SET
        floor_name = EXCLUDED.floor_name,
        section = EXCLUDED.section,
        status = 'active',
        is_available = true,
        assigned_to_student_id = NULL,
        assigned_date = NULL
      RETURNING id, seat_number
    `,
    [branchId, seatNumber, section],
  );

  const seat = result.rows[0];

  if (!seat) {
    throw new Error(`Failed to ensure test seat ${seatNumber} for branch ${branchId}`);
  }

  return seat;
}

export async function findAvailableSeat(
  branchId: number,
  bookingMonth: number,
  bookingYear: number,
  excludedSeatIds: number[] = [],
): Promise<{ id: number; seat_number: string }> {
  const params: Array<number | number[]> = [branchId, bookingMonth, bookingYear];
  let query = `
    SELECT s.id, s.seat_number
    FROM seats s
    LEFT JOIN seat_bookings sb
      ON sb.seat_id = s.id
     AND sb.booking_month = $2
     AND sb.booking_year = $3
     AND sb.status IN ('reserved', 'active')
    WHERE s.branch_id = $1
      AND s.status = 'active'
      AND sb.id IS NULL
  `;

  if (excludedSeatIds.length > 0) {
    params.push(excludedSeatIds);
    query += ` AND NOT (s.id = ANY($${params.length}))`;
  }

  query += ' ORDER BY s.id LIMIT 1';

  const result = await pool.query<{ id: number; seat_number: string }>(query, params);
  const seat = result.rows[0];

  if (!seat) {
    throw new Error(`No available seat found for branch ${branchId}`);
  }

  return seat;
}
