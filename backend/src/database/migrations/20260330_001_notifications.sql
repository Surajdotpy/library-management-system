CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL
    CHECK (type IN ('payment_received')),
  severity VARCHAR(20) NOT NULL
    CHECK (severity IN ('critical', 'warning', 'info')),
  branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  action_route VARCHAR(255) NOT NULL,
  metadata JSONB,
  source_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_branch_created_at
  ON notifications (branch_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user_read_at
  ON notification_reads (user_id, read_at DESC);
