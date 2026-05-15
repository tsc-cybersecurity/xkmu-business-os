-- ============================================================
-- 065_voice_agent_caller_name.sql
-- ------------------------------------------------------------
-- Globaler Anrufername fuer Voice-Agent. Wird in cms_settings unter
-- key='voice.agent_settings' als JSONB { callerName: string }
-- gespeichert. Default "Lea" (wie in den initialen Templates).
--
-- Templates aus 063 hatten "Lea" hartverdrahtet — durch den
-- Platzhalter {agent_name} ersetzt, der serverseitig im Dispatch
-- vor Forward zu voice.xkmu.de substituiert wird.
-- ============================================================

INSERT INTO cms_settings (key, value)
SELECT 'voice.agent_settings', '{"callerName": "Lea"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM cms_settings WHERE key = 'voice.agent_settings'
);

-- Templates: alle "Lea" durch {agent_name}-Platzhalter ersetzen.
-- REPLACE ist case-sensitive und greift auch in System-Prompt und
-- Greeting. Idempotent: wenn schon ersetzt, keine weitere Wirkung.
UPDATE voice_prompt_templates
SET
  system_prompt = REPLACE(system_prompt, 'Lea', '{agent_name}'),
  greeting      = REPLACE(greeting,      'Lea', '{agent_name}'),
  updated_at    = now()
WHERE
  agent_key = 'outbound-telephony'
  AND (system_prompt LIKE '%Lea%' OR greeting LIKE '%Lea%');
