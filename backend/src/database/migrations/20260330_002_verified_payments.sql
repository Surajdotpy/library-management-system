ALTER TABLE fee_payments
  ADD COLUMN IF NOT EXISTS verification_source VARCHAR(40) NOT NULL DEFAULT 'manual_entry',
  ADD COLUMN IF NOT EXISTS verification_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

UPDATE fee_payments
SET
  verification_source = 'legacy',
  verified_at = COALESCE(verified_at, payment_date),
  verification_reference = COALESCE(verification_reference, transaction_id)
WHERE status = 'paid'
  AND (verification_source = 'manual_entry' OR verification_source IS NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fee_payments_verification_source_check'
      AND conrelid = 'fee_payments'::regclass
  ) THEN
    ALTER TABLE fee_payments
      ADD CONSTRAINT fee_payments_verification_source_check
      CHECK (
        verification_source IN (
          'legacy',
          'manual_entry',
          'superadmin_review',
          'gateway_webhook'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fee_payments_status_verified_at
  ON fee_payments (status, verified_at DESC NULLS LAST, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_fee_payments_transaction_id_pending
  ON fee_payments (transaction_id)
  WHERE status = 'pending';
