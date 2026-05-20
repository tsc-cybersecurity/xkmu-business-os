-- ============================================================
-- 079_business_plan_ai_templates.sql
-- ------------------------------------------------------------
-- Sechs AI-Prompt-Templates fuer die Businessplan-Pipeline:
--   1. business_plan.idea_to_story     — rohe Idee → Story
--   2. business_plan.story_to_canvas   — Story → Lean Canvas (9 Boxen)
--   3. business_plan.story_to_kfw      — Story → KfW-Langform-Plan (Markdown)
--   4. business_plan.simulation_question — Plan → Mirofish-Frage formulieren
--   5. business_plan.analyze_simulation  — Plan + Mirofish-Result → Score+Improvements
--   6. business_plan.revise_plan       — Plan + Improvements → ueberarbeiteter Plan
--
-- Idempotent via NOT EXISTS (slug hat keinen UNIQUE constraint).
-- Templates sind als Defaults markiert (is_default=true), Operator kann
-- via /intern/settings/ai-prompts ueberschreiben.
-- ============================================================

-- 1. Idea → Story
INSERT INTO ai_prompt_templates (slug, name, description, system_prompt, user_prompt, output_format, trigger_info, is_active, is_default)
SELECT
  'business_plan.idea_to_story',
  'Businessplan: Idee zu Story',
  'Verwandelt einen rohen Geschaeftsidee-Pitch oder ein strukturiertes Briefing in eine ausformulierte Story als Basis fuer den Plan.',
  'Du bist erfahrener Businessplan-Berater fuer KMU im deutschsprachigen Raum. Du arbeitest pragmatisch, kein Buzzword-Bingo. Aus dem Input formulierst Du eine klare, glaubwuerdige Story (250-400 Woerter, Deutsch, Du-Form), die folgendes deckt: Ausgangsproblem, Zielgruppe, Loesung, Differenzierung, Geschaeftsmodell-Grundidee. Antworte AUSSCHLIESSLICH mit JSON.',
  E'Hier ist die Geschaeftsidee:\n\n{{seedInput}}\n\nInput-Typ: {{inputType}}\n\nFormuliere eine Story als Basis fuer die weitere Plan-Generierung.',
  '{ "story": "Markdown-formatierte Story, 250-400 Woerter, deutsch, Du-Form, keine ueberschriften — Fliesstext" }',
  'Stufe 1 der Businessplan-Pipeline (BusinessPlanService.start). Wird bei jeder Iteration 1 aufgerufen.',
  true, true
WHERE NOT EXISTS (SELECT 1 FROM ai_prompt_templates WHERE slug = 'business_plan.idea_to_story');

-- 2. Story → Canvas
INSERT INTO ai_prompt_templates (slug, name, description, system_prompt, user_prompt, output_format, trigger_info, is_active, is_default)
SELECT
  'business_plan.story_to_canvas',
  'Businessplan: Story zu Lean Canvas',
  'Generiert aus der Story einen Lean Canvas mit 9 Boxen (Problem, Loesung, Schluesselmetriken, Wertversprechen, Unfair Advantage, Kanaele, Kundensegmente, Kostenstruktur, Einnahmequellen).',
  'Du fuellst einen Lean Canvas (Ash Maurya) basierend auf der gegebenen Story aus. Pro Box 1-3 kurze Bullet-Points (jeweils max 12 Woerter). Deutsch, konkret, keine Floskeln. KEIN Markdown im JSON, reiner Text in Arrays. Antworte AUSSCHLIESSLICH mit dem JSON-Objekt.',
  E'Story:\n\n{{story}}\n\nErzeuge den Lean Canvas.',
  '{
  "problem": ["...", "..."],
  "solution": ["...", "..."],
  "keyMetrics": ["...", "..."],
  "uniqueValueProposition": "Ein-Satz-Wertversprechen, max 20 Woerter",
  "unfairAdvantage": ["...", "..."],
  "channels": ["...", "..."],
  "customerSegments": ["...", "..."],
  "costStructure": ["...", "..."],
  "revenueStreams": ["...", "..."]
}',
  'Stufe 2a der Businessplan-Pipeline. Wird aufgerufen wenn mode = "canvas" oder "both" und Iteration ist 1.',
  true, true
