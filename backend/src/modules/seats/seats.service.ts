import type { PoolClient } from 'pg';
import pool from '../../config/db.js';
import type {
  CreateSeatBookingDTO,
  ReleaseSeatBookingDTO,
  SeatAvailabilityStatus,
  SeatBooking,
  SeatBookingStatus,
  SeatEligibleStudent,
  SeatQueryFilters,
  SeatSnapshot,
} from './seats.types.js';

type QueryExecutor = Pick<PoolClient, 'query'> | typeof pool;

function getCurrentPeriod(): { month: number; year: number } {
  const currentDate = new Date();

  return {
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  };
}

function getPeriodComparison(month: number, year: number): number {
  const { month: currentMonth, year: currentYear } = getCurrentPeriod();
  return year * 12 + month - (currentYear * 12 + currentMonth);
}

function getPeriodRange(
  month: number,
  year: number,
): { startDate: string; endDate: string } {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
  };
}

async function expireOutdatedBookings(queryExecutor: QueryExecutor): Promise<void> {
  const { month, year } = getCurrentPeriod();

  await queryExecutor.query(
    `
      UPDATE seat_bookings
      SET status = 'expired'
      WHERE status IN ('reserved', 'active')
        AND (
          booking_year < $1
          OR (booking_year = $1 AND booking_month < $2)
        )
    `,
    [year, month],
  );
}

async function getSeatBookingById(
  queryExecutor: QueryExecutor,
  bookingId: number,
): Promise<SeatBooking | null> {
  const result = await queryExecutor.query<SeatBooking>(
    `
      SELECT
        sb.id,
        sb.seat_id,
        s.seat_number,
        s.section,
        s.floor_name,
        sb.student_id,
        st.name AS student_name,
        st.student_id AS student_code,
        sb.branch_id,
        b.name AS branch_name,
        sb.booking_month,
        sb.booking_year,
        sb.status,
        sb.start_date,
        sb.end_date,
        sb.assigned_by,
        creator.real_name AS assigned_by_name,
        sb.released_by,
        releaser.real_name AS released_by_name,
        sb.assigned_at,
        sb.released_at,
        sb.release_reason,
        sb.notes,
        sb.created_at,
        sb.updated_at
      FROM seat_bookings sb
      JOIN seats s ON s.id = sb.seat_id
      JOIN students st ON st.id = sb.student_id
      JOIN branches b ON b.id = sb.branch_id
      LEFT JOIN users creator ON creator.id = sb.assigned_by
      LEFT JOIN users releaser ON releaser.id = sb.released_by
      WHERE sb.id = $1
      LIMIT 1
    `,
    [bookingId],
  );

  return result.rows[0] ?? null;
}

export async function getSeats(filters: SeatQueryFilters): Promise<SeatSnapshot[]> {
  await expireOutdatedBookings(pool);

  const params: Array<number | string> = [filters.booking_month, filters.booking_year];
  let query = `
    WITH month_bookings AS (
      SELECT
        sb.*,
        ROW_NUMBER() OVER (
          PARTITION BY sb.seat_id
          ORDER BY
            CASE sb.status
              WHEN 'active' THEN 0
              ELSE 1
            END,
            sb.assigned_at DESC
        ) AS booking_rank
      FROM seat_bookings sb
      WHERE sb.booking_month = $1
        AND sb.booking_year = $2
        AND sb.status IN ('reserved', 'active')
    )
    SELECT
      s.id,
      s.branch_id,
      s.seat_number,
      s.floor_name,
      s.section,
      s.status AS seat_status,
      s.is_available,
      s.assigned_to_student_id,
      s.assigned_date,
      mb.id AS booking_id,
      mb.student_id AS booked_student_id,
      st.name AS booked_student_name,
      st.student_id AS booked_student_code,
      mb.status AS booking_status,
      mb.booking_month,
      mb.booking_year,
      mb.start_date,
      mb.end_date,
      mb.notes AS booking_notes,
      CASE
        WHEN s.status = 'maintenance' THEN 'maintenance'
        WHEN s.status = 'inactive' THEN 'inactive'
        WHEN mb.id IS NOT NULL THEN 'booked'
        ELSE 'available'
      END AS availability_status
    FROM seats s
    LEFT JOIN month_bookings mb
      ON mb.seat_id = s.id
     AND mb.booking_rank = 1
    LEFT JOIN students st
      ON st.id = mb.student_id
    WHERE 1 = 1
  `;

  if (filters.branch_id != null) {
    params.push(filters.branch_id);
    query += ` AND s.branch_id = $${params.length}`;
  }

  if (filters.section) {
    params.push(filters.section);
    query += ` AND s.section = $${params.length}`;
  }

  if (filters.availability) {
    params.push(filters.availability);
    query += `
      AND (
        CASE
          WHEN s.status = 'maintenance' THEN 'maintenance'
          WHEN s.status = 'inactive' THEN 'inactive'
          WHEN mb.id IS NOT NULL THEN 'booked'
          ELSE 'available'
        END
      ) = $${params.length}
    `;
  }

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    query += `
      AND (
        s.seat_number ILIKE $${params.length}
        OR COALESCE(st.name, '') ILIKE $${params.length}
        OR COALESCE(st.student_id, '') ILIKE $${params.length}
      )
    `;
  }

  query += ' ORDER BY s.branch_id, s.seat_number';

  const result = await pool.query<SeatSnapshot>(query, params);
  return result.rows;
}

