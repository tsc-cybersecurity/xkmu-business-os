-- =============================================
-- 022: Agent-System Phase 8 — Goal-Templates
-- =============================================
-- Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §8 (Phase 8)

CREATE TABLE IF NOT EXISTS agent_goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  title_template TEXT NOT NULL,
  description_template TEXT,
  required_variables TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  default_budget_cents INTEGER,
  default_budget_tokens INTEGER,
  default_execution_mode VARCHAR(20) NOT NULL DEFAULT 'cron',
  default_priority INTEGER NOT NULL DEFAULT 2,
  default_require_plan_approval BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_goal_templates_slug_active ON agent_goal_templates (slug, is_active);

INSERT INTO agent_goal_templates (slug, name, description, title_template, description_template, required_variables, default_budget_cents, default_priority)
VALUES
  (
    'firma-recherchieren',
    'Firma recherchieren',
    'Recherchiert eine Firma und legt ein Memo unter Resources/firmen/<slug> ab.',
    'Recherche: {{firmenName}}',
    'Recherchiere die Firma "{{firmenName}}" — Branche, Mitarbeiterzahl, Umsatz, Schluesselpersonen, aktuelle News. Nutze service:lead-research und service:website-scraper. Speichere die Zusammenfassung als Memory unter Resources/firmen/{{firmenName}}.md.',
    ARRAY['firmenName'],
    500,
    2
  ),
  (
    'memo-schreiben',
    'Memo schreiben',
    'Schreibt ein kurzes Memo zu einem Thema basierend auf vorhandenem Memory.',
    'Memo: {{thema}}',
    'Schreibe ein praezises Memo (max 500 Worte) zum Thema "{{thema}}". Nutze memory:search um vorhandenes Material zu finden, agent:writer fuer den Fliesstext. Speichere als Memory unter Projects/memos/{{thema}}.md.',
    ARRAY['thema'],
    300,
    2
  ),
  (
    'newsletter-analysieren',
    'Newsletter-URL analysieren',
    'Scrapt eine Newsletter-Quelle und legt strukturierte Notizen ab.',
    'Newsletter-Analyse: {{quelleUrl}}',
    'Scrape die URL "{{quelleUrl}}" via service:website-scraper, extrahiere die wichtigsten 5 Punkte, speichere als Memory unter Resources/newsletter/<auto-slug>.md.',
    ARRAY['quelleUrl'],
    300,
    2
  )
ON CONFLICT (slug) DO NOTHING;