WHERE NOT EXISTS (SELECT 1 FROM ai_prompt_templates WHERE slug = 'business_plan.story_to_canvas');

-- 3. Story → KfW-Langform
INSERT INTO ai_prompt_templates (slug, name, description, system_prompt, user_prompt, output_format, trigger_info, is_active, is_default)
SELECT
  'business_plan.story_to_kfw',
  'Businessplan: Story zu KfW-Langform',
  'Erstellt aus der Story einen ausfuehrlichen Businessplan im KfW-Foerderantrag-Stil (Executive Summary, Geschaeftsidee, Markt, Wettbewerb, Marketing, Team, Finanzplan-Skizze, SWOT, Risiken).',
  'Du schreibst einen vollstaendigen Businessplan im KfW-Stil als Markdown. Gliederung mit ## H2 pro Abschnitt: Executive Summary, Geschaeftsidee, Zielmarkt & Kunden, Wettbewerb & Differenzierung, Marketing & Vertrieb, Team & Organisation, Finanzplan (qualitativ — keine erfundenen Zahlen, sondern Logik), SWOT-Analyse, Risiken & Gegenmassnahmen, Meilensteine 12 Monate. Deutsch, sachlich-professionell, 1500-2500 Woerter. Antworte AUSSCHLIESSLICH mit dem JSON-Objekt — das Markdown landet im "markdown"-Feld.',
  E'Story:\n\n{{story}}\n\nErzeuge den KfW-konformen Businessplan.',
  '{ "markdown": "## Executive Summary\\n\\n…\\n\\n## Geschaeftsidee\\n\\n…\\n\\n(usw. — alle 10 Abschnitte)" }',
  'Stufe 2b der Businessplan-Pipeline. Wird aufgerufen wenn mode = "kfw" oder "both" und Iteration ist 1.',
  true, true
WHERE NOT EXISTS (SELECT 1 FROM ai_prompt_templates WHERE slug = 'business_plan.story_to_kfw');

-- 4. Plan → Mirofish-Frage
INSERT INTO ai_prompt_templates (slug, name, description, system_prompt, user_prompt, output_format, trigger_info, is_active, is_default)
SELECT
  'business_plan.simulation_question',
  'Businessplan: Mirofish-Simulationsfrage',
  'Formuliert die natuerlichsprachliche Frage, die zusammen mit dem Plan an Mirofish geschickt wird (z.B. "Simuliere, wie KMU-Inhaber in Thueringen auf folgendes Angebot reagieren …").',
  'Du formulierst eine prazise Simulationsfrage fuer Mirofish (ein KI-Tool, das Zielgruppen-Reaktionen modelliert). Die Frage soll: (a) den Markteinfuehrungs-Kontext klar setzen, (b) die relevanten Zielgruppen-Personas benennen (3-5), (c) konkrete Reaktions-Dimensionen abfragen (Preisakzeptanz, Vertrauen, Wechselbereitschaft). Deutsch, eine zusammenhaengende Frage (kein Bullet-Point-Listing), 80-150 Woerter. Antworte AUSSCHLIESSLICH mit dem JSON-Objekt.',
  E'Hier ist der aktuelle Businessplan-Stand:\n\nMode: {{mode}}\nSeed-Input:\n{{seedInput}}\n\nPlan (Auszug):\n{{planExcerpt}}\n\nFormuliere die Simulationsfrage fuer Mirofish.',
  '{ "question": "Eine zusammenhaengende natuerlichsprachliche Simulationsfrage, 80-150 Woerter, deutsch." }',
  'Stufe 3a der Businessplan-Pipeline (vor MirofishClient.simulate). Wird pro Iteration einmal aufgerufen.',
  true, true
WHERE NOT EXISTS (SELECT 1 FROM ai_prompt_templates WHERE slug = 'business_plan.simulation_question');

