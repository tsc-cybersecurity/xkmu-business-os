-- ============================================================
-- 070_shortcode_urls.sql
-- ------------------------------------------------------------
-- Shortcode-System fuer kurze, teilbare URLs (www.xkmu.de/xxxxxx).
-- Wirkt fuer alle CMS-Seiten + Blog-Beitraege. Resolver im
-- Catch-All-Router redirected auf die kanonische URL (slug-basiert).
-- Shortcodes erscheinen NICHT in der sitemap.xml.
--
-- Charset: a-z0-9 (36 Zeichen), Laenge 6 → ~2.18 Mrd Kombinationen.
-- Genug fuer jedes plausible Content-Volumen, gleichzeitig kurz
-- genug um per Telefon weiterzugeben.
-- ============================================================

-- 1) Generator-Funktion: 6 Random-Chars aus a-z0-9. Hat keine Garantie
--    auf Eindeutigkeit — der Caller muss EXCEPTION-LOOP machen.
CREATE OR REPLACE FUNCTION generate_shortcode() RETURNS text AS $$
DECLARE
  alphabet text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result   text := '';
  i        int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(alphabet, (floor(random() * 36) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2) Spalten + unique constraint
ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS shortcode varchar(8);

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS shortcode varchar(8);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_pages_shortcode  ON cms_pages(shortcode)  WHERE shortcode IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_shortcode ON blog_posts(shortcode) WHERE shortcode IS NOT NULL;

-- 3) Backfill — Retry-Loop fuer jede Zeile ohne Shortcode. Eindeutigkeit
--    gilt cross-table (ein Code darf nicht gleichzeitig in beiden Tabellen
--    vorkommen, weil der Resolver beide durchsucht).
DO $$
DECLARE
  rec       record;
  candidate text;
  attempts  int;
  exists_cms  boolean;
  exists_blog boolean;
BEGIN
  -- cms_pages
  FOR rec IN SELECT id FROM cms_pages WHERE shortcode IS NULL LOOP
    attempts := 0;
    LOOP
      candidate := generate_shortcode();
      SELECT EXISTS(SELECT 1 FROM cms_pages  WHERE shortcode = candidate) INTO exists_cms;
      SELECT EXISTS(SELECT 1 FROM blog_posts WHERE shortcode = candidate) INTO exists_blog;
      IF NOT exists_cms AND NOT exists_blog THEN
        UPDATE cms_pages SET shortcode = candidate WHERE id = rec.id;
        EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 50 THEN
        RAISE EXCEPTION 'Could not generate unique shortcode for cms_pages.id=%', rec.id;
      END IF;
    END LOOP;
  END LOOP;

  -- blog_posts
  FOR rec IN SELECT id FROM blog_posts WHERE shortcode IS NULL LOOP
    attempts := 0;
    LOOP
      candidate := generate_shortcode();
      SELECT EXISTS(SELECT 1 FROM cms_pages  WHERE shortcode = candidate) INTO exists_cms;
      SELECT EXISTS(SELECT 1 FROM blog_posts WHERE shortcode = candidate) INTO exists_blog;
      IF NOT exists_cms AND NOT exists_blog THEN
        UPDATE blog_posts SET shortcode = candidate WHERE id = rec.id;
        EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 50 THEN
        RAISE EXCEPTION 'Could not generate unique shortcode for blog_posts.id=%', rec.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;
