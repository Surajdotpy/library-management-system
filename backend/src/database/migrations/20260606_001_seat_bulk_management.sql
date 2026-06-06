DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seats_branch_seat_unique'
      AND conrelid = 'seats'::regclass
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT seats_branch_seat_unique
      UNIQUE (branch_id, seat_number);
  END IF;
END $$;

ALTER TABLE seats
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION auto_unassign_seat_on_student_deactivation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    UPDATE seats
    SET assigned_to_student_id = NULL, assigned_date = NULL
    WHERE assigned_to_student_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_unassign_seat ON students;
CREATE TRIGGER trigger_auto_unassign_seat
  AFTER UPDATE OF is_active ON students
  FOR EACH ROW
  WHEN (OLD.is_active = true AND NEW.is_active = false)
  EXECUTE FUNCTION auto_unassign_seat_on_student_deactivation();
