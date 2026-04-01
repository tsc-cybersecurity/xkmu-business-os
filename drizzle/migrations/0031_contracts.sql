-- Add contract-specific columns to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS contract_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_renewal_type VARCHAR(30) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS contract_renewal_period VARCHAR(30),
  ADD COLUMN IF NOT EXISTS contract_notice_period_days INTEGER,
  ADD COLUMN IF NOT EXISTS contract_template_id UUID,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_body_html TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract_template ON documents(contract_template_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract_dates ON documents(tenant_id, contract_start_date, contract_end_date)
  WHERE type = 'contract';

-- Contract Templates
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  body_html TEXT,
  placeholders JSONB DEFAULT '[]'::jsonb,
  clauses JSONB DEFAULT '[]'::jsonb,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_tenant ON contract_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON contract_templates(category);

-- Contract Clauses (Bausteine)
CREATE TABLE IF NOT EXISTS contract_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  body_html TEXT,
  is_system BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_clauses_tenant ON contract_clauses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_category ON contract_clauses(category);
