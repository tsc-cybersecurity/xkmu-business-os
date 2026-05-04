-- Phase 4: Buchungen
CREATE TABLE appointments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_type_id          uuid NOT NULL REFERENCES slot_types(id) ON DELETE RESTRICT,
  start_at              timestamptz NOT NULL,
  end_at                timestamptz NOT NULL,
  status                varchar(20) NOT NULL DEFAULT 'pending',
  customer_name         varchar(255) NOT NULL,
  customer_email        varchar(255) NOT NULL,
  customer_phone        varchar(50) NOT NULL,
  customer_message      text,
  lead_id               uuid REFERENCES leads(id) ON DELETE SET NULL,
  person_id             uuid REFERENCES persons(id) ON DELETE SET NULL,
  source                varchar(20) NOT NULL,
  cancel_token_hash     varchar(64),
  reschedule_token_hash varchar(64),
  google_event_id       varchar(255),
  google_calendar_id    varchar(255),
  sync_error            text,
  staff_notes           text,
  cancelled_at          timestamptz,
  cancelled_by          varchar(20),
  cancellation_reason   text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_appointments_time_order CHECK (end_at > start_at),
  CONSTRAINT chk_appointments_status CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  CONSTRAINT chk_appointments_source CHECK (source IN ('public','portal','manual'))
);
CREATE INDEX idx_appointments_user_start ON appointments(user_id, start_at);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_google_event ON appointments(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX idx_appointments_email ON appointments(customer_email);
