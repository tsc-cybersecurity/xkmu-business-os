-- Phase 2B: publish-metadata for social_media_posts
ALTER TABLE social_media_posts
  ADD COLUMN external_post_id varchar(255),
  ADD COLUMN external_url     varchar(500),
  ADD COLUMN last_error       text,
  ADD COLUMN posted_via       varchar(20);
