-- ============================================================
-- Migration 013: Portal P6 — portal_documents + categories
-- Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_doc_categories_direction ON portal_document_categories(direction);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portal_doc_categories_direction_chk') THEN
    ALTER TABLE portal_document_categories
      ADD CONSTRAINT portal_doc_categories_direction_chk
      CHECK (direction IN ('admin_to_portal', 'portal_to_admin', 'both'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS portal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES portal_document_categories(id) ON DELETE RESTRICT,
  direction VARCHAR(20) NOT NULL,

  file_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,

  linked_type VARCHAR(20),
  linked_id UUID,

  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  uploader_role VARCHAR(20) NOT NULL,
  note VARCHAR(500),

  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_docs_company_dir_created ON portal_documents(company_id, direction, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_docs_linked ON portal_documents(linked_type, linked_id);
CREATE INDEX IF NOT EXISTS idx_portal_docs_category ON portal_documents(category_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portal_docs_direction_chk') THEN
    ALTER TABLE portal_documents ADD CONSTRAINT portal_docs_direction_chk
      CHECK (direction IN ('admin_to_portal', 'portal_to_admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portal_docs_uploader_role_chk') THEN
    ALTER TABLE portal_documents ADD CONSTRAINT portal_docs_uploader_role_chk
      CHECK (uploader_role IN ('admin', 'portal_user'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portal_docs_linked_type_chk') THEN
    ALTER TABLE portal_documents ADD CONSTRAINT portal_docs_linked_type_chk
      CHECK (linked_type IS NULL OR linked_type IN ('contract', 'project', 'order'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portal_docs_linked_pair_chk') THEN
    ALTER TABLE portal_documents ADD CONSTRAINT portal_docs_linked_pair_chk
      CHECK ((linked_type IS NULL) = (linked_id IS NULL));
  END IF;
END $$;

-- Seed default categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal_document_categories) THEN
    INSERT INTO portal_document_categories (name, direction, sort_order, is_system) VALUES
      ('Vertrag',                    'admin_to_portal', 10, TRUE),
      ('Angebot',                    'admin_to_portal', 20, TRUE),
      ('Rechnung',                   'admin_to_portal', 30, TRUE),
      ('Protokoll',                  'admin_to_portal', 40, TRUE),
      ('Sonstiges',                  'admin_to_portal', 90, TRUE),
      ('Unterschriebener Vertrag',   'portal_to_admin', 10, TRUE),
      ('Nachweis',                   'portal_to_admin', 20, TRUE),
      ('Sonstiges',                  'portal_to_admin', 90, TRUE);
  END IF;
END $$;
