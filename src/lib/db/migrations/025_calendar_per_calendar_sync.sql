-- ============================================================
-- Migration 025: per-calendar sync state
--
-- Problem: bisher wird nur acc.primaryCalendarId synchronisiert.
-- Zusatzkalender (z.B. privater Kalender), die per
-- userCalendarsWatched.readForBusy=true als "blockierend"
-- markiert sind, bekommen weder Watch-Channel noch Sync-Pulls
-- → external_busy bleibt fuer sie leer → Slot-Listing zeigt
-- Slots faelschlich frei.
--
-- Loesung: Sync-State pro Kalender, nicht pro Account.
-- Felder watchChannelId / watchResourceId / watchExpiresAt /
-- syncToken / lastMessageNumber wandern auf user_calendars_watched.
-- Account-Felder bleiben bestehen (Backfill-Quelle), werden ab
-- jetzt aber vom Code ignoriert.
-- ============================================================

ALTER TABLE user_calendars_watched
  ADD COLUMN IF NOT EXISTS sync_token TEXT,
  ADD COLUMN IF NOT EXISTS watch_channel_id UUID,
  ADD COLUMN IF NOT EXISTS watch_resource_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS watch_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_number BIGINT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Lookup-Index fuer Webhook-Channel-Id (UNIQUE, falls noch frei)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_user_calendars_watched_channel'
  ) THEN
    CREATE UNIQUE INDEX uq_user_calendars_watched_channel
      ON user_calendars_watched (watch_channel_id)
      WHERE watch_channel_id IS NOT NULL;
  END IF;
END $$;

-- Backfill: Account-Level-Sync-State auf den primaeren Watched-Kalender uebertragen
UPDATE user_calendars_watched ucw
SET
  sync_token = uca.sync_token,
  watch_channel_id = uca.watch_channel_id,
  watch_resource_id = uca.watch_resource_id,
  watch_expires_at = uca.watch_expires_at,
  last_message_number = uca.last_message_number
FROM user_calendar_accounts uca
WHERE ucw.account_id = uca.id
  AND uca.primary_calendar_id IS NOT NULL
  AND ucw.google_calendar_id = uca.primary_calendar_id
  AND ucw.sync_token IS NULL;
