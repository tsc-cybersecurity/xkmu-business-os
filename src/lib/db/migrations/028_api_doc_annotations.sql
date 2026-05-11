-- ============================================================
-- Migration 028: api_doc_annotations
--
-- Persistiert KI-generierte Dokumentation fuer API-Endpoints, die
-- in der handgepflegten Registry (src/lib/api-docs/services/*.ts)
-- nicht erfasst sind. Erlaubt wiederholtes Regenerieren ohne erneute
-- KI-Kosten.
-- ============================================================

CREATE TABLE IF NOT EXISTS api_doc_annotations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method          varchar(10)  NOT NULL,
  path            text         NOT NULL,
  summary         text         NOT NULL,
  description     text,
  request_body    jsonb,
  response_example jsonb,
  curl_example    text         NOT NULL DEFAULT '',
  source          varchar(20)  NOT NULL DEFAULT 'ai_generated',
  model           varchar(100),
  generated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_api_doc_annotations_method_path
  ON api_doc_annotations (method, path);
