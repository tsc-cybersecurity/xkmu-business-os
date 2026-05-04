-- Phase 3: Register the calendar_sync cron job (token refresh + channel renewal)
-- Runs every 30 minutes. Idempotent — only inserts if no row with this name exists.

INSERT INTO cron_jobs (name, description, interval, action_type, action_config, is_active, next_run_at)
SELECT
  'Google Calendar Sync',
  'Token-Refresh + Channel-Renewal für alle aktiven Calendar-Accounts',
  '30min',
  'calendar_sync',
  '{}'::jsonb,
  true,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM cron_jobs WHERE name = 'Google Calendar Sync' AND action_type = 'calendar_sync'
);
