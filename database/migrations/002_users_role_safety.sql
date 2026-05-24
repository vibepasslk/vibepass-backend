ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'organizer', 'customer', 'staff'));

CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);
