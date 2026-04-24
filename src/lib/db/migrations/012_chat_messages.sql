-- ============================================================
-- Migration 012: Portal P5 — portal_messages
-- Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_role VARCHAR(50) NOT NULL,
  body_text TEXT NOT NULL,
  read_by_portal_at TIMESTAMPTZ,
  read_by_admin_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_messages_company_created ON portal_messages(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_messages_sender ON portal_messages(sender_id);
