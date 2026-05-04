-- Phase 5: Update existing 2 confirmation templates to include cancel/reschedule links
-- and seed 6 new templates (reminders, customer/staff cancelled, customer/staff rescheduled).
-- All inserts are idempotent via WHERE NOT EXISTS.

-- ---------- UPDATE: existing templates extended with links ----------

UPDATE email_templates
SET subject = 'Ihre Terminbuchung am {{appointment.start_local}}',
    body_html = $$<p>Hallo {{customer.name}},</p>
<p>vielen Dank für Ihre Buchung. Hier die Details:</p>
<ul>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}} (Zeitzone: {{appointment.timezone}})</li>
  <li><strong>Dauer:</strong> {{slot.duration_minutes}} Minuten</li>
  <li><strong>Ort/Form:</strong> {{slot.location}}{{slot.location_details}}</li>
</ul>
<p>Sie können den Termin <a href="{{links.reschedule_url}}">umbuchen</a> oder <a href="{{links.cancel_url}}">stornieren</a>, falls erforderlich.</p>
<p>Bis bald,<br>{{org.name}}</p>$$,
    placeholders = '[
      {"key":"customer.name","label":"Kunde Name"},
      {"key":"slot.type_name","label":"Termin-Art"},
      {"key":"appointment.start_local","label":"Start (lokal)"},
      {"key":"appointment.timezone","label":"Zeitzone"},
      {"key":"slot.duration_minutes","label":"Dauer (min)"},
      {"key":"slot.location","label":"Ort/Form"},
      {"key":"slot.location_details","label":"Ort-Details"},
      {"key":"links.cancel_url","label":"Storno-Link"},
      {"key":"links.reschedule_url","label":"Umbuchungs-Link"},
      {"key":"org.name","label":"Organisation"}
    ]'::jsonb,
    updated_at = now()
WHERE slug = 'appointment.customer.confirmation';

-- ---------- INSERT: 6 new templates ----------

INSERT INTO email_templates (slug, name, subject, body_html, placeholders, is_active)
SELECT
  'appointment.customer.reminder_24h',
  'Termin-Erinnerung 24h vorher',
  'Erinnerung: Termin morgen um {{appointment.start_local}}',
  $$<p>Hallo {{customer.name}},</p>
<p>nur eine kurze Erinnerung an Ihren Termin morgen:</p>
<ul>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}} ({{appointment.timezone}})</li>
  <li><strong>Ort/Form:</strong> {{slot.location}}{{slot.location_details}}</li>
</ul>
<p>Falls Sie nicht teilnehmen können: <a href="{{links.cancel_url}}">stornieren</a> oder <a href="{{links.reschedule_url}}">umbuchen</a>.</p>
<p>Bis morgen,<br>{{org.name}}</p>$$,
  '[
    {"key":"customer.name","label":"Kunde Name"},
    {"key":"slot.type_name","label":"Termin-Art"},
    {"key":"appointment.start_local","label":"Start (lokal)"},
    {"key":"appointment.timezone","label":"Zeitzone"},
    {"key":"slot.location","label":"Ort/Form"},
    {"key":"slot.location_details","label":"Ort-Details"},
    {"key":"links.cancel_url","label":"Storno-Link"},
    {"key":"links.reschedule_url","label":"Umbuchungs-Link"},
    {"key":"org.name","label":"Organisation"}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.customer.reminder_24h');

INSERT INTO email_templates (slug, name, subject, body_html, placeholders, is_active)
SELECT
  'appointment.customer.reminder_1h',
  'Termin-Erinnerung 1h vorher',
  'Ihr Termin in einer Stunde',
  $$<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> beginnt in einer Stunde um {{appointment.start_local}}.</p>
