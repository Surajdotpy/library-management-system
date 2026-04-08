import type { PoolClient } from 'pg';
import pool from '../../config/db.ts';
import type { Student, CreateStudentDTO, UpdateStudentDTO } from './students.types.ts';

// ========== PRICING CONFIGURATION ==========
// Update prices here - changes automatically apply everywhere
const PRICING = {
  '2_hours': { fee: 250, limit: 2 },
  '4_hours': { fee: 350, limit: 4 },
  unlimited: { fee: 400, limit: null },
} as const;

function parseStudentSequence(studentId: string | undefined): number {
  if (!studentId) {
    return 0;
  }

  const sequence = studentId.split('-').at(-1);
  const parsedSequence = Number.parseInt(sequence ?? '', 10);

  return Number.isNaN(parsedSequence) ? 0 : parsedSequence;
}

async function generateStudentId(
  client: PoolClient,
  branchId: number,
): Promise<string> {
  const result = await client.query<{ student_id: string }>(
    `
      SELECT student_id
      FROM students
      WHERE branch_id = $1
      ORDER BY id DESC
      LIMIT 1
    `,
    [branchId],
  );

  const lastStudentId = result.rows[0]?.student_id;
  const nextSequence = parseStudentSequence(lastStudentId) + 1;

  return `LIB-B${branchId}-${String(nextSequence).padStart(3, '0')}`;
}

// Get students, optionally including inactive records
export async function getAllStudents(
  branchId?: number,
  includeInactive: boolean = false,
  search?: string,
  limit?: number,
): Promise<Student[]> {
  const values: Array<number | string> = [];
  let query = `
    SELECT *
    FROM students
    WHERE 1 = 1
  `;

  if (!includeInactive) {
    query += ' AND is_active = true';
  }

  if (branchId !== undefined && branchId !== null) {
    values.push(branchId);
    query += ` AND branch_id = $${values.length}`;
  }

  if (search?.trim()) {
    values.push(`%${search.trim().toLowerCase()}%`);
    query += `
      AND (
        LOWER(name) LIKE $${values.length}
        OR LOWER(student_id) LIKE $${values.length}
        OR phone LIKE $${values.length}
        OR LOWER(COALESCE(email, '')) LIKE $${values.length}
        OR LOWER(city) LIKE $${values.length}
        OR LOWER(COALESCE(id_proof_number, '')) LIKE $${values.length}
      )
    `;
    query += ' ORDER BY is_active DESC, name ASC, created_at DESC';
  } else {
    query += ' ORDER BY created_at DESC';
  }

  if (limit != null) {
    values.push(limit);
    query += ` LIMIT $${values.length}`;
  }

  const result = await pool.query(query, values);
  return result.rows;
}

