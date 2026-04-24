-- ============================================================
-- Migration 011: Portal P4 — orders + order_categories
-- Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS order_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  description TEXT,
  color VARCHAR(30),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_categories_slug_unique UNIQUE (slug)
);
CREATE INDEX IF NOT EXISTS idx_order_categories_active_sort ON order_categories(is_active, sort_order);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES order_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'mittel',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  contract_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  reject_reason TEXT,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_company_status ON orders(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_priority ON orders(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_assigned ON orders(assigned_to, status);

-- Seed default categories (idempotent via UNIQUE slug + ON CONFLICT)
INSERT INTO order_categories (name, slug, description, color, sort_order, is_active) VALUES
  ('IT-Support', 'support', 'Allgemeine Supportanfragen', 'slate', 10, TRUE),
  ('Incident / Störung', 'incident', 'Akute Probleme, Ausfälle', 'red', 20, TRUE),
  ('Änderungsantrag', 'change-request', 'Funktionale Änderungen / Konfiguration', 'blue', 30, TRUE),
  ('Feature-Wunsch', 'feature', 'Neue Features oder Ausbauwünsche', 'green', 40, TRUE),
  ('Beratung / Consulting', 'consulting', 'Beratungs- und Schulungsanfragen', 'amber', 50, TRUE),
  ('Audit-Anfrage', 'audit', 'Sicherheits- und IT-Audit-Anfragen', 'purple', 60, TRUE),
  ('Sonstiges', 'other', 'Alle anderen Themen', 'gray', 90, TRUE)
ON CONFLICT (slug) DO NOTHING;
