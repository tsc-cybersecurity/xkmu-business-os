-- ============================================================
-- Migration 027: alte Sync-State-Spalten von user_calendar_accounts droppen
--
-- Migration 025 hat den Sync-State (syncToken/watchChannelId/
-- watchResourceId/watchExpiresAt/lastMessageNumber) auf
-- user_calendars_watched verschoben. Die gleichnamigen Account-
-- Spalten bleiben seitdem ungenutzt im Schema, drizzle-kit push
-- wuerde sie aber bei jedem Sync neu anlegen wollen, sobald wir
-- sie aus schema.ts entfernen. Daher: Migration zieht sie sauber
-- ab — idempotent.
-- ============================================================

ALTER TABLE user_calendar_accounts
  DROP COLUMN IF EXISTS sync_token,
  DROP COLUMN IF EXISTS watch_channel_id,
  DROP COLUMN IF EXISTS watch_resource_id,
  DROP COLUMN IF EXISTS watch_expires_at,
  DROP COLUMN IF EXISTS last_message_number;
