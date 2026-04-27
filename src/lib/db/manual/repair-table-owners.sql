-- =============================================================================
-- Manueller Fix: Tabellen-Owner auf den App-User uebertragen
-- =============================================================================
-- Hintergrund: drizzle-kit push --force scheitert bei einigen Tabellen mit
-- "must be owner of table ...", weil sie historisch von einem anderen Postgres-
-- User (z. B. supabase_admin) angelegt wurden. Folge: ALTER COLUMN, ADD
-- CONSTRAINT etc. werden uebersprungen, Schema kommt nicht durch.
--
-- Fix: alle Public-Tabellen auf den App-DB-User (DATABASE_URL) uebertragen.
-- Der App-User ist in den meisten Setups 'postgres' — bei abweichendem
-- DATABASE_URL den $TARGET_OWNER unten anpassen.
--
-- Ausfuehrung: einmalig als Postgres-Superuser.
--   docker exec -i supabase-db psql -U postgres -d postgres < repair-table-owners.sql
--
-- Idempotent: ALTER OWNER auf bereits korrekt gesetzten Owner ist no-op.
-- =============================================================================

DO $$
DECLARE
  TARGET_OWNER CONSTANT TEXT := 'postgres';
  r RECORD;
  n INT := 0;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tableowner != TARGET_OWNER
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO %I', r.tablename, TARGET_OWNER);
    n := n + 1;
    RAISE NOTICE 'Owner geaendert: %', r.tablename;
  END LOOP;

  IF n = 0 THEN
    RAISE NOTICE 'Alle Tabellen gehoeren bereits %', TARGET_OWNER;
  ELSE
    RAISE NOTICE '% Tabelle(n) auf Owner % uebertragen.', n, TARGET_OWNER;
  END IF;
END $$;

-- Verify: keine Tabellen mit abweichendem Owner mehr da
SELECT tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tableowner != 'postgres'
ORDER BY tablename;
