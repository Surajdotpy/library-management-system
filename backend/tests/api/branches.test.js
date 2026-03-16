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
describe('Branches API', () => {
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
    it('should return all active branches for superadmin', async () => {
        const response = await request(app)
            .get('/api/branches')
            .set('Authorization', `Bearer ${superadminToken}`);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(4);
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
//# sourceMappingURL=branches.test.js.map