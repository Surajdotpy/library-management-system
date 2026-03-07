import pool from '../../config/db.js';
import type { Student, CreateStudentDTO, UpdateStudentDTO } from './students.types.js';

export async function getAllStudents(): Promise<Student[]> {
  const query = `
    SELECT * FROM students
    WHERE is_active = true
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

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

export async function createStudent(data: CreateStudentDTO): Promise<Student> {
  // Calculate monthly_fee and daily_hours_limit based on study_plan
  let monthly_fee: number;
  let daily_hours_limit: number | null;
  
  if (data.study_plan === '2_hours') {
    monthly_fee = 250;
    daily_hours_limit = 2;
  } else if (data.study_plan === '4_hours') {
    monthly_fee = 350;
    daily_hours_limit = 4;
  } else {
    monthly_fee = 400;
    daily_hours_limit = null;
  }
  
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