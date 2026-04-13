-- ============================================
-- Framework v2 Migration
-- Neue Tabellen + SOP-Erweiterungen
-- 2026-04-13
-- ============================================

BEGIN;

-- ============================================
-- 1. Neue Tabelle: deliverable_modules
-- ============================================
CREATE TABLE IF NOT EXISTS deliverable_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(10) NOT NULL,
  category_code VARCHAR(10),
  ziel TEXT,
  preis VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverable_modules_tenant ON deliverable_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_modules_code ON deliverable_modules(tenant_id, code);

-- ============================================
-- 2. Neue Tabelle: deliverables
-- ============================================
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_id UUID REFERENCES deliverable_modules(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  format VARCHAR(100),
  umfang VARCHAR(100),
  trigger VARCHAR(255),
  category VARCHAR(50),
  category_code VARCHAR(10),
  status VARCHAR(20) DEFAULT 'draft',
  version VARCHAR(20) DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverables_tenant ON deliverables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_module ON deliverables(tenant_id, module_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_category ON deliverables(tenant_id, category_code);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(tenant_id, status);

-- ============================================
-- 3. SOP Documents: 7 neue Felder (alle nullable)
-- ============================================
ALTER TABLE sop_documents
  ADD COLUMN IF NOT EXISTS automation_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ai_capable BOOLEAN,
  ADD COLUMN IF NOT EXISTS maturity_level INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS produces_deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subprocess VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source_task_id VARCHAR(50);

-- ============================================
-- 4. SOP Steps: 1 neues Feld (nullable)
-- ============================================
ALTER TABLE sop_steps
  ADD COLUMN IF NOT EXISTS executor VARCHAR(10);

-- ============================================
-- 5. Neue Tabelle: execution_logs
-- ============================================
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID NOT NULL,
  entity_version VARCHAR(20),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  executed_by VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL,
  abort_reason TEXT,
  quality_score REAL,
  duration_minutes REAL,
  cost_estimate_usd REAL,
  flags TEXT[] DEFAULT '{}',
  linked_client_id UUID,
  linked_project_id UUID,
  human_approved BOOLEAN DEFAULT FALSE,
  human_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  human_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_tenant ON execution_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_entity ON execution_logs(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON execution_logs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_started ON execution_logs(tenant_id, started_at);

COMMIT;
