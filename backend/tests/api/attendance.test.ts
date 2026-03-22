import request from 'supertest';
import pool from '../../src/config/db.ts';
import app from '../../src/app.ts';
import { ensureTestAdminPassword } from '../helpers/test-db.ts';

async function deleteTodayAttendance(studentId: number): Promise<void> {
  await pool.query(
    `
      DELETE FROM attendance
      WHERE student_id = $1
        AND attendance_date = CURRENT_DATE
    `,
    [studentId],
  );
}

function buildStudentPayload() {
  const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-8);
  const phoneSuffix = uniqueSuffix.padStart(9, '0').slice(0, 9);

  return {
    name: `Attendance Student ${uniqueSuffix}`,
    phone: `9${phoneSuffix}`,
    email: `attendance${uniqueSuffix}@example.com`,
    study_plan: '2_hours' as const,
    branch_id: 1,
    date_of_birth: '2002-05-14',
    gender: 'male' as const,
    blood_group: 'B+',
    address: '123 Test Street',
    city: 'Bareilly',
    state: 'Uttar Pradesh',
    pincode: '243001',
    emergency_contact_name: 'Test Guardian',
    emergency_contact_phone: `8${phoneSuffix}`,
    emergency_contact_relation: 'Father',
    id_proof_type: 'Aadhar',
    id_proof_number: `123456${uniqueSuffix}`,
  };
}

describe('Attendance API', () => {
  let authToken: string;
  let studentId: number;

  beforeAll(async () => {
    await ensureTestAdminPassword();

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'superadmin@library.com',
        password: 'admin123',
      });

    authToken = loginResponse.body.token;

    const studentResponse = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${authToken}`)
      .send(buildStudentPayload());

    expect(studentResponse.status).toBe(201);
    studentId = studentResponse.body.data.id;

    await pool.query(
      `
        UPDATE students
        SET
          study_plan = '2_hours',
          monthly_fee = 250,
          daily_hours_limit = 2,
          membership_status = 'active',
          is_active = true
        WHERE id = $1
      `,
      [studentId],
    );
  });

  beforeEach(async () => {
    await deleteTodayAttendance(studentId);
  });

  afterAll(async () => {
    await deleteTodayAttendance(studentId);
    await pool.query(
      `
        UPDATE students
        SET is_active = false, membership_status = 'inactive'
        WHERE id = $1
      `,
      [studentId],
    );
  });

  it('should mark entry and reject duplicate entry for the same day', async () => {
    const entryResponse = await request(app)
      .post('/api/attendance/entry')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ student_id: studentId });

    expect(entryResponse.status).toBe(201);
    expect(entryResponse.body.success).toBe(true);

    const duplicateResponse = await request(app)
      .post('/api/attendance/entry')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ student_id: studentId });

    expect(duplicateResponse.status).toBe(400);
    expect(duplicateResponse.body.error).toContain('already marked entry');
  });

  it('should return overtime warning details in today summary', async () => {
    await request(app)
      .post('/api/attendance/entry')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ student_id: studentId });

    await pool.query(
      `
        UPDATE attendance
        SET entry_time = CURRENT_TIMESTAMP - INTERVAL '130 minutes'
        WHERE student_id = $1
          AND attendance_date = CURRENT_DATE
      `,
      [studentId],
    );

    const response = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const student = response.body.data.students_inside.find(
      (item: any) => item.student_id === studentId,
    );

    expect(student).toBeDefined();
    expect(student.allowed_minutes).toBe(120);
    expect(student.current_duration_minutes).toBeGreaterThanOrEqual(120);
    expect(student.is_overtime).toBe(true);
    expect(student.overtime_minutes).toBeGreaterThanOrEqual(10);
  });

  it('should mark exit and store the calculated duration', async () => {
    await request(app)
      .post('/api/attendance/entry')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ student_id: studentId });

    await pool.query(
      `
        UPDATE attendance
        SET entry_time = CURRENT_TIMESTAMP - INTERVAL '35 minutes'
        WHERE student_id = $1
          AND attendance_date = CURRENT_DATE
      `,
      [studentId],
    );

    const exitResponse = await request(app)
      .post('/api/attendance/exit')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ student_id: studentId });

    expect(exitResponse.status).toBe(200);
    expect(exitResponse.body.success).toBe(true);
    expect(exitResponse.body.data.duration_minutes).toBeGreaterThanOrEqual(35);
  });
});
