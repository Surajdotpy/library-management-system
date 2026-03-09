import pool from '../../config/db.js';
import type { Student, CreateStudentDTO, UpdateStudentDTO } from './students.types.js';

// ========== PRICING CONFIGURATION ==========
// Update prices here - changes automatically apply everywhere
const PRICING = {
  '2_hours': { fee: 250, limit: 2 },      // ₹250/month, 2 hours daily
  '4_hours': { fee: 350, limit: 4 },      // ₹350/month, 4 hours daily
  'unlimited': { fee: 400, limit: null }  // ₹400/month, no limit
} as const;

// Get all active students
export async function getAllStudents(): Promise<Student[]> {
  const query = `
    SELECT * FROM students
    WHERE is_active = true
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

// Get single student by ID
export async function getStudentById(id: number): Promise<Student | null> {
  const query = `
    SELECT * FROM students
    WHERE id = $1 AND is_active = true
  `;
  
  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

// Create new student
export async function createStudent(data: CreateStudentDTO): Promise<Student> {
  // Get pricing from constants - automatically matches study plan
  const pricing = PRICING[data.study_plan];
  const monthly_fee = pricing.fee;
  const daily_hours_limit = pricing.limit;
  
  const query = `
    INSERT INTO students (
      name, email, phone, date_of_birth, gender, blood_group,
      address, city, state, pincode,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      photo_url, id_proof_type, id_proof_number, id_proof_url,
      branch_id, study_plan, monthly_fee, daily_hours_limit, notes
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
    )
    RETURNING *;
  `;
  
  const values = [
    data.name,
    data.email || null,
    data.phone,
    data.date_of_birth,
    data.gender,
    data.blood_group || null,
    data.address,
    data.city,
    data.state,
    data.pincode,
    data.emergency_contact_name,
    data.emergency_contact_phone,
    data.emergency_contact_relation,
    data.photo_url || null,
    data.id_proof_type || null,
    data.id_proof_number || null,
    data.id_proof_url || null,
    data.branch_id,
    data.study_plan,
    monthly_fee,
    daily_hours_limit,
    data.notes || null
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Update existing student
export async function updateStudent(id: number, data: UpdateStudentDTO): Promise<Student | null> {
  // If study_plan is being updated, recalculate fees from constants
  let monthly_fee: number | undefined;
  let daily_hours_limit: number | null | undefined;
  
  if (data.study_plan) {
    const pricing = PRICING[data.study_plan];
    monthly_fee = pricing.fee;
    daily_hours_limit = pricing.limit;
  }
  
  const query = `
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
    RETURNING *;
  `;
  
  const values = [
    data.name, data.email, data.phone, data.date_of_birth, data.gender,
    data.blood_group, data.address, data.city, data.state, data.pincode,
    data.emergency_contact_name, data.emergency_contact_phone, data.emergency_contact_relation,
    data.photo_url, data.id_proof_type, data.id_proof_number, data.id_proof_url,
    data.study_plan, monthly_fee, daily_hours_limit, data.membership_status, data.notes,
    id
  ];
  
  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

// Delete student (soft delete - marks as inactive)
export async function deleteStudent(id: number): Promise<boolean> {
  const query = `
    UPDATE students
    SET is_active = false, membership_status = 'inactive'
    WHERE id = $1 AND is_active = true
    RETURNING *;
  `;
  
  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return false;
  }
  
  return true;
}