// Get single student by ID
export async function getStudentById(
  id: number,
  branchId?: number,
): Promise<Student | null> {
  const values: number[] = [id];
  let query = `
    SELECT *
    FROM students
    WHERE id = $1 AND is_active = true
  `;

  if (branchId !== undefined && branchId !== null) {
    values.push(branchId);
    query += ` AND branch_id = $${values.length}`;
  }

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// Create new student
export async function createStudent(data: CreateStudentDTO): Promise<Student> {
  const pricing = PRICING[data.study_plan];
  const fee = pricing.fee;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('students', 'id'),
        COALESCE((SELECT MAX(id) FROM students), 0) + 1,
        false
      )
    `);
    await client.query('LOCK TABLE students IN SHARE ROW EXCLUSIVE MODE');

    const studentId = await generateStudentId(client, data.branch_id);
    const result = await client.query<Student>(
      `INSERT INTO students (
        student_id, name, email, phone,
        date_of_birth, gender, blood_group,
        address, city, state, pincode,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        id_proof_type, id_proof_number,
        branch_id, study_plan,
        registration_date, membership_status, monthly_fee, is_active
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16,
        $17, $18,
        CURRENT_DATE, 'active', $19, true
      ) RETURNING *`,
      [
        studentId,
        data.name,
        data.email ?? null,
        data.phone,
        data.date_of_birth,
        data.gender,
        data.blood_group ?? null,
        data.address,
        data.city,
        data.state,
        data.pincode,
        data.emergency_contact_name,
        data.emergency_contact_phone,
        data.emergency_contact_relation,
        data.id_proof_type ?? null,
        data.id_proof_number ?? null,
        data.branch_id,
        data.study_plan,
        fee,
      ],
    );

    const createdStudent = result.rows[0];

    if (!createdStudent) {
      throw new Error('Student record was not returned after creation');
    }

    await client.query('COMMIT');
    return createdStudent;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Update existing student
export async function updateStudent(
  id: number,
  data: UpdateStudentDTO,
  branchId?: number,
): Promise<Student | null> {
  let monthlyFee: number | undefined;
  let dailyHoursLimit: number | null | undefined;

  if (data.study_plan) {
    const pricing = PRICING[data.study_plan];
    monthlyFee = pricing.fee;
    dailyHoursLimit = pricing.limit;
  }

  let query = `
    UPDATE students
    SET
      name = COALESCE($1, name),
      email = COALESCE($2, email),
      phone = COALESCE($3, phone),
      date_of_birth = COALESCE($4, date_of_birth),
      gender = COALESCE($5, gender),
      blood_group = COALESCE($6, blood_group),
      address = COALESCE($7, address),
      city = COALESCE($8, city),
      state = COALESCE($9, state),
      pincode = COALESCE($10, pincode),
      emergency_contact_name = COALESCE($11, emergency_contact_name),
      emergency_contact_phone = COALESCE($12, emergency_contact_phone),
      emergency_contact_relation = COALESCE($13, emergency_contact_relation),
      photo_url = COALESCE($14, photo_url),
      id_proof_type = COALESCE($15, id_proof_type),
      id_proof_number = COALESCE($16, id_proof_number),
      id_proof_url = COALESCE($17, id_proof_url),
      study_plan = COALESCE($18, study_plan),
      monthly_fee = COALESCE($19, monthly_fee),
      daily_hours_limit = COALESCE($20, daily_hours_limit),
      membership_status = COALESCE($21, membership_status),
      notes = COALESCE($22, notes)
    WHERE id = $23 AND is_active = true
  `;

  const values = [
    data.name,
    data.email,
    data.phone,
    data.date_of_birth,
    data.gender,
    data.blood_group,
    data.address,
    data.city,
    data.state,
    data.pincode,
    data.emergency_contact_name,
    data.emergency_contact_phone,
    data.emergency_contact_relation,
    data.photo_url,
    data.id_proof_type,
    data.id_proof_number,
    data.id_proof_url,
    data.study_plan,
    monthlyFee,
    dailyHoursLimit,
    data.membership_status,
    data.notes,
    id,
  ];

  if (branchId != null) {
    values.push(branchId);
    query += ` AND branch_id = $${values.length}`;
  }

  query += ' RETURNING *;';

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// Delete student (soft delete - marks as inactive)
export async function deleteStudent(
  id: number,
  branchId?: number,
): Promise<boolean> {
  const values: number[] = [id];
  let query = `
    UPDATE students
    SET is_active = false, membership_status = 'inactive'
    WHERE id = $1 AND is_active = true
  `;

  if (branchId != null) {
    values.push(branchId);
    query += ` AND branch_id = $${values.length}`;
  }

  query += ' RETURNING *;';

  const result = await pool.query(query, values);
  return result.rows.length > 0;
}

// Reactivate student (undo soft delete)
export async function reactivateStudent(
  id: number,
  branchId?: number,
): Promise<Student | null> {
  const values: number[] = [id];
  let query = `
    UPDATE students
    SET is_active = true, membership_status = 'active'
    WHERE id = $1 AND is_active = false
  `;

  if (branchId != null) {
    values.push(branchId);
    query += ` AND branch_id = $${values.length}`;
  }

  query += ' RETURNING *;';

  const result = await pool.query(query, values);
  return result.rows[0] ?? null;
}
