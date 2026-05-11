-- ============================================================
-- Migration 026: external_busy unique index garantieren
--
-- Bug: drizzle-kit push hat den uniqueIndex
-- uq_external_busy_event(google_calendar_id, google_event_id)
-- nicht / nicht mehr angelegt → ON CONFLICT in upsertEvents schlug
-- mit Code 42P10 fehl → ALLE Sync-Inserts in external_busy stuck.
--
-- Diese Migration legt den Index idempotent an. Falls bereits ein
-- gleichwertiger Index unter anderem Namen existiert, ueberlassen
-- wir den der DB (postgres complains nicht bei IF NOT EXISTS).
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_external_busy_event
  ON external_busy (google_calendar_id, google_event_id);
