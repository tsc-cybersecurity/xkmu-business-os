-- Sitemap-Flag pro CMS-Seite und Blog-Post.
-- Default true → bestehende Seiten/Posts bleiben in der Sitemap, der User kann
-- pro Eintrag opt-out (z.B. fuer Duplicate-Content, Test-Seiten, Drafts ohne
-- canonical, ...).

ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS in_sitemap BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS in_sitemap BOOLEAN NOT NULL DEFAULT TRUE;
