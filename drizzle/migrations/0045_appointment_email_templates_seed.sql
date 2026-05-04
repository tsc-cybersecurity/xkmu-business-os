-- Phase 4: Default email templates for appointment confirmation

-- Customer confirmation
INSERT INTO email_templates (slug, name, subject, body_html, placeholders, is_active)
SELECT
  'appointment.customer.confirmation',
  'Terminbuchung — Bestätigung an Kunde',
  'Ihre Terminbuchung am {{appointment.start_local}}',
  $$<p>Hallo {{customer.name}},</p>
<p>vielen Dank für Ihre Buchung. Hier die Eckdaten Ihres Termins:</p>
<ul>
  <li><strong>Art:</strong> {{slot.type_name}} ({{slot.duration_minutes}} min)</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}} (Zeitzone: {{appointment.timezone}})</li>
  <li><strong>Ort:</strong> {{slot.location}} — {{slot.location_details}}</li>
</ul>
<p>Bei Fragen können Sie sich jederzeit unter dieser E-Mail-Adresse melden.</p>
<p>Viele Grüße<br/>{{org.name}}</p>$$,
  '[
    {"key":"customer.name","label":"Kundenname"},
    {"key":"customer.email","label":"E-Mail"},
    {"key":"customer.phone","label":"Telefon"},
    {"key":"slot.type_name","label":"Termin-Art"},
    {"key":"slot.duration_minutes","label":"Dauer in Minuten"},
    {"key":"slot.location","label":"Ort-Typ"},
    {"key":"slot.location_details","label":"Ort-Details"},
    {"key":"appointment.start_local","label":"Start (lokal)"},
    {"key":"appointment.end_local","label":"Ende (lokal)"},
    {"key":"appointment.timezone","label":"Zeitzone"},
    {"key":"org.name","label":"Firmenname"}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.customer.confirmation');

-- Staff notification
INSERT INTO email_templates (slug, name, subject, body_html, placeholders, is_active)
SELECT
  'appointment.staff.notification',
  'Terminbuchung — Benachrichtigung an Mitarbeiter',
  'Neuer Termin: {{slot.type_name}} mit {{customer.name}} am {{appointment.start_local}}',
  $$<p>Es wurde ein neuer Termin für dich gebucht:</p>
<ul>
  <li><strong>Termin-Art:</strong> {{slot.type_name}} ({{slot.duration_minutes}} min)</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}}</li>
  <li><strong>Kunde:</strong> {{customer.name}} ({{customer.email}}, {{customer.phone}})</li>
  <li><strong>Nachricht:</strong> {{customer.message}}</li>
</ul>$$,
  '[
    {"key":"customer.name","label":"Kundenname"},
    {"key":"customer.email","label":"E-Mail"},
    {"key":"customer.phone","label":"Telefon"},
    {"key":"customer.message","label":"Nachricht des Kunden"},
    {"key":"slot.type_name","label":"Termin-Art"},
    {"key":"slot.duration_minutes","label":"Dauer in Minuten"},
    {"key":"appointment.start_local","label":"Start (lokal)"}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE slug = 'appointment.staff.notification');
