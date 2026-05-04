-- Terminbuchung Phase 3: Externe Google-Events als Spiegel

CREATE TABLE external_busy (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES user_calendar_accounts(id) ON DELETE CASCADE,
  google_calendar_id  varchar(255) NOT NULL,
  google_event_id     varchar(255) NOT NULL,
  start_at            timestamptz NOT NULL,
  end_at              timestamptz NOT NULL,
  etag                varchar(255),
  transparency        varchar(15) NOT NULL DEFAULT 'opaque',
  is_all_day          boolean NOT NULL DEFAULT false,
  summary             varchar(500),
  last_synced_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_external_busy_event UNIQUE (google_calendar_id, google_event_id)
);
CREATE INDEX idx_external_busy_account_time ON external_busy(account_id, start_at, end_at);
