-- Seed default workflow: Lead Kontaktformular Pipeline
INSERT INTO workflows (name, description, trigger, steps, is_active)
SELECT
  'Lead Kontaktformular',
  'Automatische Verarbeitung von Kontaktformular-Anfragen: Firma/Person anlegen, Lead verknüpfen, KI-Recherche, Scoring, Benachrichtigung.',
  'contact.submitted',
  '[
    {"action":"find_or_create_company","label":"Firma suchen/erstellen","config":{"fallbackName":"– ohne Firma –"}},
    {"action":"find_or_create_person","label":"Person suchen/erstellen"},
    {"action":"link_lead","label":"Lead verknüpfen"},
    {"action":"ai_research_company","label":"KI-Firmenrecherche","condition":"data.company != null"},
    {"action":"score_lead","label":"Lead bewerten"},
    {"action":"log_activity","label":"Aktivität loggen","config":{"subject":"Kontaktformular ausgefüllt"}},
    {"action":"send_email","label":"Erstantwort senden","config":{"template":"lead_first_response"}},
    {"action":"notify_admin","label":"Admin benachrichtigen"}
  ]'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM workflows WHERE trigger = 'contact.submitted' AND name = 'Lead Kontaktformular'
);
