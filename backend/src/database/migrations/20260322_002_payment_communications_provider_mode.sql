ALTER TABLE payment_communications
  DROP CONSTRAINT IF EXISTS payment_communications_delivery_mode_check;

ALTER TABLE payment_communications
  ADD CONSTRAINT payment_communications_delivery_mode_check
  CHECK (delivery_mode IN ('log_only', 'webhook', 'provider'));
