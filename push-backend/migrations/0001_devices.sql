CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  subscription TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  interval_minutes INTEGER NOT NULL,
  sips INTEGER NOT NULL,
  time_zone TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_sent_slot TEXT,
  last_test_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(active);
