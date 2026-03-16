import request from 'supertest';
import app from '../../src/app.js';
import { ensureTestAdminPassword, ensureTestUser } from '../helpers/test-db.js';
async function loginAs(email) {
    const response = await request(app).post('/api/auth/login').send({
        email,
        password: 'admin123',
    });
    expect(response.status).toBe(200);
    return response.body.token;
}
describe('Dashboard API', () => {
    let superadminToken;
    let adminToken;
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
    it('should return global dashboard summary for superadmin', async () => {
        const response = await request(app)
            .get('/api/dashboard/summary')
            .set('Authorization', `Bearer ${superadminToken}`);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.scope).toBe('global');
        expect(response.body.data.branch).toBeNull();
        expect(Array.isArray(response.body.data.branch_overview)).toBe(true);
        expect(response.body.data.stats).toHaveProperty('total_students');
        expect(response.body.data.stats).toHaveProperty('monthly_revenue');
    });
    it('should return branch-scoped dashboard summary for admins', async () => {
        const response = await request(app)
            .get('/api/dashboard/summary')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.scope).toBe('branch');
        expect(response.body.data.branch.id).toBe(1);
        expect(response.body.data.branch_overview).toBeUndefined();
    });
    it('should block admins from requesting another branch summary', async () => {
        const response = await request(app)
            .get('/api/dashboard/summary?branch_id=2')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('You can only access your assigned branch');
    });
});
//# sourceMappingURL=dashboard.test.js.map