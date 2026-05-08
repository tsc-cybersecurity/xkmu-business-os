-- News-Modul: Recherche-Themenbereiche und News-Items
-- T1-Schema in src/lib/db/schema.ts (commits 8478ea86, fd1f8b84)
--
-- Tabellen:
--   * news_topics  Themenbereiche (z.B. "KI im Mittelstand")
--   * news_items   recherchierte Einzel-News pro Topic
--
-- Verknuepfungen:
--   * news_items.topic_id         -> news_topics(id) ON DELETE CASCADE
--   * news_items.pipeline_task_id -> task_queue(id)  ON DELETE SET NULL
--   * blog_posts.source_news_item_id         -> news_items(id) ON DELETE SET NULL
--   * social_media_posts.source_news_item_id -> news_items(id) ON DELETE SET NULL

CREATE TABLE news_topics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar(100) NOT NULL,
  description   text,
  color         varchar(7) DEFAULT '#3b82f6',
  keywords      text[] NOT NULL DEFAULT '{}',
  source_type   varchar(30) NOT NULL DEFAULT 'serpapi_news',
  source_config jsonb DEFAULT '{}'::jsonb,
  is_active     boolean DEFAULT true,
  sort_order    integer DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX idx_news_topics_active ON news_topics(is_active);

CREATE TABLE news_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id         uuid NOT NULL REFERENCES news_topics(id) ON DELETE CASCADE,
  title            varchar(500) NOT NULL,
  url              varchar(1000) NOT NULL,
  snippet          text,
  source           varchar(200),
  image_url        varchar(1000),
  published_at     timestamptz,
  url_hash         varchar(64) NOT NULL,
  pipeline_status  varchar(20) NOT NULL DEFAULT 'idle',
  pipeline_error   text,
  pipeline_task_id uuid REFERENCES task_queue(id) ON DELETE SET NULL,
  research_data    jsonb,
  is_hidden        boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX idx_news_items_topic ON news_items(topic_id);
CREATE INDEX idx_news_items_pipeline_status ON news_items(pipeline_status);
CREATE INDEX idx_news_items_published ON news_items(published_at);
CREATE UNIQUE INDEX uq_news_items_topic_url ON news_items(topic_id, url_hash);

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS source_news_item_id uuid;

ALTER TABLE blog_posts
  ADD CONSTRAINT blog_posts_source_news_item_id_fkey
  FOREIGN KEY (source_news_item_id) REFERENCES news_items(id) ON DELETE SET NULL;

ALTER TABLE social_media_posts
  ADD COLUMN IF NOT EXISTS source_news_item_id uuid;

ALTER TABLE social_media_posts
  ADD CONSTRAINT social_media_posts_source_news_item_id_fkey
  FOREIGN KEY (source_news_item_id) REFERENCES news_items(id) ON DELETE SET NULL;
