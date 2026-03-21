import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import pool from '../../src/config/db.ts';
import app from '../../src/app.ts';
import {
  ensureTestAdminPassword,
  ensureTestUser,
  syncTableIdSequence,
} from '../helpers/test-db.ts';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

type OverviewStats = {
  total_revenue: number;
  total_students: number;
  avg_occupancy: number;
  growth_rate: number;
};

type RevenueTrendPoint = {
  month: string;
  revenue: number;
};

type StudentGrowthPoint = {
  month: string;
  students: number;
};

type BranchComparisonRow = {
  branch_id: number;
  branch_name: string;
  branch_code: string;
  total_students: number;
  active_students: number;
  monthly_revenue: number;
  total_capacity: number;
  currently_inside: number;
  occupancy_rate: string;
};

type AttendancePattern = {
  date: string;
  unique_students: number;
  total_entries: number;
};

type StudentPayload = {
  name: string;
  phone: string;
  email: string;
  study_plan: '2_hours';
  branch_id: number;
  date_of_birth: string;
  gender: 'male';
  blood_group: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  id_proof_type: string;
  id_proof_number: string;
};

let superadminToken = '';
let adminToken = '';
const fixtureStudentIds: number[] = [];

function toNumber(value: unknown): number {
  return Number.parseFloat(String(value ?? 0));
}

function toInteger(value: unknown): number {
  return Number.parseInt(String(value ?? 0), 10);
}

function roundToTwoDecimals(value: number): number {
  return Number(value.toFixed(2));
}

function calculateGrowthRate(currentCount: number, previousCount: number): number {
  if (previousCount === 0) {
    return currentCount === 0 ? 0 : 100;
  }

  return roundToTwoDecimals(((currentCount - previousCount) / previousCount) * 100);
}

function extractToken(body: Record<string, any>): string {
  return body.data?.token ?? body.token ?? body.accessToken ?? body.data?.accessToken ?? '';
}

function getMonthKeys(months: number): string[] {
  const keys: string[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCMonth(cursor.getUTCMonth() - (months - 1));

  for (let index = 0; index < months; index += 1) {
    keys.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`,
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return keys;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map((value) => Number.parseInt(value, 10));
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function buildStudentPayload(overrides: Partial<StudentPayload> = {}): StudentPayload {
  const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`
    .slice(-8);
  const phoneSuffix = uniqueSuffix.padStart(9, '0').slice(0, 9);

  return {
    name: `Report Student ${uniqueSuffix}`,
    phone: `9${phoneSuffix}`,
    email: `reports-${uniqueSuffix}@example.com`,
    study_plan: '2_hours',
    branch_id: 1,
    date_of_birth: '2002-05-14',
    gender: 'male',
    blood_group: 'B+',
    address: '123 Test Street',
    city: 'Bareilly',
    state: 'Uttar Pradesh',
    pincode: '243001',
    emergency_contact_name: 'Test Guardian',
    emergency_contact_phone: `8${phoneSuffix}`,
    emergency_contact_relation: 'Father',
    id_proof_type: 'Aadhar',
    id_proof_number: `RPT${uniqueSuffix}`,
    ...overrides,
  };
}

async function loginAs(email: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({
    email,
    password: 'admin123',
  });

  expect(response.status).toBe(200);

  const token = extractToken(response.body);
  expect(token).toBeTruthy();
  return token;
}

async function createStudent(
  authToken: string,
  overrides: Partial<StudentPayload> = {},
): Promise<number> {
  const response = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${authToken}`)
    .send(buildStudentPayload(overrides));

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);

  const studentId = response.body.data?.id as number | undefined;
  expect(studentId).toBeDefined();

  fixtureStudentIds.push(studentId as number);
  return studentId as number;
}

async function recordPayment(authToken: string, studentId: number): Promise<void> {
  const currentDate = new Date();
  const response = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      student_id: studentId,
      amount: 250,
      fee_month: currentDate.getMonth() + 1,
      fee_year: currentDate.getFullYear(),
      transaction_id: `REPORT-${studentId}`,
    });

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
}

async function markAttendanceEntry(authToken: string, studentId: number): Promise<void> {
  const response = await request(app)
    .post('/api/attendance/entry')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ student_id: studentId });

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
}

async function getExpectedOverview(): Promise<OverviewStats> {
  const [revenueResult, studentsResult, occupancyResult, growthCountsResult] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_revenue
       FROM fee_payments
       WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
         AND payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
         AND status = 'paid'`,
    ),
    pool.query(`SELECT COUNT(*) AS total_students FROM students WHERE is_active = true`),
    pool.query(
      `SELECT
         COALESCE(capacity.total_capacity, 0) AS total_capacity,
         COALESCE(attendance.currently_inside, 0) AS currently_inside
       FROM (
         SELECT COALESCE(SUM(total_capacity), 0) AS total_capacity
         FROM branches
         WHERE is_active = true
       ) capacity
       CROSS JOIN (
         SELECT COUNT(DISTINCT a.student_id) AS currently_inside
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         JOIN branches b ON b.id = s.branch_id
         WHERE a.attendance_date = CURRENT_DATE
           AND a.entry_time IS NOT NULL
           AND a.exit_time IS NULL
           AND s.is_active = true
           AND b.is_active = true
       ) attendance`,
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
             AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
         ) AS current_month_count,
         COUNT(*) FILTER (
           WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
             AND created_at < DATE_TRUNC('month', CURRENT_DATE)
         ) AS previous_month_count
       FROM students`,
    ),
  ]);

  const totalCapacity = toInteger(occupancyResult.rows[0]?.total_capacity);
  const currentlyInside = toInteger(occupancyResult.rows[0]?.currently_inside);
  const avgOccupancy =
    totalCapacity > 0
      ? roundToTwoDecimals((currentlyInside / totalCapacity) * 100)
      : 0;

  const currentMonthCount = toInteger(growthCountsResult.rows[0]?.current_month_count);
  const previousMonthCount = toInteger(growthCountsResult.rows[0]?.previous_month_count);

  return {
    total_revenue: toNumber(revenueResult.rows[0]?.total_revenue),
    total_students: toInteger(studentsResult.rows[0]?.total_students),
    avg_occupancy: avgOccupancy,
    growth_rate: calculateGrowthRate(currentMonthCount, previousMonthCount),
  };
}

async function getExpectedRevenueTrend(months: number): Promise<RevenueTrendPoint[]> {
  const result = await pool.query(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', payment_date), 'YYYY-MM') AS month_key,
       COALESCE(SUM(amount), 0) AS revenue
     FROM fee_payments
     WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE) - (($1::int - 1) * INTERVAL '1 month')
       AND payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
       AND status = 'paid'
     GROUP BY DATE_TRUNC('month', payment_date)
     ORDER BY DATE_TRUNC('month', payment_date)`,
    [months],
  );

  const revenueByMonth = new Map<string, number>(
    result.rows.map((row) => [row.month_key as string, toNumber(row.revenue)]),
  );

  return getMonthKeys(months).map((monthKey) => ({
    month: formatMonthLabel(monthKey),
    revenue: revenueByMonth.get(monthKey) ?? 0,
  }));
}