-- 5. Mirofish-Result → Score + Improvements
INSERT INTO ai_prompt_templates (slug, name, description, system_prompt, user_prompt, output_format, trigger_info, is_active, is_default)
SELECT
  'business_plan.analyze_simulation',
  'Businessplan: Simulations-Analyse',
  'Bewertet den Mirofish-Simulationsbericht gegen den Plan und vergibt einen Score (0-100) plus konkrete Verbesserungsvorschlaege fuer die naechste Iteration.',
  'Du bist Investment-Analyst und bewertest, wie gut der Businessplan auf die simulierten Marktreaktionen einzahlt. Score (0-100): >= 80 = bereit, 60-79 = solide aber optimierbar, 40-59 = Schwaechen, < 40 = grundsaetzlich neu denken. Begruende den Score durch konkrete Beobachtungen aus dem Simulationsbericht. Improvements muessen UMSETZBAR sein (nicht "mehr Markt-Research") — z.B. "Preisanker auf 199 EUR senken, weil Persona X bei 299 als unsicher reagiert". 3-7 Improvements. Antworte AUSSCHLIESSLICH mit dem JSON-Objekt.',
  E'Plan:\n{{plan}}\n\nMirofish-Simulationsbericht:\n{{simulationResult}}\n\nBewerte und gib konkrete Verbesserungsvorschlaege.',
  '{
  "score": 75,
  "reasoning": "1-2 Saetze warum dieser Score",
  "strengths": ["Punkt 1", "Punkt 2"],
  "weaknesses": ["Punkt 1", "Punkt 2"],
  "improvements": ["Konkrete umsetzbare Aenderung 1", "...", "..."]
}',
  'Stufe 3b der Businessplan-Pipeline (nach Mirofish-Simulation). Score steuert Stop-Bedingung der Iterationsschleife.',
  true, true
WHERE NOT EXISTS (SELECT 1 FROM ai_prompt_templates WHERE slug = 'business_plan.analyze_simulation');

-- 6. Plan + Improvements → ueberarbeiteter Plan
INSERT INTO ai_prompt_templates (slug, name, description, system_prompt, user_prompt, output_format, trigger_info, is_active, is_default)
SELECT
  'business_plan.revise_plan',
  'Businessplan: Plan ueberarbeiten',
  'Generiert eine neue Plan-Version basierend auf dem alten Plan + den konkreten Improvements aus der Analyse. Mode bestimmt, ob Canvas, KfW oder beides erzeugt wird.',
  'Du ueberarbeitest einen bestehenden Businessplan basierend auf konkreten Improvements. Die Aenderungen muessen die Improvements abdecken — nicht oberflaechlich, sondern an den richtigen Stellen substantiell. Behalte stabile Elemente bei (Story-Kern, Zielgruppe), aenderst aber alles was die Improvements adressieren. Output-Struktur identisch zur ursprueglichen Plan-Form (Canvas-Boxen oder KfW-Markdown oder beides — abhaengig von mode). Antworte AUSSCHLIESSLICH mit dem JSON-Objekt.',
  E'Mode: {{mode}}\n\nVorheriger Plan:\n{{previousPlan}}\n\nKonkrete Improvements aus der letzten Analyse:\n{{improvements}}\n\nErzeuge die neue Plan-Version. Bei mode "canvas" nur canvas-Feld, bei "kfw" nur markdown-Feld, bei "both" beide.',
  '{
  "canvas": {
    "problem": ["..."], "solution": ["..."], "keyMetrics": ["..."],
    "uniqueValueProposition": "...", "unfairAdvantage": ["..."],
    "channels": ["..."], "customerSegments": ["..."],
    "costStructure": ["..."], "revenueStreams": ["..."]
  },
  "markdown": "## Executive Summary…"
}',
  'Stufe 2c der Businessplan-Pipeline. Wird ab Iteration 2 statt idea_to_story+story_to_X aufgerufen.',
  true, true
WHERE NOT EXISTS (SELECT 1 FROM ai_prompt_templates WHERE slug = 'business_plan.revise_plan');
