import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

let superadminToken = '';
let adminToken = '';

beforeAll(async () => {
  // Login as superadmin
  const superadminLogin = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'superadmin@library.com',
      password: 'admin123',
    });
  
  console.log('Superadmin login response:', JSON.stringify(superadminLogin.body, null, 2));
  
  // Try different possible response structures
  superadminToken = superadminLogin.body.data?.token 
    || superadminLogin.body.token 
    || superadminLogin.body.accessToken;

  if (!superadminToken) {
    throw new Error('Failed to get superadmin token. Response: ' + JSON.stringify(superadminLogin.body));
  }

  // Login as branch admin
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admin1@library.com',
      password: 'admin123',
    });
  
  adminToken = adminLogin.body.data?.token 
    || adminLogin.body.token 
    || adminLogin.body.accessToken;

  if (!adminToken) {
    throw new Error('Failed to get admin token');
  }
});

describe('Reports API', () => {
  describe('GET /api/reports/overview', () => {
    it('should return overview stats for superadmin', async () => {
      const response = await request(app)
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${superadminToken}`);

      console.log('Overview response:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_revenue');
      expect(response.body.data).toHaveProperty('total_students');
      expect(response.body.data).toHaveProperty('avg_occupancy');
      expect(response.body.data).toHaveProperty('growth_rate');
    });

    it('should deny access for branch admin', async () => {
      const response = await request(app)
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Superadmin access required');
    });

    it('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/reports/overview');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/reports/revenue-trend', () => {
    it('should return revenue trend for last 6 months', async () => {
      const response = await request(app)
        .get('/api/reports/revenue-trend?months=6')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/reports/student-growth', () => {
    it('should return student growth for last 6 months', async () => {
      const response = await request(app)
        .get('/api/reports/student-growth?months=6')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/reports/branch-comparison', () => {
    it('should return comparison of all branches', async () => {
      const response = await request(app)
        .get('/api/reports/branch-comparison')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('branch_name');
        expect(response.body.data[0]).toHaveProperty('total_students');
        expect(response.body.data[0]).toHaveProperty('monthly_revenue');
      }
    });
  });

  describe('GET /api/reports/attendance-patterns', () => {
    it('should return attendance patterns for last 30 days', async () => {
      const response = await request(app)
        .get('/api/reports/attendance-patterns?days=30')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});