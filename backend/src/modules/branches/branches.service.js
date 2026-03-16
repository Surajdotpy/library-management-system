import pool from '../../config/db.js';
export async function getAccessibleBranches(user) {
    if (user.role === 'superadmin') {
        const result = await pool.query(`
        SELECT *
        FROM branches
        WHERE is_active = true
        ORDER BY id
      `);
        return result.rows;
    }
    if (user.branch_id == null) {
        return [];
    }
    const result = await pool.query(`
      SELECT *
      FROM branches
      WHERE id = $1 AND is_active = true
      LIMIT 1
    `, [user.branch_id]);
    return result.rows;
}
//# sourceMappingURL=branches.service.js.map