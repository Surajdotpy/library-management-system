ALTER TABLE seats
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'seats_status_check'
      AND conrelid = 'seats'::regclass
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT seats_status_check
      CHECK (status IN ('active', 'maintenance', 'inactive'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS seat_bookings (
  id SERIAL PRIMARY KEY,
  seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  booking_month INTEGER NOT NULL CHECK (booking_month BETWEEN 1 AND 12),
  booking_year INTEGER NOT NULL CHECK (booking_year BETWEEN 2020 AND 2100),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('reserved', 'active', 'released', 'expired', 'cancelled')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  released_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP NULL,
  notes TEXT NULL,
  release_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT seat_bookings_date_order_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_students_branch_active_created
  ON students (branch_id, created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_students_branch_membership_status
  ON students (branch_id, membership_status);

CREATE INDEX IF NOT EXISTS idx_attendance_attendance_date
  ON attendance (attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date
  ON attendance (student_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_fee_payments_year_month_status_date
  ON fee_payments (fee_year, fee_month, status, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_fee_payments_student_payment_date
  ON fee_payments (student_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_users_role_branch_active
  ON users (role, branch_id, is_active);

CREATE INDEX IF NOT EXISTS idx_seats_branch_section_status
  ON seats (branch_id, section, status);

CREATE INDEX IF NOT EXISTS idx_seats_current_assignment
  ON seats (assigned_to_student_id)
  WHERE assigned_to_student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_seat_bookings_branch_period_status
  ON seat_bookings (branch_id, booking_year, booking_month, status);

CREATE INDEX IF NOT EXISTS idx_seat_bookings_student_period
  ON seat_bookings (student_id, booking_year, booking_month);

CREATE INDEX IF NOT EXISTS idx_seat_bookings_seat_period
  ON seat_bookings (seat_id, booking_year, booking_month);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seat_bookings_active_seat_period
  ON seat_bookings (seat_id, booking_year, booking_month)
  WHERE status IN ('reserved', 'active');

CREATE UNIQUE INDEX IF NOT EXISTS idx_seat_bookings_active_student_period
  ON seat_bookings (student_id, booking_year, booking_month)
  WHERE status IN ('reserved', 'active');

CREATE OR REPLACE FUNCTION update_seat_bookings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION validate_seat_booking_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  seat_branch_id INTEGER;
  seat_status_value VARCHAR(20);
  student_branch_id INTEGER;
  student_is_active BOOLEAN;
  student_membership_status VARCHAR(20);
BEGIN
  SELECT branch_id, status
    INTO seat_branch_id, seat_status_value
  FROM seats
  WHERE id = NEW.seat_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seat not found';
  END IF;

  SELECT branch_id, is_active, membership_status
    INTO student_branch_id, student_is_active, student_membership_status
  FROM students
  WHERE id = NEW.student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  IF NEW.branch_id <> seat_branch_id THEN
    RAISE EXCEPTION 'Seat branch does not match booking branch';
  END IF;

  IF NEW.branch_id <> student_branch_id THEN
    RAISE EXCEPTION 'Student branch does not match booking branch';
  END IF;

  IF seat_status_value <> 'active' THEN
    RAISE EXCEPTION 'Only active seats can be booked';
  END IF;

  IF student_is_active IS NOT TRUE OR student_membership_status <> 'active' THEN
    RAISE EXCEPTION 'Only active students can hold seat bookings';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION refresh_current_seat_assignment(p_seat_id INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  booking_student_id INTEGER;
  booking_start_date DATE;
  seat_status_value VARCHAR(20);
BEGIN
  SELECT status
    INTO seat_status_value
  FROM seats
  WHERE id = p_seat_id;

  SELECT sb.student_id, sb.start_date
    INTO booking_student_id, booking_start_date
  FROM seat_bookings sb
  WHERE sb.seat_id = p_seat_id
    AND sb.status IN ('reserved', 'active')
    AND sb.booking_month = EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
    AND sb.booking_year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  ORDER BY
    CASE sb.status
      WHEN 'active' THEN 0
      ELSE 1
    END,
    sb.assigned_at DESC
  LIMIT 1;

  UPDATE seats
  SET
    assigned_to_student_id = booking_student_id,
    assigned_date = booking_start_date,
    is_available = CASE
      WHEN seat_status_value = 'active' AND booking_student_id IS NULL THEN true
      ELSE false
    END
  WHERE id = p_seat_id;
END;
$function$;

CREATE OR REPLACE FUNCTION sync_seat_assignment_from_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM refresh_current_seat_assignment(COALESCE(NEW.seat_id, OLD.seat_id));
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trigger_seat_bookings_updated_at ON seat_bookings;
CREATE TRIGGER trigger_seat_bookings_updated_at
  BEFORE UPDATE ON seat_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_seat_bookings_updated_at();

DROP TRIGGER IF EXISTS trigger_validate_seat_booking_integrity ON seat_bookings;
CREATE TRIGGER trigger_validate_seat_booking_integrity
  BEFORE INSERT OR UPDATE ON seat_bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_seat_booking_integrity();

DROP TRIGGER IF EXISTS trigger_sync_seat_assignment_from_booking ON seat_bookings;
CREATE TRIGGER trigger_sync_seat_assignment_from_booking
  AFTER INSERT OR UPDATE OR DELETE ON seat_bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_seat_assignment_from_booking();

INSERT INTO seat_bookings (
  seat_id,
  student_id,
  branch_id,
  booking_month,
  booking_year,
  status,
  start_date,
  end_date,
  assigned_at,
  notes
)
SELECT
  s.id,
  s.assigned_to_student_id,
  s.branch_id,
  EXTRACT(MONTH FROM COALESCE(s.assigned_date, CURRENT_DATE))::INTEGER,
  EXTRACT(YEAR FROM COALESCE(s.assigned_date, CURRENT_DATE))::INTEGER,
  'active',
  COALESCE(s.assigned_date, DATE_TRUNC('month', CURRENT_DATE)::DATE),
  (
    DATE_TRUNC('month', COALESCE(s.assigned_date, CURRENT_DATE))
    + INTERVAL '1 month'
    - INTERVAL '1 day'
  )::DATE,
  CURRENT_TIMESTAMP,
  'Backfilled from legacy seat assignment'
FROM seats s
WHERE s.assigned_to_student_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM seat_bookings sb
    WHERE sb.seat_id = s.id
      AND sb.student_id = s.assigned_to_student_id
      AND sb.booking_month = EXTRACT(MONTH FROM COALESCE(s.assigned_date, CURRENT_DATE))::INTEGER
      AND sb.booking_year = EXTRACT(YEAR FROM COALESCE(s.assigned_date, CURRENT_DATE))::INTEGER
      AND sb.status IN ('reserved', 'active', 'released', 'expired', 'cancelled')
  );