<p>Ort/Form: {{slot.location}}{{slot.location_details}}</p>
<p>Bis gleich,<br>{{org.name}}</p>$$,
  '[
    {"key":"customer.name","label":"Kunde Name"},
    {"key":"slot.type_name","label":"Termin-Art"},
    {"key":"appointment.start_local","label":"Start (lokal)"},
    {"key":"slot.location","label":"Ort/Form"},
    {"key":"slot.location_details","label":"Ort-Details"},
    {"key":"org.name","label":"Organisation"}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.customer.reminder_1h');

INSERT INTO email_templates (slug, name, subject, body_html, placeholders, is_active)
SELECT
  'appointment.customer.cancelled',
  'Termin-Stornierung Kunde',
  'Ihr Termin am {{appointment.start_local}} wurde storniert',
  $$<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> am {{appointment.start_local}} wurde storniert.</p>
<p>Falls Sie einen neuen Termin möchten, buchen Sie gerne wieder über unsere Website.</p>
<p>Viele Grüße,<br>{{org.name}}</p>$$,
  '[
    {"key":"customer.name","label":"Kunde Name"},
    {"key":"slot.type_name","label":"Termin-Art"},
    {"key":"appointment.start_local","label":"Start (lokal)"},
    {"key":"org.name","label":"Organisation"}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.customer.cancelled');

INSERT INTO email_templates (slug, name, subject, body_html, placeholders, is_active)
SELECT
  'appointment.customer.rescheduled',
  'Termin-Verschiebung Kunde',
  'Ihr Termin wurde verschoben — neuer Termin: {{appointment.start_local}}',
  $$<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> wurde verschoben.</p>
<p>Neuer Termin: {{appointment.start_local}} ({{appointment.timezone}})</p>
<p>Sie können weiterhin <a href="{{links.reschedule_url}}">umbuchen</a> oder <a href="{{links.cancel_url}}">stornieren</a>.</p>
<p>Viele Grüße,<br>{{org.name}}</p>$$,
  '[
    {"key":"customer.name","label":"Kunde Name"},
    {"key":"slot.type_name","label":"Termin-Art"},
    {"key":"appointment.start_local","label":"Start (lokal)"},
    {"key":"appointment.timezone","label":"Zeitzone"},
    {"key":"links.cancel_url","label":"Storno-Link"},
    {"key":"links.reschedule_url","label":"Umbuchungs-Link"},
    {"key":"org.name","label":"Organisation"}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.customer.rescheduled');

INSERT INTO email_templates (slug, name, subject, body_html, placeholders, is_active)
SELECT
  'appointment.staff.cancelled',
  'Termin-Stornierung Mitarbeiter',
  'Termin storniert: {{slot.type_name}} mit {{customer.name}} am {{appointment.start_local}}',
  $$<p>Storniert:</p>
<ul>
  <li><strong>Kunde:</strong> {{customer.name}} ({{customer.email}})</li>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Original-Datum:</strong> {{appointment.start_local}}</li>
</ul>$$,
  '[
    {"key":"customer.name","label":"Kunde Name"},
    {"key":"customer.email","label":"Kunde E-Mail"},
    {"key":"slot.type_name","label":"Termin-Art"},
    {"key":"appointment.start_local","label":"Start (lokal)"}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.staff.cancelled');

INSERT INTO email_templates (slug, name, subject, body_html, placeholders, is_active)
SELECT
  'appointment.staff.rescheduled',
  'Termin-Verschiebung Mitarbeiter',
  'Termin verschoben: {{slot.type_name}} mit {{customer.name}} → {{appointment.start_local}}',
  $$<p>Verschoben:</p>
<ul>
  <li><strong>Kunde:</strong> {{customer.name}} ({{customer.email}})</li>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Neuer Termin:</strong> {{appointment.start_local}}</li>
</ul>$$,
  '[
    {"key":"customer.name","label":"Kunde Name"},
    {"key":"customer.email","label":"Kunde E-Mail"},
    {"key":"slot.type_name","label":"Termin-Art"},
    {"key":"appointment.start_local","label":"Start (lokal)"}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.staff.rescheduled');
