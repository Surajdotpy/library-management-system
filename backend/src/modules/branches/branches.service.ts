import pool from '../../config/db.js';
import type { JWTPayload } from '../auth/auth.types.js';
import type { Branch } from './branches.types.js';

export async function getAccessibleBranches(user: JWTPayload): Promise<Branch[]> {
  if (user.role === 'superadmin') {
    const result = await pool.query<Branch>(
      `
        SELECT *
        FROM branches
        WHERE is_active = true
        ORDER BY id
      `,
    );

    return result.rows;
  }

  if (user.branch_id == null) {
    return [];
  }

  const result = await pool.query<Branch>(
    `
      SELECT *
      FROM branches
      WHERE id = $1 AND is_active = true
      LIMIT 1
    `,
    [user.branch_id],
  );

  return result.rows;
}
