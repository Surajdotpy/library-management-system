ALTER TABLE fee_payments
  ADD COLUMN IF NOT EXISTS gateway_provider VARCHAR(40),
  ADD COLUMN IF NOT EXISTS gateway_mode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gateway_session_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gateway_cf_order_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gateway_checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS gateway_upi_intent TEXT,
  ADD COLUMN IF NOT EXISTS gateway_order_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS gateway_expires_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_fee_payments_gateway_pending
  ON fee_payments (student_id, gateway_provider, status, created_at DESC);
