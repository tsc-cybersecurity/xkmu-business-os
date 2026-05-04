-- Terminbuchung Phase 1: Calendar-Account-Verknüpfungen

-- Erweiterung users
ALTER TABLE users
  ADD COLUMN booking_slug         varchar(60) UNIQUE,
  ADD COLUMN booking_page_active  boolean NOT NULL DEFAULT false,
  ADD COLUMN booking_page_title   varchar(255),
  ADD COLUMN booking_page_subtitle varchar(255),
  ADD COLUMN booking_page_intro   text,
  ADD COLUMN timezone             varchar(64) NOT NULL DEFAULT 'Europe/Berlin';

-- Gekoppelte Google-Accounts
CREATE TABLE user_calendar_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider              varchar(20) NOT NULL DEFAULT 'google',
  google_email          varchar(255) NOT NULL,
  access_token_enc      text NOT NULL,
  refresh_token_enc     text NOT NULL,
  token_expires_at      timestamptz NOT NULL,
  scopes                text[] NOT NULL DEFAULT '{}',
  primary_calendar_id   varchar(255),
  watch_channel_id      uuid,
  watch_resource_id     varchar(255),
  watch_expires_at      timestamptz,
  sync_token            text,
  last_message_number   bigint,
  revoked_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_calendar_accounts_user ON user_calendar_accounts(user_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX idx_user_calendar_accounts_active ON user_calendar_accounts(user_id, provider) WHERE revoked_at IS NULL;

-- Pro Account: welche Kalender als belegt zählen
CREATE TABLE user_calendars_watched (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES user_calendar_accounts(id) ON DELETE CASCADE,
  google_calendar_id  varchar(255) NOT NULL,
  display_name        varchar(255) NOT NULL,
  read_for_busy       boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_calendars_watched_account_calendar UNIQUE (account_id, google_calendar_id)
);
CREATE INDEX idx_user_calendars_watched_account ON user_calendars_watched(account_id);
