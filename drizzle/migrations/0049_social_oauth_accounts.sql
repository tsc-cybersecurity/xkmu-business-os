-- Social-Media Phase 1: OAuth-Account-Verknüpfungen
CREATE TABLE social_oauth_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              varchar(20) NOT NULL,
  external_account_id   varchar(255) NOT NULL,
  account_name          varchar(255) NOT NULL,
  access_token_enc      text NOT NULL,
  refresh_token_enc     text,
  token_expires_at      timestamptz,
  scopes                text[] NOT NULL DEFAULT '{}',
  meta                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  status                varchar(20) NOT NULL DEFAULT 'connected',
  connected_by          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  revoked_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_social_provider CHECK (provider IN ('facebook','instagram','x','linkedin')),
  CONSTRAINT chk_social_status CHECK (status IN ('connected','revoked','expired'))
);
CREATE UNIQUE INDEX idx_social_oauth_one_active_per_provider
  ON social_oauth_accounts(provider) WHERE status = 'connected';
CREATE INDEX idx_social_oauth_status ON social_oauth_accounts(status);
CREATE INDEX idx_social_oauth_token_expiry
  ON social_oauth_accounts(token_expires_at) WHERE status = 'connected' AND token_expires_at IS NOT NULL;
