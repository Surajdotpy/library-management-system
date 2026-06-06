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