async function getExpectedStudentGrowth(months: number): Promise<StudentGrowthPoint[]> {
  const result = await pool.query(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
       COUNT(*) AS students
     FROM students
     WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - (($1::int - 1) * INTERVAL '1 month')
       AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY DATE_TRUNC('month', created_at)`,
    [months],
  );

  const studentsByMonth = new Map<string, number>(
    result.rows.map((row) => [row.month_key as string, toInteger(row.students)]),
  );

  return getMonthKeys(months).map((monthKey) => ({
    month: formatMonthLabel(monthKey),
    students: studentsByMonth.get(monthKey) ?? 0,
  }));
}

async function getExpectedBranchOneComparison(): Promise<BranchComparisonRow> {
  const [branchResult, studentStatsResult, revenueStatsResult, attendanceStatsResult] =
    await Promise.all([
      pool.query(
        `SELECT id, name, code, COALESCE(total_capacity, 0) AS total_capacity
         FROM branches
         WHERE id = 1 AND is_active = true
         LIMIT 1`,
      ),
      pool.query(
        `SELECT
           COUNT(*) AS total_students,
           COUNT(*) FILTER (WHERE is_active = true) AS active_students
         FROM students
         WHERE branch_id = 1`,
      ),
      pool.query(
        `SELECT COALESCE(SUM(p.amount), 0) AS monthly_revenue
         FROM fee_payments p
         JOIN students s ON s.id = p.student_id
         WHERE s.branch_id = 1
           AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
           AND p.payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
           AND p.status = 'paid'`,
      ),
      pool.query(
        `SELECT COUNT(DISTINCT a.student_id) AS currently_inside
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         WHERE s.branch_id = 1
           AND a.attendance_date = CURRENT_DATE
           AND a.entry_time IS NOT NULL
           AND a.exit_time IS NULL`,
      ),
    ]);

  const branch = branchResult.rows[0];
  expect(branch).toBeDefined();

  const totalCapacity = toInteger(branch.total_capacity);
  const currentlyInside = toInteger(attendanceStatsResult.rows[0]?.currently_inside);

  return {
    branch_id: toInteger(branch.id),
    branch_name: branch.name as string,
    branch_code: branch.code as string,
    total_students: toInteger(studentStatsResult.rows[0]?.total_students),
    active_students: toInteger(studentStatsResult.rows[0]?.active_students),
    monthly_revenue: toNumber(revenueStatsResult.rows[0]?.monthly_revenue),
    total_capacity: totalCapacity,
    currently_inside: currentlyInside,
    occupancy_rate:
      totalCapacity > 0
        ? ((currentlyInside / totalCapacity) * 100).toFixed(2)
        : '0',
  };
}

async function getActiveBranchCount(): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) AS branch_count FROM branches WHERE is_active = true`,
  );

  return toInteger(result.rows[0]?.branch_count);
}

