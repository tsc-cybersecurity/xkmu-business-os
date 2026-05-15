-- ============================================================
-- 064_voice_calls.sql
-- ------------------------------------------------------------
-- Persistierte Voice-Calls + Transkripte. voice.xkmu.de schickt
-- pro Call-Ende einen Webhook → Receiver schreibt eine Zeile in
-- voice_calls plus N Zeilen in voice_call_messages.
-- ============================================================

CREATE TABLE IF NOT EXISTS voice_calls (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name         varchar(200) NOT NULL,
  agent_key         varchar(50)  NOT NULL,
  direction         varchar(10)  NOT NULL DEFAULT 'outbound',
  phone             varchar(30),
  caller_name       varchar(200),
  context_text      text,
  started_at        timestamptz NOT NULL,
  ended_at          timestamptz,
  duration_seconds  integer,
  status            varchar(30) NOT NULL DEFAULT 'completed',
  summary           text,
  recording_url     text,
  twilio_call_sid   varchar(100),
  raw_payload       jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- room_name als logischer "natural key" — der Webhook ist idempotent.
-- Re-Post derselben room_name aktualisiert den Eintrag.
CREATE UNIQUE INDEX IF NOT EXISTS voice_calls_room_name_unique
  ON voice_calls(room_name);

CREATE INDEX IF NOT EXISTS idx_voice_calls_started   ON voice_calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_calls_agent     ON voice_calls(agent_key);
CREATE INDEX IF NOT EXISTS idx_voice_calls_phone     ON voice_calls(phone);
CREATE INDEX IF NOT EXISTS idx_voice_calls_direction ON voice_calls(direction);

CREATE TABLE IF NOT EXISTS voice_call_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id     uuid NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
  ts          timestamptz NOT NULL,
  role        varchar(20) NOT NULL,
  text        text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_call_messages_call_ts
  ON voice_call_messages(call_id, ts, sort_order);
