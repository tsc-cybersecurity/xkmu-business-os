-- ============================================================================
-- CMS Slug Rename: SEO-friendly module slugs
-- Renames e.g. /it-beratung/b5 → /it-beratung/b5-it-standardisierung-arbeitsplatz-it
-- Also updates all href references in cms_blocks content JSON.
-- ============================================================================

BEGIN;

-- ── Step 1: Rename page slugs ──────────────────────────────────────────────

-- KI-Beratung (A1–A5)
UPDATE cms_pages SET slug = '/ki-beratung/a1-ki-quick-start-potenzialanalyse',           updated_at = now() WHERE slug = '/ki-beratung/a1';
UPDATE cms_pages SET slug = '/ki-beratung/a2-ki-implementierung-automationen-workflows',  updated_at = now() WHERE slug = '/ki-beratung/a2';
UPDATE cms_pages SET slug = '/ki-beratung/a3-ki-assistenten-chatbots',                    updated_at = now() WHERE slug = '/ki-beratung/a3';
UPDATE cms_pages SET slug = '/ki-beratung/a4-prompting-templates-governance',             updated_at = now() WHERE slug = '/ki-beratung/a4';
UPDATE cms_pages SET slug = '/ki-beratung/a5-ki-schulungen-enablement',                   updated_at = now() WHERE slug = '/ki-beratung/a5';

-- IT-Beratung (B1–B5)
UPDATE cms_pages SET slug = '/it-beratung/b1-it-assessment-stabilitaetscheck',            updated_at = now() WHERE slug = '/it-beratung/b1';
UPDATE cms_pages SET slug = '/it-beratung/b2-it-architektur-modernisierung',              updated_at = now() WHERE slug = '/it-beratung/b2';
UPDATE cms_pages SET slug = '/it-beratung/b3-systemintegration-prozess-it',               updated_at = now() WHERE slug = '/it-beratung/b3';
UPDATE cms_pages SET slug = '/it-beratung/b4-betrieb-monitoring-dokumentation',           updated_at = now() WHERE slug = '/it-beratung/b4';
UPDATE cms_pages SET slug = '/it-beratung/b5-it-standardisierung-arbeitsplatz-it',        updated_at = now() WHERE slug = '/it-beratung/b5';

-- Cybersecurity (C1–C6)
UPDATE cms_pages SET slug = '/cybersecurity/c1-security-quick-check',                     updated_at = now() WHERE slug = '/cybersecurity/c1';
UPDATE cms_pages SET slug = '/cybersecurity/c2-hardening-sicherheitsbaselines',           updated_at = now() WHERE slug = '/cybersecurity/c2';
UPDATE cms_pages SET slug = '/cybersecurity/c3-backup-recovery-ransomware-resilienz',     updated_at = now() WHERE slug = '/cybersecurity/c3';
UPDATE cms_pages SET slug = '/cybersecurity/c4-incident-response-playbooks',              updated_at = now() WHERE slug = '/cybersecurity/c4';
UPDATE cms_pages SET slug = '/cybersecurity/c5-security-awareness-phishing-schutz',       updated_at = now() WHERE slug = '/cybersecurity/c5';
UPDATE cms_pages SET slug = '/cybersecurity/c6-datenschutz-compliance-unterstuetzung',    updated_at = now() WHERE slug = '/cybersecurity/c6';

-- Kombinations-Module (D1–D3)
UPDATE cms_pages SET slug = '/loesungen/d1-ki-sicher-einfuehren',                         updated_at = now() WHERE slug = '/loesungen/d1';
UPDATE cms_pages SET slug = '/loesungen/d2-sicher-automatisieren',                        updated_at = now() WHERE slug = '/loesungen/d2';
UPDATE cms_pages SET slug = '/loesungen/d3-incident-ready-organisation',                  updated_at = now() WHERE slug = '/loesungen/d3';


-- ── Step 2: Update all href references in cms_blocks content JSON ───────────
-- This catches service-cards items, CTA buttons, features links, etc.

UPDATE cms_blocks
SET content = replace(replace(replace(replace(replace(
    replace(replace(replace(replace(replace(
    replace(replace(replace(replace(replace(
    replace(replace(replace(replace(
      content::text,
      '"/ki-beratung/a1"',  '"/ki-beratung/a1-ki-quick-start-potenzialanalyse"'),
      '"/ki-beratung/a2"',  '"/ki-beratung/a2-ki-implementierung-automationen-workflows"'),
      '"/ki-beratung/a3"',  '"/ki-beratung/a3-ki-assistenten-chatbots"'),
      '"/ki-beratung/a4"',  '"/ki-beratung/a4-prompting-templates-governance"'),
      '"/ki-beratung/a5"',  '"/ki-beratung/a5-ki-schulungen-enablement"'),
      '"/it-beratung/b1"',  '"/it-beratung/b1-it-assessment-stabilitaetscheck"'),
      '"/it-beratung/b2"',  '"/it-beratung/b2-it-architektur-modernisierung"'),
      '"/it-beratung/b3"',  '"/it-beratung/b3-systemintegration-prozess-it"'),
      '"/it-beratung/b4"',  '"/it-beratung/b4-betrieb-monitoring-dokumentation"'),
      '"/it-beratung/b5"',  '"/it-beratung/b5-it-standardisierung-arbeitsplatz-it"'),
      '"/cybersecurity/c1"','"/cybersecurity/c1-security-quick-check"'),
      '"/cybersecurity/c2"','"/cybersecurity/c2-hardening-sicherheitsbaselines"'),
      '"/cybersecurity/c3"','"/cybersecurity/c3-backup-recovery-ransomware-resilienz"'),
      '"/cybersecurity/c4"','"/cybersecurity/c4-incident-response-playbooks"'),
      '"/cybersecurity/c5"','"/cybersecurity/c5-security-awareness-phishing-schutz"'),
      '"/cybersecurity/c6"','"/cybersecurity/c6-datenschutz-compliance-unterstuetzung"'),
      '"/loesungen/d1"',    '"/loesungen/d1-ki-sicher-einfuehren"'),
      '"/loesungen/d2"',    '"/loesungen/d2-sicher-automatisieren"'),
      '"/loesungen/d3"',    '"/loesungen/d3-incident-ready-organisation"')
    )::jsonb,
    updated_at = now()
WHERE content::text ~ '"/ki-beratung/a[1-5]"'
   OR content::text ~ '"/it-beratung/b[1-5]"'
   OR content::text ~ '"/cybersecurity/c[1-6]"'
   OR content::text ~ '"/loesungen/d[1-3]"';


-- ── Step 3: Update published_blocks on affected pages ───────────────────────
-- Rebuild published_blocks from live blocks for all published pages that
-- have module links or are module pages themselves.

UPDATE cms_pages p
SET published_blocks = (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'blockType', b.block_type,
          'sortOrder', b.sort_order,
          'content', b.content,
          'settings', b.settings,
          'isVisible', b.is_visible
        ) ORDER BY b.sort_order
      )
      FROM cms_blocks b
      WHERE b.page_id = p.id
    ),
    has_draft_changes = false,
    updated_at = now()
WHERE p.status = 'published'
  AND (
    p.slug LIKE '/ki-beratung/%'
    OR p.slug LIKE '/it-beratung/%'
    OR p.slug LIKE '/cybersecurity/%'
    OR p.slug LIKE '/loesungen/%'
    OR p.slug = '/'
    OR p.slug = '/ki-beratung'
    OR p.slug = '/it-beratung'
    OR p.slug = '/cybersecurity'
    OR p.slug = '/loesungen'
  );

COMMIT;
