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

export async function syncTableIdSequence(tableName: 'students' | 'fee_payments'): Promise<void> {
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
