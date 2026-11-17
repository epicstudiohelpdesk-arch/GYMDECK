-- GymDeck Gym Attendance QR Pass Migration (0004_gym_checkin_qr.sql)
-- Additive and safe to re-run.

CREATE TABLE IF NOT EXISTS gym_checkin_qr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL UNIQUE REFERENCES gyms(id) ON DELETE CASCADE,
  checkin_code VARCHAR(32) NOT NULL UNIQUE,
  qr_token VARCHAR(64) NOT NULL UNIQUE,
  qr_payload TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gym_checkin_qr_gym ON gym_checkin_qr (gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_checkin_qr_code ON gym_checkin_qr (checkin_code);
CREATE INDEX IF NOT EXISTS idx_gym_checkin_qr_token ON gym_checkin_qr (qr_token);
