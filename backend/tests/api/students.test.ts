import request from 'supertest';
import app from '../../src/app.js';
import {
  ensureTestAdminPassword,
  ensureTestUser,
  syncTableIdSequence,
} from '../helpers/test-db.js';

function buildStudentPayload(overrides: Record<string, unknown> = {}) {
  const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`
    .slice(-8);
  const phoneSuffix = uniqueSuffix.padStart(9, '0').slice(0, 9);

  return {
    name: `Test Student ${uniqueSuffix}`,
    phone: `9${phoneSuffix}`,
    email: `student${uniqueSuffix}@example.com`,
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
    ...overrides,
  };
}

async function loginAs(email: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({
    email,
    password: 'admin123',
  });

  expect(response.status).toBe(200);
  expect(response.body.token).toBeDefined();

  return response.body.token as string;
}

describe('Students API', () => {
  let superadminToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await syncTableIdSequence('students');
    await ensureTestAdminPassword();
    await ensureTestUser({
      email: 'admin1@library.com',
      role: 'admin',
      branchId: 1,
      realName: 'Branch Admin 1',
    });

    superadminToken = await loginAs('superadmin@library.com');
    adminToken = await loginAs('admin1@library.com');
  });

  describe('POST /api/students', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/students')
        .send(buildStudentPayload());

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should create a student with valid data for a superadmin', async () => {
      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(buildStudentPayload());

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Student created successfully');
      expect(response.body.data.name).toMatch(/^Test Student/);
      expect(response.body.data.student_id).toMatch(/^LIB-B1-\d{3,}$/);
      expect(response.body.data.study_plan).toBe('2_hours');
      expect(response.body.data.membership_status).toBe('active');
      expect(response.body.data.is_active).toBe(true);
    });

    it('should reject invalid phone numbers', async () => {
      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          ...buildStudentPayload(),
          phone: '12345',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Phone must be 10 digits');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          ...buildStudentPayload(),
          address: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Address is required');
    });

    it('should prevent branch admins from creating students in another branch', async () => {
      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildStudentPayload({ branch_id: 2 }));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You can only access your assigned branch');
    });
  });

  describe('GET /api/students', () => {
    it('should scope branch admins to their assigned branch', async () => {
      await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(buildStudentPayload({ branch_id: 2 }));

      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.every(
          (student: { branch_id: number }) => student.branch_id === 1,
        ),
      ).toBe(true);
    });
  });
});
