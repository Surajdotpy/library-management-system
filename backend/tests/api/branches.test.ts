import request from 'supertest';
import app from '../../src/app.ts';
import { ensureTestAdminPassword, ensureTestUser } from '../helpers/test-db.ts';

async function loginAs(email: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({
    email,
    password: 'admin123',
  });

  expect(response.status).toBe(200);
  return response.body.token as string;
}

describe('Branches API', () => {
  let superadminToken: string;
  let adminToken: string;

  beforeAll(async () => {
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

  it('should return all active branches for superadmin', async () => {
    const response = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${superadminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((branch: { is_active: boolean }) => branch.is_active)).toBe(true);
  });

  it('should return only the assigned branch for an admin', async () => {
    const response = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(1);
  });
});