async function getExpectedTodayAttendancePattern(): Promise<AttendancePattern> {
  const result = await pool.query(
    `SELECT
       TO_CHAR(CURRENT_DATE, 'DD Mon') AS date_label,
       COUNT(DISTINCT student_id) AS unique_students,
       COUNT(*) FILTER (WHERE entry_time IS NOT NULL) AS total_entries
     FROM attendance
     WHERE attendance_date = CURRENT_DATE`,
  );

  return {
    date: result.rows[0]?.date_label as string,
    unique_students: toInteger(result.rows[0]?.unique_students),
    total_entries: toInteger(result.rows[0]?.total_entries),
  };
}

async function cleanupFixtures(): Promise<void> {
  if (fixtureStudentIds.length === 0) {
    return;
  }

  await pool.query(
    'DELETE FROM attendance WHERE student_id = ANY($1::int[])',
    [fixtureStudentIds],
  );
  await pool.query(
    'DELETE FROM fee_payments WHERE student_id = ANY($1::int[])',
    [fixtureStudentIds],
  );
  await pool.query(
    'DELETE FROM students WHERE id = ANY($1::int[])',
    [fixtureStudentIds],
  );

  fixtureStudentIds.length = 0;

  await syncTableIdSequence('fee_payments');
  await syncTableIdSequence('students');
}

beforeAll(async () => {
  await ensureTestAdminPassword('superadmin@library.com', 'admin123');
  await ensureTestUser({
    email: 'admin1@library.com',
    password: 'admin123',
    role: 'admin',
    branchId: 1,
    name: 'admin1',
    realName: 'Branch Admin 1',
  });

  superadminToken = await loginAs('superadmin@library.com');
  adminToken = await loginAs('admin1@library.com');

  const currentStudentId = await createStudent(adminToken);
  const previousMonthStudentId = await createStudent(adminToken);

  await pool.query(
    `UPDATE students
     SET created_at = DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '15 days'
     WHERE id = $1`,
    [previousMonthStudentId],
  );

  await recordPayment(adminToken, currentStudentId);
  await markAttendanceEntry(adminToken, currentStudentId);
});

afterAll(async () => {
  await cleanupFixtures();
});

describe('Reports API', () => {
  describe('GET /api/reports/overview', () => {
    it('should return overview stats that match the database', async () => {
      const response = await request(app)
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${superadminToken}`);

      const expectedOverview = await getExpectedOverview();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expectedOverview);
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
    it('should return revenue trend values that match the database', async () => {
      const months = 3;
      const response = await request(app)
        .get(`/api/reports/revenue-trend?months=${months}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      const expectedTrend = await getExpectedRevenueTrend(months);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expectedTrend);
    });
  });

  describe('GET /api/reports/student-growth', () => {
    it('should return student growth values that match the database', async () => {
      const months = 3;
      const response = await request(app)
        .get(`/api/reports/student-growth?months=${months}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      const expectedGrowth = await getExpectedStudentGrowth(months);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expectedGrowth);
    });
  });

  describe('GET /api/reports/branch-comparison', () => {
    it('should return branch comparison values that match the database', async () => {
      const response = await request(app)
        .get('/api/reports/branch-comparison')
        .set('Authorization', `Bearer ${superadminToken}`);

      const expectedBranchOne = await getExpectedBranchOneComparison();
      const expectedBranchCount = await getActiveBranchCount();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(expectedBranchCount);

      const branchOne = response.body.data.find(
        (branch: BranchComparisonRow) => branch.branch_id === 1,
      );

      expect(branchOne).toEqual(expectedBranchOne);
    });
  });

  describe('GET /api/reports/attendance-patterns', () => {
    it('should return today attendance counts that match the database', async () => {
      const response = await request(app)
        .get('/api/reports/attendance-patterns?days=30')
        .set('Authorization', `Bearer ${superadminToken}`);

      const expectedTodayPattern = await getExpectedTodayAttendancePattern();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      const todayPattern = response.body.data.find(
        (pattern: AttendancePattern) => pattern.date === expectedTodayPattern.date,
      );

      expect(todayPattern).toEqual(expectedTodayPattern);
    });
  });
});