export async function getEligibleStudents(
  bookingMonth: number,
  bookingYear: number,
  branchId?: number,
): Promise<SeatEligibleStudent[]> {
  await expireOutdatedBookings(pool);

  const params: Array<number> = [bookingMonth, bookingYear];
  let query = `
    SELECT
      s.id,
      s.student_id,
      s.name,
      s.branch_id,
      b.name AS branch_name,
      s.study_plan,
      s.monthly_fee
    FROM students s
    JOIN branches b ON b.id = s.branch_id
    LEFT JOIN seat_bookings sb
      ON sb.student_id = s.id
     AND sb.booking_month = $1
     AND sb.booking_year = $2
     AND sb.status IN ('reserved', 'active')
    WHERE s.is_active = true
      AND s.membership_status = 'active'
      AND sb.id IS NULL
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  query += ' ORDER BY s.name';

  const result = await pool.query<SeatEligibleStudent>(query, params);
  return result.rows;
}

export async function getSeatBookings(
  bookingMonth: number,
  bookingYear: number,
  branchId?: number,
  limit: number = 50,
): Promise<SeatBooking[]> {
  await expireOutdatedBookings(pool);

  const params: Array<number> = [bookingMonth, bookingYear];
  let query = `
    SELECT
      sb.id,
      sb.seat_id,
      s.seat_number,
      s.section,
      s.floor_name,
      sb.student_id,
      st.name AS student_name,
      st.student_id AS student_code,
      sb.branch_id,
      b.name AS branch_name,
      sb.booking_month,
      sb.booking_year,
      sb.status,
      sb.start_date,
      sb.end_date,
      sb.assigned_by,
      creator.real_name AS assigned_by_name,
      sb.released_by,
      releaser.real_name AS released_by_name,
      sb.assigned_at,
      sb.released_at,
      sb.release_reason,
      sb.notes,
      sb.created_at,
      sb.updated_at
    FROM seat_bookings sb
    JOIN seats s ON s.id = sb.seat_id
    JOIN students st ON st.id = sb.student_id
    JOIN branches b ON b.id = sb.branch_id
    LEFT JOIN users creator ON creator.id = sb.assigned_by
    LEFT JOIN users releaser ON releaser.id = sb.released_by
    WHERE sb.booking_month = $1
      AND sb.booking_year = $2
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND sb.branch_id = $${params.length}`;
  }

  params.push(limit);
  query += ` ORDER BY sb.assigned_at DESC LIMIT $${params.length}`;

  const result = await pool.query<SeatBooking>(query, params);
  return result.rows;
}

export async function createSeatBooking(
  data: CreateSeatBookingDTO,
  assignedBy: number,
  branchId?: number,
): Promise<SeatBooking> {
  const periodComparison = getPeriodComparison(data.booking_month, data.booking_year);

  if (periodComparison < 0) {
    throw new Error('Seat bookings can only be created for the current month or a future month');
  }

  const bookingStatus: SeatBookingStatus =
    periodComparison === 0 ? 'active' : 'reserved';
  const { startDate, endDate } = getPeriodRange(data.booking_month, data.booking_year);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await expireOutdatedBookings(client);

    const seatParams: number[] = [data.seat_id];
    let seatQuery = `
      SELECT id, branch_id, status, seat_number
      FROM seats
      WHERE id = $1
      FOR UPDATE
    `;

    if (branchId != null) {
      seatParams.push(branchId);
      seatQuery = `
        SELECT id, branch_id, status, seat_number
        FROM seats
        WHERE id = $1 AND branch_id = $2
        FOR UPDATE
      `;
    }

    const seatResult = await client.query<{
      id: number;
      branch_id: number;
      status: string;
      seat_number: string;
    }>(seatQuery, seatParams);

    const seat = seatResult.rows[0];

    if (!seat) {
      throw new Error('Seat not found');
    }

    if (seat.status !== 'active') {
      throw new Error('Only active seats can be booked');
    }

    const studentParams: number[] = [data.student_id];
    let studentQuery = `
      SELECT id, branch_id, is_active, membership_status, name, student_id
      FROM students
      WHERE id = $1
      FOR UPDATE
    `;

    if (branchId != null) {
      studentParams.push(branchId);
      studentQuery = `
        SELECT id, branch_id, is_active, membership_status, name, student_id
        FROM students
        WHERE id = $1 AND branch_id = $2
        FOR UPDATE
      `;
    }

    const studentResult = await client.query<{
      id: number;
      branch_id: number;
      is_active: boolean;
      membership_status: string;
      name: string;
      student_id: string;
    }>(studentQuery, studentParams);

    const student = studentResult.rows[0];

    if (!student) {
      throw new Error('Student not found');
    }

    if (!student.is_active || student.membership_status !== 'active') {
      throw new Error('Only active students can hold seat bookings');
    }

    if (seat.branch_id !== student.branch_id) {
      throw new Error('Seat and student must belong to the same branch');
    }

    const insertResult = await client.query<{ id: number }>(
      `
        INSERT INTO seat_bookings (
          seat_id,
          student_id,
          branch_id,
          booking_month,
          booking_year,
          status,
          start_date,
          end_date,
          assigned_by,
          notes
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10
        )
        RETURNING id
      `,
      [
        seat.id,
        student.id,
        seat.branch_id,
        data.booking_month,
        data.booking_year,
        bookingStatus,
        startDate,
        endDate,
        assignedBy,
        data.notes ?? null,
      ],
    );

    const bookingId = insertResult.rows[0]?.id;

    if (!bookingId) {
      throw new Error('Seat booking could not be created');
    }

    const booking = await getSeatBookingById(client, bookingId);

    if (!booking) {
      throw new Error('Seat booking could not be loaded after creation');
    }

    await client.query('COMMIT');
    return booking;
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error?.code === '23505') {
      const constraintName = error.constraint ?? error.message ?? '';

      if (constraintName.includes('idx_seat_bookings_active_seat_period')) {
        throw new Error('This seat is already booked for the selected month');
      }

      if (constraintName.includes('idx_seat_bookings_active_student_period')) {
        throw new Error('This student already has a seat booking for the selected month');
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function releaseSeatBooking(
  bookingId: number,
  data: ReleaseSeatBookingDTO,
  releasedBy: number,
  branchId?: number,
): Promise<SeatBooking | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await expireOutdatedBookings(client);

    const params: number[] = [bookingId];
    let query = `
      SELECT id, seat_id, branch_id, status
      FROM seat_bookings
      WHERE id = $1
      FOR UPDATE
    `;

    if (branchId != null) {
      params.push(branchId);
      query = `
        SELECT id, seat_id, branch_id, status
        FROM seat_bookings
        WHERE id = $1 AND branch_id = $2
        FOR UPDATE
      `;
    }

    const existingResult = await client.query<{
      id: number;
      seat_id: number;
      branch_id: number;
      status: SeatBookingStatus;
    }>(query, params);

    const existingBooking = existingResult.rows[0];

    if (!existingBooking) {
      await client.query('ROLLBACK');
      return null;
    }

    if (!['reserved', 'active'].includes(existingBooking.status)) {
      throw new Error('This booking is already closed');
    }

    const nextStatus =
      data.status ??
      (existingBooking.status === 'reserved' ? 'cancelled' : 'released');

    await client.query(
      `
        UPDATE seat_bookings
        SET
          status = $1,
          release_reason = $2,
          released_by = $3,
          released_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `,
      [
        nextStatus,
        data.release_reason?.trim() || null,
        releasedBy,
        existingBooking.id,
      ],
    );

    const booking = await getSeatBookingById(client, existingBooking.id);

    if (!booking) {
      throw new Error('Seat booking could not be loaded after release');
    }

    await client.query('COMMIT');
    return booking;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
