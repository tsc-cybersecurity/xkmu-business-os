-- Social-Media Phase 2A: Posts + Per-Provider-Targets

CREATE TABLE social_posts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status              varchar(20) NOT NULL DEFAULT 'draft',
  master_body         text NOT NULL DEFAULT '',
  master_image_path   varchar(500),
  scheduled_for       timestamptz,
  created_by          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_social_post_status CHECK (status IN ('draft','approved','scheduled','posted','partially_failed','failed'))
);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_social_posts_created_by ON social_posts(created_by);

CREATE TABLE social_post_targets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             uuid NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  provider            varchar(20) NOT NULL,
  body_override       text,
  publish_status      varchar(20) NOT NULL DEFAULT 'pending',
  external_post_id    varchar(255),
  external_url        varchar(500),
  retry_count         integer NOT NULL DEFAULT 0,
  last_error          text,
  posted_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_social_target_provider CHECK (provider IN ('facebook','instagram','x','linkedin')),
  CONSTRAINT chk_social_target_status CHECK (publish_status IN ('pending','publishing','posted','failed')),
  UNIQUE (post_id, provider)
);
CREATE INDEX idx_social_post_targets_post ON social_post_targets(post_id);
CREATE INDEX idx_social_post_targets_status ON social_post_targets(publish_status) WHERE publish_status IN ('pending','publishing','failed');
