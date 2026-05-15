-- ============================================================
-- 061_cms_promo_slots.sql
-- ------------------------------------------------------------
-- Wiederverwendbare Promo-Slots fuer Blog-Inhalte. Pflege im CMS,
-- Einbindung im Blog-Markdown via Platzhalter {promo:slug-name}.
-- Jeder Slot rendert genau einen CMS-Block (block_type + content +
-- settings — gleiche Schema-Struktur wie cms_blocks).
-- ============================================================

CREATE TABLE IF NOT EXISTS cms_promo_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        varchar(120) NOT NULL UNIQUE,
  name        varchar(200) NOT NULL,
  description text,
  block_type  varchar(50)  NOT NULL,
  content     jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_promo_slots_slug   ON cms_promo_slots(slug);
CREATE INDEX IF NOT EXISTS idx_cms_promo_slots_active ON cms_promo_slots(is_active);

-- Beispiel-Slot, damit User direkt einen Live-Test machen kann.
-- Idempotent via slug-UPSERT-Skip.
INSERT INTO cms_promo_slots (slug, name, description, block_type, content, settings, is_active)
VALUES (
  'kontakt-cta',
  'Kontakt-CTA',
  'Standard-Call-to-Action mit Link zum Kontaktformular.',
  'cta',
  jsonb_build_object(
    'title', 'Sie haben Fragen?',
    'description', 'Lassen Sie uns über Ihre IT- und Sicherheitsherausforderungen sprechen — kostenfreies Erstgespräch.',
    'buttons', jsonb_build_array(
      jsonb_build_object('label', 'Kontakt aufnehmen', 'href', '/kontakt', 'variant', 'default')
    )
  ),
  '{}'::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;
