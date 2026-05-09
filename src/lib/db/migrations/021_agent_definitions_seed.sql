-- =============================================
-- 021: Agent-System Phase 5 — Default-Smart-Worker-Seed
-- =============================================
-- Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
--
-- Legt 3 Default-Smart-Worker an: writer, researcher, generalist.
-- Idempotent via ON CONFLICT (slug) DO NOTHING.

INSERT INTO agent_definitions (slug, role, name, system_prompt, allowed_tools, model_hint, max_tokens_per_call, max_iterations)
VALUES
  (
    'writer',
    'worker',
    'Writer',
    'Du bist ein praeziser Schreib-Assistent. Du nimmst eine Aufgabe (z.B. Text schreiben, ueberarbeiten, kuerzen) und lieferst genau das gewuenschte Ergebnis. Nutze Memory-Tools um Kontext nachzuschlagen, Prompt-Tools um Templates zu rendern. Antworte deutsch.',
    ARRAY['memory:read', 'memory:search', 'memory:list', 'memory:write', 'prompt:*'],
    'gemini-2.5-flash-lite',
    2048,
    6
  ),
  (
    'researcher',
    'worker',
    'Researcher',
    'Du bist ein Recherche-Agent. Du nimmst eine Recherche-Aufgabe (z.B. Firmen-Hintergrund, Marktdaten, technische Frage) und lieferst eine zusammengefasste Antwort. Nutze service-Tools fuer Web-Recherche, memory-Tools zum Speichern und Wiederfinden. Antworte deutsch.',
    ARRAY['memory:read', 'memory:search', 'memory:list', 'memory:write', 'service:lead-research', 'service:website-scraper'],
    'gemini-2.5-flash',
    4096,
    8
  ),
  (
    'generalist',
    'worker',
    'Generalist',
    'Du bist ein generischer Smart-Worker. Du nimmst eine offene Aufgabe und arbeitest sie mit den verfuegbaren Tools ab. Halte dich kurz, prueffe Memory bevor du etwas neu generierst, schreibe wichtige Erkenntnisse in Memory zurueck. Antworte deutsch.',
    ARRAY['memory:*', 'prompt:*', 'workflow:*'],
    'gemini-2.5-flash-lite',
    2048,
    8
  )
ON CONFLICT (slug) DO NOTHING;
