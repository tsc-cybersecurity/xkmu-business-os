-- ============================================================
-- Migration 010: company_change_requests
-- Portal P2: Antrags-Workflow für Firmendaten-Änderungen.
-- Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS company_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proposed_changes JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ccr_company ON company_change_requests(company_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_ccr_status ON company_change_requests(status, requested_at DESC);
