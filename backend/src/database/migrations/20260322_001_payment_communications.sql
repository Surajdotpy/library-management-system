CREATE TABLE IF NOT EXISTS payment_communications (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  payment_id INTEGER REFERENCES fee_payments(id) ON DELETE SET NULL,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  communication_type VARCHAR(30) NOT NULL
    CHECK (communication_type IN ('fee_reminder', 'payment_receipt')),
  reminder_stage VARCHAR(30)
    CHECK (reminder_stage IN ('before_3_days', 'due_today', 'overdue')),
  channel VARCHAR(20) NOT NULL
    CHECK (channel IN ('sms', 'whatsapp')),
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'logged'
    CHECK (delivery_status IN ('logged', 'sent', 'failed')),
  delivery_mode VARCHAR(20) NOT NULL DEFAULT 'log_only'
    CHECK (delivery_mode IN ('log_only', 'webhook')),
  provider_name VARCHAR(100),
  external_message_id VARCHAR(255),
  recipient_phone VARCHAR(20) NOT NULL,
  recipient_email VARCHAR(255),
  subject VARCHAR(255),
  message_body TEXT NOT NULL,
  receipt_snapshot JSONB,
  sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_communications_student_sent_at
  ON payment_communications (student_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_communications_payment_id
  ON payment_communications (payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_communications_branch_type
  ON payment_communications (branch_id, communication_type, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_communications_reminder_stage
  ON payment_communications (reminder_stage, channel, sent_at DESC)
  WHERE communication_type = 'fee_reminder';
