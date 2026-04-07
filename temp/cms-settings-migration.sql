-- ============================================================================
-- Migration: Create cms_settings table and migrate design data from tenants
-- ============================================================================

BEGIN;

-- 1. Create table
CREATE TABLE IF NOT EXISTS cms_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key varchar(100) NOT NULL,
  value jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_settings_tenant_key ON cms_settings(tenant_id, key);

-- 2. Migrate existing design data from tenants.settings into cms_settings
INSERT INTO cms_settings (tenant_id, key, value)
SELECT
  t.id,
  'design',
  jsonb_build_object(
    'defaultFont',    COALESCE(t.settings->>'defaultFont', 'ubuntu'),
    'defaultAccent',  COALESCE(t.settings->>'defaultAccent', 'blue'),
    'defaultRadius',  COALESCE(t.settings->>'defaultRadius', 'default'),
    'defaultTheme',   COALESCE(t.settings->>'defaultTheme', 'light'),
    'logoUrl',        COALESCE(t.settings->>'logoUrl', ''),
    'logoAlt',        COALESCE(t.settings->>'logoAlt', 'xKMU'),
    'headerSticky',   COALESCE((t.settings->>'headerSticky')::boolean, true),
    'footerText',     COALESCE(t.settings->>'footerText', ''),
    'contactHeadline',     COALESCE(t.settings->>'contactHeadline', 'Kontakt'),
    'contactDescription',  COALESCE(t.settings->>'contactDescription', ''),
    'contactInterestTags', COALESCE(t.settings->'contactInterestTags', '[]'::jsonb)
  )
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM cms_settings cs
    WHERE cs.tenant_id = t.id AND cs.key = 'design'
  );

-- 3. Clean design keys from tenants.settings (optional, keeps it tidy)
UPDATE tenants
SET settings = settings
  - 'defaultFont' - 'defaultAccent' - 'defaultRadius' - 'defaultTheme'
  - 'logoUrl' - 'logoAlt' - 'headerSticky' - 'footerText'
  - 'contactHeadline' - 'contactDescription' - 'contactInterestTags'
WHERE settings IS NOT NULL
  AND (settings ? 'defaultFont' OR settings ? 'footerText' OR settings ? 'contactInterestTags');

COMMIT;
