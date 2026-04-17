-- ============================================================
-- Migration 004: rename tenants → organization
--
-- Umbenennung der singleton-Tabelle von "tenants" auf "organization"
-- inklusive Indexes und Constraints. Idempotent.
-- ============================================================

-- 1. Tabelle umbenennen
DO $$
BEGIN
  IF to_regclass('public.tenants') IS NOT NULL AND to_regclass('public.organization') IS NULL THEN
    ALTER TABLE tenants RENAME TO organization;
  END IF;
END $$;

-- 2. Indexes umbenennen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_tenants_slug') THEN
    ALTER INDEX idx_tenants_slug RENAME TO idx_organization_slug;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_tenants_status') THEN
    ALTER INDEX idx_tenants_status RENAME TO idx_organization_status;
  END IF;
END $$;

-- 3. PK und Unique-Constraints umbenennen (falls noch alte Namen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='tenants_pkey') THEN
    ALTER INDEX tenants_pkey RENAME TO organization_pkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='tenants_slug_unique') THEN
    ALTER INDEX tenants_slug_unique RENAME TO organization_slug_unique;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='tenants_slug_key') THEN
    ALTER INDEX tenants_slug_key RENAME TO organization_slug_key;
  END IF;
END $$;
