import pool from '../../config/db.ts';
import { hashPassword } from '../auth/auth.service.ts';
import type { AdminUser, CreateAdminDTO } from './users.types.ts';

function mapAdminRow(row: any): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: 'admin',
    branch_id: row.branch_id,
    branch_name: row.branch_name,
    is_active: row.is_active,
    real_name: row.real_name ?? null,
    personal_phone: row.personal_phone ?? null,
    employee_id: row.employee_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listAdmins(branchId?: number): Promise<AdminUser[]> {
  const params: number[] = [];
  let query = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.branch_id,
      u.is_active,
      u.real_name,
      u.personal_phone,
      u.employee_id,
      u.created_at,
      u.updated_at,
      b.name AS branch_name
    FROM users u
    JOIN branches b ON u.branch_id = b.id
    WHERE u.role = 'admin'
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND u.branch_id = $${params.length}`;
  }

  query += ' ORDER BY u.branch_id, u.email';

  const result = await pool.query(query, params);
  return result.rows.map(mapAdminRow);
}

async function ensureActiveBranch(branchId: number): Promise<void> {
  const result = await pool.query(
    `
      SELECT id
      FROM branches
      WHERE id = $1 AND is_active = true
    `,
    [branchId],
  );

  if (result.rows.length === 0) {
    throw new Error('Branch not found');
  }
}

async function ensureUniqueEmail(email: string): Promise<void> {
  const result = await pool.query(
    `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email],
  );

  if (result.rows.length > 0) {
    throw new Error('Email already exists');
  }
}

export async function createAdmin(data: CreateAdminDTO): Promise<AdminUser> {
  await ensureActiveBranch(data.branch_id);
  await ensureUniqueEmail(data.email);

  const hashedPassword = await hashPassword(data.password);
  const result = await pool.query(
    `
      INSERT INTO users (
        name,
        email,
        password,
        role,
        branch_id,
        is_active,
        real_name,
        personal_phone,
        employee_id,
        notes
      ) VALUES (
        $1,
        $2,
        $3,
        'admin',
        $4,
        true,
        $5,
        $6,
        $7,
        $8
      )
      RETURNING
        id,
        name,
        email,
        branch_id,
        is_active,
        real_name,
        personal_phone,
        employee_id,
        created_at,
        updated_at
    `,
    [
      data.name,
      data.email,
      hashedPassword,
      data.branch_id,
      data.real_name ?? null,
      data.personal_phone ?? null,
      data.employee_id ?? null,
      data.notes ?? null,
    ],
  );

  const admin = result.rows[0];
  const branchResult = await pool.query(
    'SELECT name FROM branches WHERE id = $1 LIMIT 1',
    [admin.branch_id],
  );

  return mapAdminRow({
    ...admin,
    branch_name: branchResult.rows[0]?.name ?? `Branch ${admin.branch_id}`,
  });
}
