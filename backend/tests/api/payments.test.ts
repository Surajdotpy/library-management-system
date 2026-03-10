import request from 'supertest';
import app from '../../src/app.js';

describe('Payments API', () => {
  let authToken: string;

  // Login before all tests
  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'superadmin@library.com',
        password: 'admin123'
      });

    authToken = loginResponse.body.token;
  });

  describe('POST /api/payments', () => {
    it('should record payment with valid data', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          student_id: 1,
          amount: 250,
          fee_month: 5,
          fee_year: 2026,
          transaction_id: 'TEST-UPI-001'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.receipt_number).toMatch(/^REC-/);
    });

    it('should reject duplicate payment', async () => {
      // Try to record same month again
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          student_id: 1,
          amount: 250,
          fee_month: 5,
          fee_year: 2026,
          transaction_id: 'TEST-UPI-002'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already recorded');
    });

    it('should reject wrong amount', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          student_id: 1,
          amount: 999,
          fee_month: 6,
          fee_year: 2026
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Amount mismatch');
    });

    it('should reject missing fields', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          student_id: 1
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required fields');
    });
  });

  describe('GET /api/payments/student/:studentId', () => {
    it('should get student payment history', async () => {
      const response = await request(app)
        .get('/api/payments/student/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject invalid student ID', async () => {
      const response = await request(app)
        .get('/api/payments/student/abc')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payments/pending', () => {
    it('should get pending payments list', async () => {
      const response = await request(app)
        .get('/api/payments/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/payments/revenue/:month/:year', () => {
    it('should get monthly revenue report', async () => {
      const response = await request(app)
        .get('/api/payments/revenue/5/2026')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.month).toBe(5);
      expect(response.body.data.year).toBe(2026);
    });
  });
});