-- Terminbuchung Phase 2: Slot-Typen + Verfügbarkeit

CREATE TABLE slot_types (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug                   varchar(100) NOT NULL,
  name                   varchar(255) NOT NULL,
  description            text,
  duration_minutes       integer NOT NULL CHECK (duration_minutes > 0),
  buffer_before_minutes  integer NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
  buffer_after_minutes   integer NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0),
  min_notice_hours       integer NOT NULL DEFAULT 24 CHECK (min_notice_hours >= 0),
  max_advance_days       integer NOT NULL DEFAULT 60 CHECK (max_advance_days > 0),
  color                  varchar(7) NOT NULL DEFAULT '#3b82f6',
  is_active              boolean NOT NULL DEFAULT true,
  location               varchar(20) NOT NULL DEFAULT 'phone',
  location_details       text,
  display_order          integer NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_slot_types_user_slug UNIQUE (user_id, slug)
);
CREATE INDEX idx_slot_types_user_active ON slot_types(user_id, is_active);

CREATE TABLE availability_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_availability_rules_time_order CHECK (end_time > start_time)
);
CREATE INDEX idx_availability_rules_user ON availability_rules(user_id);

CREATE TABLE availability_overrides (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_at  timestamptz NOT NULL,
  end_at    timestamptz NOT NULL,
  kind      varchar(10) NOT NULL CHECK (kind IN ('free', 'block')),
  reason    varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_availability_overrides_time_order CHECK (end_at > start_at)
);
CREATE INDEX idx_availability_overrides_user_start ON availability_overrides(user_id, start_at);
