-- Set design defaults in tenant settings
-- Run after design page save if values aren't persisting

UPDATE tenants
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'defaultFont', 'ubuntu',
  'defaultAccent', 'blue',
  'defaultRadius', 'default',
  'defaultTheme', 'light',
  'headerSticky', true,
  'footerText', '© 2026 xKMU digital solutions UG (haftungsbeschränkt) – Alle Rechte vorbehalten.',
  'contactHeadline', 'Kontakt',
  'contactDescription', 'Haben Sie Fragen oder möchten Sie mehr über unsere Leistungen erfahren? Schreiben Sie uns!',
  'contactInterestTags', '["KI-Beratung","KI-Automatisierung","KI-Assistenten & Chatbots","IT-Assessment","IT-Architektur & Cloud","Systemintegration","Security Quick Check","Hardening & Baselines","Backup & Recovery","Incident Response","Security Awareness","Datenschutz & Compliance","NIS-2 Unterstützung","Kombinations-Modul","Managed Services"]'::jsonb
)
WHERE id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1);
