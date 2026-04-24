-- ============================================================
-- Migration 014: persons.portal_user_id + Backfill
-- Idempotent.
-- ============================================================

ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS portal_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_persons_portal_user_id ON persons(portal_user_id);

-- Backfill: existing portal_users per (email, companyId) an Personen verknüpfen.
UPDATE persons p
SET portal_user_id = u.id
FROM users u
WHERE u.role = 'portal_user'
  AND u.company_id IS NOT NULL
  AND p.company_id = u.company_id
  AND LOWER(p.email) = LOWER(u.email)
  AND p.portal_user_id IS NULL;
