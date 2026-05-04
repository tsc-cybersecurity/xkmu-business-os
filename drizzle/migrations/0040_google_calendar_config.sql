-- Singleton table: Google Calendar integration config
CREATE TABLE google_calendar_config (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Admin-provided OAuth credentials (NULL until configured via UI)
  client_id                varchar(255),
  client_secret            text,
  redirect_uri             varchar(500),
  app_public_url           varchar(255),
  -- Auto-generated crypto material (NEVER NULL after seed)
  token_encryption_key_hex varchar(64) NOT NULL,
  appointment_token_secret varchar(128) NOT NULL,
  -- Singleton enforcement: only one row allowed
  is_singleton             boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_calendar_config_singleton UNIQUE (is_singleton)
);

-- Seed singleton row with auto-generated crypto keys.
-- OAuth credentials (client_id, client_secret, redirect_uri, app_public_url)
-- are left NULL here and must be set via the admin UI (Pass 2) or a manual
-- one-time UPDATE after deployment.
INSERT INTO google_calendar_config (
  token_encryption_key_hex,
  appointment_token_secret
) VALUES (
  encode(gen_random_bytes(32), 'hex'),
  encode(gen_random_bytes(48), 'hex')
);
