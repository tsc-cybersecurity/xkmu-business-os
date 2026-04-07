-- Set design defaults in tenant settings
-- Run after design page save if values aren't persisting

UPDATE tenants
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'defaultFont', 'ubuntu',
  'defaultAccent', 'blue',
  'defaultRadius', 'default',
  'defaultTheme', 'light',
  'headerSticky', true,
  'footerText', '© 2026 xKMU digital solutions UG (haftungsbeschränkt) – Alle Rechte vorbehalten.'
)
WHERE id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1);
