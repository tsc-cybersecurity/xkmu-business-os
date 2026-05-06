-- Update body of appointment.customer.reminder_1h to friendlier wording.
-- Idempotent: WHERE-clause ensures we only rewrite the known previous body.

UPDATE email_templates
SET body_html = $$<p>Eine kleine Erinnerung: Ihr Termin <strong>{{slot.type_name}}</strong> beginnt in 1 Stunde ({{appointment.start_local}}).</p>
<p>Ort/Form: {{slot.location}}{{slot.location_details}}</p>
<p>Wir freuen uns auf das Gespräch.</p>$$,
    placeholders = '[
      {"key":"slot.type_name","label":"Termin-Art"},
      {"key":"appointment.start_local","label":"Start (lokal)"},
      {"key":"slot.location","label":"Ort/Form"},
      {"key":"slot.location_details","label":"Ort-Details"}
    ]'::jsonb,
    updated_at = now()
WHERE slug = 'appointment.customer.reminder_1h';
