import request from 'supertest';
import app from '../../src/app.js';
import { deleteSeatBookings, ensureTestAdminPassword, ensureTestSeat, ensureTestUser, findAvailableSeat, syncTableIdSequence, } from '../helpers/test-db.js';
function buildStudentPayload(branchId, overrides = {}) {
    const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`
        .slice(-8);
    const phoneSuffix = uniqueSuffix.padStart(9, '0').slice(0, 9);
    return {
        name: `Seat Student ${uniqueSuffix}`,
        phone: `9${phoneSuffix}`,
        email: `seatstudent${uniqueSuffix}@example.com`,
        study_plan: '2_hours',
        branch_id: branchId,
        date_of_birth: '2001-01-18',
        gender: 'male',
        blood_group: 'A+',
        address: 'Seat Test Street',
        city: 'Bareilly',
        state: 'Uttar Pradesh',
        pincode: '243001',
        emergency_contact_name: 'Seat Guardian',
        emergency_contact_phone: `8${phoneSuffix}`,
        emergency_contact_relation: 'Father',
        id_proof_type: 'aadhar',
        id_proof_number: `123456${uniqueSuffix}`,
        ...overrides,
    };
}
async function loginAs(email) {
    const response = await request(app).post('/api/auth/login').send({
        email,
        password: 'admin123',
    });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    return response.body.token;
}
describe('Seats API', () => {
    let superadminToken;
    let adminToken;
    let branchOneStudentAId;
    let branchOneStudentBId;
    let branchTwoStudentId;
    let branchOneSeatId;
    let branchOneSeatTwoId;
    let branchTwoSeatId;
    let bookingId;
    const currentDate = new Date();
    const bookingMonth = currentDate.getMonth() === 11 ? 1 : currentDate.getMonth() + 2;
    const bookingYear = currentDate.getMonth() === 11
        ? currentDate.getFullYear() + 1
        : currentDate.getFullYear();
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
        const branchOneStudentA = await request(app)
            .post('/api/students')
            .set('Authorization', `Bearer ${superadminToken}`)
            .send(buildStudentPayload(1));
        const branchOneStudentB = await request(app)
            .post('/api/students')
            .set('Authorization', `Bearer ${superadminToken}`)
            .send(buildStudentPayload(1));
        const branchTwoStudent = await request(app)
            .post('/api/students')
            .set('Authorization', `Bearer ${superadminToken}`)
            .send(buildStudentPayload(2));
        expect(branchOneStudentA.status).toBe(201);
        expect(branchOneStudentB.status).toBe(201);
        expect(branchTwoStudent.status).toBe(201);
        branchOneStudentAId = branchOneStudentA.body.data.id;
        branchOneStudentBId = branchOneStudentB.body.data.id;
        branchTwoStudentId = branchTwoStudent.body.data.id;
        await deleteSeatBookings(branchOneStudentAId, bookingMonth, bookingYear);
        await deleteSeatBookings(branchOneStudentBId, bookingMonth, bookingYear);
        await deleteSeatBookings(branchTwoStudentId, bookingMonth, bookingYear);
        await ensureTestSeat(1, 'TEST-B1-001');
        await ensureTestSeat(1, 'TEST-B1-002');
        await ensureTestSeat(2, 'TEST-B2-001');
        const branchOneSeat = await findAvailableSeat(1, bookingMonth, bookingYear);
        const branchOneSeatTwo = await findAvailableSeat(1, bookingMonth, bookingYear, [
            branchOneSeat.id,
        ]);
        const branchTwoSeat = await findAvailableSeat(2, bookingMonth, bookingYear);
        branchOneSeatId = branchOneSeat.id;
        branchOneSeatTwoId = branchOneSeatTwo.id;
        branchTwoSeatId = branchTwoSeat.id;
    });
    it('should block branch admins from requesting another branch seat list', async () => {
        const response = await request(app)
            .get(`/api/seats?branch_id=2&month=${bookingMonth}&year=${bookingYear}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('You can only access your assigned branch');
    });
    it('should create a seat booking for the selected month', async () => {
        const response = await request(app)
            .post('/api/seats/bookings')
            .set('Authorization', `Bearer ${superadminToken}`)
            .send({
            seat_id: branchOneSeatId,
            student_id: branchOneStudentAId,
            booking_month: bookingMonth,
            booking_year: bookingYear,
            notes: 'Reserved for next month',
        });
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.seat_id).toBe(branchOneSeatId);
        expect(response.body.data.student_id).toBe(branchOneStudentAId);
        expect(response.body.data.status).toBe('reserved');
        bookingId = response.body.data.id;
    });
    it('should reject booking the same seat twice in the same month', async () => {
        const response = await request(app)
            .post('/api/seats/bookings')
            .set('Authorization', `Bearer ${superadminToken}`)
            .send({
            seat_id: branchOneSeatId,
            student_id: branchOneStudentBId,
            booking_month: bookingMonth,
            booking_year: bookingYear,
        });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('already booked');
    });
    it('should reject assigning two seats to the same student in the same month', async () => {
        const response = await request(app)
            .post('/api/seats/bookings')
            .set('Authorization', `Bearer ${superadminToken}`)
            .send({
            seat_id: branchOneSeatTwoId,
            student_id: branchOneStudentAId,
            booking_month: bookingMonth,
            booking_year: bookingYear,
        });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('already has a seat booking');
    });
    it('should exclude already-booked students from the eligible student list', async () => {
        const response = await request(app)
            .get(`/api/seats/eligible-students?branch_id=1&month=${bookingMonth}&year=${bookingYear}`)
            .set('Authorization', `Bearer ${superadminToken}`);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.some((student) => student.id === branchOneStudentAId)).toBe(false);
        expect(response.body.data.some((student) => student.id === branchOneStudentBId)).toBe(true);
    });
    it('should show the selected branch seat as booked for the requested month', async () => {
        const response = await request(app)
            .get(`/api/seats?branch_id=1&month=${bookingMonth}&year=${bookingYear}`)
            .set('Authorization', `Bearer ${superadminToken}`);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        const bookedSeat = response.body.data.find((seat) => seat.id === branchOneSeatId);
        expect(bookedSeat).toBeDefined();
        expect(bookedSeat.availability_status).toBe('booked');
        expect(bookedSeat.booked_student_id).toBe(branchOneStudentAId);
    });
    it('should create a booking for another branch as superadmin', async () => {
        const response = await request(app)
            .post('/api/seats/bookings')
            .set('Authorization', `Bearer ${superadminToken}`)
            .send({
            seat_id: branchTwoSeatId,
            student_id: branchTwoStudentId,
            booking_month: bookingMonth,
            booking_year: bookingYear,
        });
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.branch_id).toBe(2);
    });
    it('should release an existing booking and make the seat available again', async () => {
        const releaseResponse = await request(app)
            .patch(`/api/seats/bookings/${bookingId}/release`)
            .set('Authorization', `Bearer ${superadminToken}`)
            .send({
            release_reason: 'Student changed branch',
        });
        expect(releaseResponse.status).toBe(200);
        expect(releaseResponse.body.success).toBe(true);
        expect(releaseResponse.body.data.status).toBe('cancelled');
        const seatsResponse = await request(app)
            .get(`/api/seats?branch_id=1&month=${bookingMonth}&year=${bookingYear}`)
            .set('Authorization', `Bearer ${superadminToken}`);
        const releasedSeat = seatsResponse.body.data.find((seat) => seat.id === branchOneSeatId);
        expect(releasedSeat.availability_status).toBe('available');
        expect(releasedSeat.booking_id).toBeNull();
    });
});
//# sourceMappingURL=seats.test.js.map