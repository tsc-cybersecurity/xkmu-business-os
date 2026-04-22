-- ============================================================
-- Migration 008: portal_users (users.companyId + Invite-Flow)
-- Idempotent.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token);

-- Seed role 'portal_user' (roles table has no UNIQUE on name, so use guard)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'portal_user') THEN
    INSERT INTO roles (name, display_name, description, is_system)
      VALUES ('portal_user', 'Portal-Nutzer', 'Extern angelegter Kunden-Zugang; Firmenbezogen', TRUE);
  END IF;
END $$;
