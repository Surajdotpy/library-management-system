import request from 'supertest';
import app from '../../src/app.js';
import { ensureTestAdminPassword, ensureTestUser } from '../helpers/test-db.js';

async function loginAs(email: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({
    email,
    password: 'admin123',
  });

  expect(response.status).toBe(200);
  return response.body.token as string;
}

describe('Users API', () => {
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

  it('should list admins for superadmin', async () => {
    const response = await request(app)
      .get('/api/users/admins')
      .set('Authorization', `Bearer ${superadminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.some((admin: { email: string }) => admin.email === 'admin1@library.com')).toBe(true);
  });

  it('should create a branch admin for superadmin', async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);
    const response = await request(app)
      .post('/api/users/admins')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        name: `admin-${uniqueSuffix}`,
        email: `newadmin${uniqueSuffix}@library.com`,
        password: 'admin123',
        branch_id: 1,
        real_name: 'New Admin 1',
        personal_phone: '9876543210',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.branch_id).toBe(1);
    expect(response.body.data.email).toContain('newadmin');
  });

  it('should forbid branch admins from managing admins', async () => {
    const response = await request(app)
      .get('/api/users/admins')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
