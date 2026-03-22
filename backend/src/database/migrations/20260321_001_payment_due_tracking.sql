ALTER TABLE fee_payments
  ADD COLUMN IF NOT EXISTS coverage_start_date DATE,
  ADD COLUMN IF NOT EXISTS coverage_end_date DATE;

UPDATE fee_payments
SET
  coverage_start_date = COALESCE(coverage_start_date, payment_date::DATE),
  coverage_end_date = COALESCE(
    coverage_end_date,
    (payment_date::DATE + INTERVAL '29 days')::DATE
  );

ALTER TABLE fee_payments
  ALTER COLUMN coverage_start_date SET NOT NULL,
  ALTER COLUMN coverage_end_date SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fee_payments_coverage_date_order_check'
      AND conrelid = 'fee_payments'::regclass
  ) THEN
    ALTER TABLE fee_payments
      ADD CONSTRAINT fee_payments_coverage_date_order_check
      CHECK (coverage_end_date >= coverage_start_date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fee_payments_student_coverage_end
  ON fee_payments (student_id, coverage_end_date DESC);

CREATE INDEX IF NOT EXISTS idx_fee_payments_coverage_period
  ON fee_payments (coverage_start_date DESC, coverage_end_date DESC);
