-- =============================================================================
-- xKMU Incident Response Playbook — PostgreSQL Migration
-- Schema Version: 1.0.0
-- Generated: 2025-01-01
-- Kompatibilität: PostgreSQL 14+
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Trigram-Index für Volltext-Suche

-- -----------------------------------------------------------------------------
-- ENUM Types
-- -----------------------------------------------------------------------------

CREATE TYPE ir_series AS ENUM ('I','II','III','IV','V','VI');

CREATE TYPE ir_severity AS ENUM (
  'LOW','MEDIUM','HIGH','CRITICAL','VARIABLE'
);

CREATE TYPE ir_likelihood AS ENUM (
  'LOW','MEDIUM','HIGH','VERY_HIGH'
);

CREATE TYPE ir_financial_risk AS ENUM (
  'LOW','MEDIUM','HIGH','VERY_HIGH'
);

CREATE TYPE ir_action_phase AS ENUM (
  'IMMEDIATE',   -- 0–30 Min
  'SHORT',       -- 30 Min–4 Std
  'MEDIUM',      -- 4–24 Std
  'LONG'         -- 24 Std+
);

CREATE TYPE ir_action_category AS ENUM (
  'CONTAINMENT',
  'ANALYSIS',
  'COMMUNICATION',
  'RECOVERY',
  'PREVENTION',
  'WARNING',
  'LEGAL'
);

CREATE TYPE ir_responsible AS ENUM (
  'IT_ADMIN',
  'MANAGEMENT',
  'HR',
  'FINANCE',
  'LEGAL',
  'DATA_PROTECTION_OFFICER',
  'XKMU_SUPPORT',
  'ALL_STAFF',
  'AFFECTED_USER',
  'EXTERNAL_FORENSICS',
  'EXTERNAL_LAWYER'
);

CREATE TYPE ir_contact_type AS ENUM (
  'INTERNAL',
  'AUTHORITY',
  'EXTERNAL_SERVICE',
  'INSURANCE',
  'PARTNER'
);

CREATE TYPE ir_checklist_category AS ENUM (
  'EVIDENCE',
  'LEGAL',
  'TECHNICAL',
  'COMMUNICATION',
  'FINANCIAL'
);

CREATE TYPE ir_lessons_category AS ENUM (
  'TECHNICAL',
  'PROCESS',
  'AWARENESS',
  'LEGAL',
  'ORGANISATIONAL'
);

CREATE TYPE ir_reference_type AS ENUM (
  'LEGAL',
  'STANDARD',
  'TOOL',
  'AUTHORITY',
  'GUIDE'
);

CREATE TYPE ir_indicator_type AS ENUM (
  'LOG_PATTERN',
  'BEHAVIORAL',
  'ALERT',
  'EXTERNAL_REPORT',
  'USER_REPORT'
);

-- -----------------------------------------------------------------------------
-- TABLE: scenarios
-- Kernentität — ein Szenario pro Zeile
-- -----------------------------------------------------------------------------
CREATE TABLE ir_scenarios (
  -- Identität
  id                  VARCHAR(10)        NOT NULL,          -- 'S-001'
  slug                VARCHAR(100)       NOT NULL,          -- 'phishing-klick'
  version             VARCHAR(20)        NOT NULL DEFAULT '1.0.0',
  series              ir_series          NOT NULL,

  -- Metadaten
  title               VARCHAR(200)       NOT NULL,
  subtitle            TEXT,
  emoji               VARCHAR(10),
  color_hex           CHAR(6),           -- ohne #
  tags                TEXT[]             NOT NULL DEFAULT '{}',
  affected_systems    TEXT[]             NOT NULL DEFAULT '{}',

  -- Klassifizierung
  severity            ir_severity        NOT NULL,
  severity_label      VARCHAR(50),
  likelihood          ir_likelihood      NOT NULL,
  dsgvo_relevant      BOOLEAN            NOT NULL DEFAULT FALSE,
  nis2_relevant       BOOLEAN            NOT NULL DEFAULT FALSE,
  financial_risk      ir_financial_risk  NOT NULL,
  avg_damage_eur_min  INTEGER,
  avg_damage_eur_max  INTEGER,

  -- Inhalt
  overview            TEXT               NOT NULL,

  -- Versionierung
  created_at          DATE               NOT NULL DEFAULT CURRENT_DATE,
  updated_at          DATE               NOT NULL DEFAULT CURRENT_DATE,
  deprecated_at       DATE,              -- Null = aktiv
  created_by          VARCHAR(100)       DEFAULT 'xKMU digital solutions',

  -- Constraints
  CONSTRAINT ir_scenarios_pkey PRIMARY KEY (id),
  CONSTRAINT ir_scenarios_slug_unique UNIQUE (slug),
  CONSTRAINT ir_scenarios_id_format CHECK (id ~ '^S-\d{3}$'),
  CONSTRAINT ir_scenarios_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT ir_scenarios_color_format CHECK (color_hex ~ '^[0-9A-Fa-f]{6}$'),
  CONSTRAINT ir_scenarios_damage_check CHECK (
    avg_damage_eur_min IS NULL OR avg_damage_eur_max IS NULL OR
    avg_damage_eur_min <= avg_damage_eur_max
  ),
  CONSTRAINT ir_scenarios_version_format CHECK (version ~ '^\d+\.\d+\.\d+$')
);

COMMENT ON TABLE ir_scenarios IS 'Stammdaten eines IR-Szenarios (ein Szenario = eine Zeile)';
COMMENT ON COLUMN ir_scenarios.id IS 'Stabiler Business-Key, Format S-001..S-999';
COMMENT ON COLUMN ir_scenarios.tags IS 'Array von lowercase Stichwörtern für Filterung';
COMMENT ON COLUMN ir_scenarios.color_hex IS '6-stelliger HEX-Code ohne # für UI-Darstellung';

-- -----------------------------------------------------------------------------
-- TABLE: detection_indicators
-- Erkennungsmerkmale / Indikatoren für ein Szenario
-- -----------------------------------------------------------------------------
CREATE TABLE ir_detection_indicators (
  id              SERIAL         PRIMARY KEY,
  scenario_id     VARCHAR(10)    NOT NULL REFERENCES ir_scenarios(id) ON DELETE CASCADE,
  type            ir_indicator_type NOT NULL,
  description     TEXT           NOT NULL,
  threshold       VARCHAR(200),  -- z.B. ">50 Fehlversuche / 5 Min"
  sequence        SMALLINT       NOT NULL DEFAULT 1,

  CONSTRAINT ir_detection_indicators_scenario_seq UNIQUE (scenario_id, sequence)
);

COMMENT ON TABLE ir_detection_indicators IS 'Technische und verhaltensbasierte Erkennungsmerkmale pro Szenario';

-- -----------------------------------------------------------------------------
-- TABLE: actions
-- Sofortmaßnahmen — zeitgestaffelt, priorisiert
-- -----------------------------------------------------------------------------
CREATE TABLE ir_actions (
  id                    VARCHAR(30)        NOT NULL,   -- 'ACT-001-001'
  scenario_id           VARCHAR(10)        NOT NULL REFERENCES ir_scenarios(id) ON DELETE CASCADE,

  phase                 ir_action_phase    NOT NULL,
  time_window_minutes   INTEGER,           -- NULL = kein festes Zeitfenster
  time_label            VARCHAR(50),       -- z.B. "0–5 Min", "SOFORT"
  priority              SMALLINT           NOT NULL,
  category              ir_action_category NOT NULL,
  responsible           ir_responsible,    -- NULL erlaubt (z.B. bei Warnings)
  action                TEXT               NOT NULL,
  detail                TEXT,
  do_not                BOOLEAN            NOT NULL DEFAULT FALSE,  -- TRUE = NICHT TUN
  tool_hint             TEXT,

  CONSTRAINT ir_actions_pkey PRIMARY KEY (id),
  CONSTRAINT ir_actions_id_format CHECK (
    id ~ '^ACT-\d{3}-(\d{3}(-WARNING-\d{3})?|WARNING-\d{3})$'
  ),
  CONSTRAINT ir_actions_priority_positive CHECK (priority > 0),
  CONSTRAINT ir_actions_time_positive CHECK (
    time_window_minutes IS NULL OR time_window_minutes >= 0
  )
);

COMMENT ON TABLE ir_actions IS 'Einzelne Handlungsschritte mit Zeitfenster und Priorität';
COMMENT ON COLUMN ir_actions.do_not IS 'TRUE markiert "NICHT TUN"-Warnungen (rote Hinweise im Playbook)';
COMMENT ON COLUMN ir_actions.priority IS '1=höchste Priorität; 99=Warnings am Ende';

-- -----------------------------------------------------------------------------
-- TABLE: escalation_levels
-- Meldestufen (max. 4 pro Szenario)
-- -----------------------------------------------------------------------------
CREATE TABLE ir_escalation_levels (
  id              VARCHAR(15)    NOT NULL,   -- 'ESC-001-001'
  scenario_id     VARCHAR(10)    NOT NULL REFERENCES ir_scenarios(id) ON DELETE CASCADE,

  level           SMALLINT       NOT NULL,   -- 1..4
  label           VARCHAR(100)   NOT NULL,
  color_hex       CHAR(6),
  deadline_hours  NUMERIC(6,2),  -- NULL = keine feste Frist; z.B. 0.25 = 15 Min
  condition       VARCHAR(200),  -- z.B. 'if_dsgvo_relevant'

  CONSTRAINT ir_escalation_levels_pkey PRIMARY KEY (id),
  CONSTRAINT ir_escalation_levels_id_format CHECK (id ~ '^ESC-\d{3}-\d{3}$'),
  CONSTRAINT ir_escalation_levels_level_range CHECK (level BETWEEN 1 AND 4),
  CONSTRAINT ir_escalation_levels_unique_level UNIQUE (scenario_id, level),
  CONSTRAINT ir_escalation_levels_deadline_positive CHECK (
    deadline_hours IS NULL OR deadline_hours >= 0
  )
);

COMMENT ON TABLE ir_escalation_levels IS 'Meldestufen 1–4 pro Szenario (intern → Behörden → Partner → Optional)';

-- -----------------------------------------------------------------------------
-- TABLE: escalation_recipients
-- Empfänger je Meldestufe (1:N)
-- -----------------------------------------------------------------------------
CREATE TABLE ir_escalation_recipients (
  id                  SERIAL         PRIMARY KEY,
  escalation_level_id VARCHAR(15)    NOT NULL REFERENCES ir_escalation_levels(id) ON DELETE CASCADE,

  role                VARCHAR(200)   NOT NULL,    -- Freitext, z.B. "BSI Meldestelle"
  contact_type        ir_contact_type NOT NULL,
  legal_basis         VARCHAR(100),               -- z.B. "DSGVO Art. 33"
  message             TEXT,                       -- Hinweis für den Ansprechpartner
  condition           VARCHAR(200),               -- z.B. "if_criminal_act"
  sequence            SMALLINT       NOT NULL DEFAULT 1
);

COMMENT ON TABLE ir_escalation_recipients IS 'Konkrete Ansprechpartner / Empfänger je Meldestufe';

-- -----------------------------------------------------------------------------
-- TABLE: recovery_steps
-- Wiederherstellungsschritte — geordnet, mit optionaler Abhängigkeit
-- -----------------------------------------------------------------------------
CREATE TABLE ir_recovery_steps (
  id              VARCHAR(15)    NOT NULL,   -- 'REC-001-001'
  scenario_id     VARCHAR(10)    NOT NULL REFERENCES ir_scenarios(id) ON DELETE CASCADE,

  phase_label     VARCHAR(100)   NOT NULL,   -- z.B. "Forensik", "Bereinigung"
  sequence        SMALLINT       NOT NULL,
  action          TEXT           NOT NULL,
  detail          TEXT,
  responsible     ir_responsible NOT NULL,
  depends_on      VARCHAR(15),               -- FK auf anderen REC-Step (self-ref)

  CONSTRAINT ir_recovery_steps_pkey PRIMARY KEY (id),
  CONSTRAINT ir_recovery_steps_id_format CHECK (id ~ '^REC-\d{3}-\d{3}$'),
  CONSTRAINT ir_recovery_steps_unique_seq UNIQUE (scenario_id, sequence),
  CONSTRAINT ir_recovery_steps_no_self_dep CHECK (id != depends_on),
  CONSTRAINT ir_recovery_steps_depends_on_fk FOREIGN KEY (depends_on)
    REFERENCES ir_recovery_steps(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE ir_recovery_steps IS 'Geordnete Wiederherstellungsschritte mit optionalen Abhängigkeiten';
COMMENT ON COLUMN ir_recovery_steps.depends_on IS 'REC-ID einer Voraussetzungs-Schritt (DAG-Struktur möglich)';

-- -----------------------------------------------------------------------------
-- TABLE: checklist_items
-- Dokumentationspflichten — ausdruckbar, abhakbar
-- -----------------------------------------------------------------------------
CREATE TABLE ir_checklist_items (
  id              VARCHAR(15)    NOT NULL,   -- 'CHK-001-001'
  scenario_id     VARCHAR(10)    NOT NULL REFERENCES ir_scenarios(id) ON DELETE CASCADE,

  sequence        SMALLINT       NOT NULL,
  category        ir_checklist_category NOT NULL,
  item            TEXT           NOT NULL,
  mandatory       BOOLEAN        NOT NULL DEFAULT TRUE,
  dsgvo_required  BOOLEAN        NOT NULL DEFAULT FALSE,

  CONSTRAINT ir_checklist_items_pkey PRIMARY KEY (id),
  CONSTRAINT ir_checklist_items_id_format CHECK (id ~ '^CHK-\d{3}-\d{3}$'),
  CONSTRAINT ir_checklist_items_unique_seq UNIQUE (scenario_id, sequence)
);

COMMENT ON TABLE ir_checklist_items IS 'Pflicht-Dokumentationspunkte — mandatory=TRUE ist immer erforderlich, dsgvo_required=TRUE ist DSGVO-Pflicht';

-- -----------------------------------------------------------------------------
-- TABLE: lessons_learned
-- Prüffragen für die Nachbereitung
-- -----------------------------------------------------------------------------
CREATE TABLE ir_lessons_learned (
  id                  VARCHAR(15)    NOT NULL,   -- 'LL-001-001'
  scenario_id         VARCHAR(10)    NOT NULL REFERENCES ir_scenarios(id) ON DELETE CASCADE,

  question            TEXT           NOT NULL,
  category            ir_lessons_category NOT NULL,
  maps_to_control     VARCHAR(50),   -- z.B. "BSI ORP.4.A3", "ISO 27001 A.12.6.1"

  CONSTRAINT ir_lessons_learned_pkey PRIMARY KEY (id),
  CONSTRAINT ir_lessons_learned_id_format CHECK (id ~ '^LL-\d{3}-\d{3}$')
);

COMMENT ON TABLE ir_lessons_learned IS 'Retrospektiv-Fragen zur Schwachstellenanalyse nach einem Vorfall';
COMMENT ON COLUMN ir_lessons_learned.maps_to_control IS 'Mapping auf BSI IT-Grundschutz oder ISO 27001 Baustein';

-- -----------------------------------------------------------------------------
-- TABLE: references
-- Externe Quellen, Tools, Gesetze, Standards
-- -----------------------------------------------------------------------------
CREATE TABLE ir_references (
  id              SERIAL         PRIMARY KEY,
  scenario_id     VARCHAR(10)    NOT NULL REFERENCES ir_scenarios(id) ON DELETE CASCADE,

  type            ir_reference_type NOT NULL,
  name            VARCHAR(300)   NOT NULL,
  url             TEXT,          -- validiert durch Anwendungsschicht

  CONSTRAINT ir_references_name_nonempty CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE ir_references IS 'Externe Links, Standards, Behörden und Tools pro Szenario';

-- -----------------------------------------------------------------------------
-- INDEXES — Performance für typische Abfragen
-- -----------------------------------------------------------------------------

-- Szenarien-Suche
CREATE INDEX idx_scenarios_series       ON ir_scenarios(series);
CREATE INDEX idx_scenarios_severity     ON ir_scenarios(severity);
CREATE INDEX idx_scenarios_dsgvo        ON ir_scenarios(dsgvo_relevant);
CREATE INDEX idx_scenarios_nis2         ON ir_scenarios(nis2_relevant);
CREATE INDEX idx_scenarios_active       ON ir_scenarios(deprecated_at) WHERE deprecated_at IS NULL;
CREATE INDEX idx_scenarios_tags         ON ir_scenarios USING GIN(tags);
CREATE INDEX idx_scenarios_systems      ON ir_scenarios USING GIN(affected_systems);
CREATE INDEX idx_scenarios_title_trgm   ON ir_scenarios USING GIN(title gin_trgm_ops);

-- Actions
CREATE INDEX idx_actions_scenario       ON ir_actions(scenario_id);
CREATE INDEX idx_actions_phase          ON ir_actions(scenario_id, phase);
CREATE INDEX idx_actions_do_not         ON ir_actions(scenario_id, do_not);
CREATE INDEX idx_actions_priority       ON ir_actions(scenario_id, priority);

-- Escalation
CREATE INDEX idx_esc_levels_scenario    ON ir_escalation_levels(scenario_id);
CREATE INDEX idx_esc_recipients_level   ON ir_escalation_recipients(escalation_level_id);
CREATE INDEX idx_esc_recipients_type    ON ir_escalation_recipients(contact_type);

-- Recovery
CREATE INDEX idx_recovery_scenario      ON ir_recovery_steps(scenario_id);
CREATE INDEX idx_recovery_sequence      ON ir_recovery_steps(scenario_id, sequence);
CREATE INDEX idx_recovery_depends       ON ir_recovery_steps(depends_on) WHERE depends_on IS NOT NULL;

-- Checklist
CREATE INDEX idx_checklist_scenario     ON ir_checklist_items(scenario_id);
CREATE INDEX idx_checklist_dsgvo        ON ir_checklist_items(scenario_id, dsgvo_required);
CREATE INDEX idx_checklist_mandatory    ON ir_checklist_items(scenario_id, mandatory);

-- Lessons
CREATE INDEX idx_lessons_scenario       ON ir_lessons_learned(scenario_id);
CREATE INDEX idx_lessons_category       ON ir_lessons_learned(category);
CREATE INDEX idx_lessons_control        ON ir_lessons_learned(maps_to_control) WHERE maps_to_control IS NOT NULL;

-- References
CREATE INDEX idx_references_scenario    ON ir_references(scenario_id);
CREATE INDEX idx_references_type        ON ir_references(type);

-- -----------------------------------------------------------------------------
-- VIEWS — häufige Abfragen vorgebaut
-- -----------------------------------------------------------------------------

-- Vollständiges Szenario flach (für Listenansichten)
CREATE VIEW ir_scenario_summary AS
SELECT
  s.id,
  s.series,
  s.slug,
  s.title,
  s.emoji,
  s.color_hex,
  s.severity,
  s.severity_label,
  s.likelihood,
  s.dsgvo_relevant,
  s.nis2_relevant,
  s.financial_risk,
  s.avg_damage_eur_min,
  s.avg_damage_eur_max,
  s.tags,
  s.affected_systems,
  s.deprecated_at IS NULL AS is_active,
  COUNT(DISTINCT a.id)    AS action_count,
  COUNT(DISTINCT CASE WHEN a.do_not THEN a.id END) AS warning_count,
  COUNT(DISTINCT el.id)   AS escalation_levels,
  COUNT(DISTINCT rs.id)   AS recovery_steps,
  COUNT(DISTINCT ci.id)   AS checklist_items,
  COUNT(DISTINCT ll.id)   AS lessons_learned_count
FROM ir_scenarios s
LEFT JOIN ir_actions             a  ON a.scenario_id  = s.id
LEFT JOIN ir_escalation_levels   el ON el.scenario_id = s.id
LEFT JOIN ir_recovery_steps      rs ON rs.scenario_id = s.id
LEFT JOIN ir_checklist_items     ci ON ci.scenario_id = s.id
LEFT JOIN ir_lessons_learned     ll ON ll.scenario_id = s.id
GROUP BY s.id;

COMMENT ON VIEW ir_scenario_summary IS 'Übersicht aller Szenarien mit Kennzahlen — geeignet für Dashboard';

-- Alle DSGVO-pflichtigen Checklisten-Items
CREATE VIEW ir_dsgvo_checklist AS
SELECT
  s.id    AS scenario_id,
  s.title AS scenario_title,
  s.series,
  ci.id   AS item_id,
  ci.sequence,
  ci.category,
  ci.item,
  ci.mandatory
FROM ir_checklist_items ci
JOIN ir_scenarios s ON s.id = ci.scenario_id
WHERE ci.dsgvo_required = TRUE
ORDER BY s.id, ci.sequence;

COMMENT ON VIEW ir_dsgvo_checklist IS 'Alle DSGVO-relevanten Dokumentationspflichten über alle Szenarien';

-- Sofortmaßnahmen der ersten 30 Min über alle Szenarien
CREATE VIEW ir_immediate_actions AS
SELECT
  s.id    AS scenario_id,
  s.title AS scenario_title,
  s.emoji,
  s.severity,
  a.id    AS action_id,
  a.time_label,
  a.time_window_minutes,
  a.priority,
  a.category,
  a.responsible,
  a.action,
  a.detail,
  a.do_not,
  a.tool_hint
FROM ir_actions a
JOIN ir_scenarios s ON s.id = a.scenario_id
WHERE a.phase = 'IMMEDIATE'
  AND (a.time_window_minutes IS NULL OR a.time_window_minutes <= 30)
  AND s.deprecated_at IS NULL
ORDER BY s.id, a.priority;

COMMENT ON VIEW ir_immediate_actions IS 'Alle Sofortmaßnahmen (0–30 Min) über alle aktiven Szenarien';

-- BSI-Control-Coverage
CREATE VIEW ir_bsi_control_mapping AS
SELECT
  ll.maps_to_control,
  COUNT(DISTINCT ll.scenario_id) AS scenario_count,
  ARRAY_AGG(DISTINCT s.id ORDER BY s.id) AS scenario_ids,
  ARRAY_AGG(DISTINCT s.title ORDER BY s.title) AS scenario_titles
FROM ir_lessons_learned ll
JOIN ir_scenarios s ON s.id = ll.scenario_id
WHERE ll.maps_to_control IS NOT NULL
GROUP BY ll.maps_to_control
ORDER BY scenario_count DESC, ll.maps_to_control;

COMMENT ON VIEW ir_bsi_control_mapping IS 'Welche BSI IT-Grundschutz Bausteine in wievielen Szenarien adressiert werden';

-- -----------------------------------------------------------------------------
-- FUNCTIONS
-- -----------------------------------------------------------------------------

-- Gibt alle Actions für ein Szenario geordnet zurück
CREATE OR REPLACE FUNCTION ir_get_actions(p_scenario_id VARCHAR(10))
RETURNS TABLE (
  id                  VARCHAR(30),
  phase               ir_action_phase,
  time_label          VARCHAR(50),
  time_window_minutes INTEGER,
  priority            SMALLINT,
  category            ir_action_category,
  responsible         ir_responsible,
  action              TEXT,
  detail              TEXT,
  do_not              BOOLEAN,
  tool_hint           TEXT
) LANGUAGE SQL STABLE AS $$
  SELECT
    a.id, a.phase, a.time_label, a.time_window_minutes,
    a.priority, a.category, a.responsible,
    a.action, a.detail, a.do_not, a.tool_hint
  FROM ir_actions a
  WHERE a.scenario_id = p_scenario_id
  ORDER BY
    CASE a.phase
      WHEN 'IMMEDIATE' THEN 1
      WHEN 'SHORT'     THEN 2
      WHEN 'MEDIUM'    THEN 3
      WHEN 'LONG'      THEN 4
    END,
    CASE WHEN a.do_not THEN 9999 ELSE a.priority END;
$$;

COMMENT ON FUNCTION ir_get_actions IS 'Gibt alle Maßnahmen eines Szenarios phasengeordnet zurück, Warnings ans Ende';

-- Suche Szenarien nach Tag oder betroffenem System
CREATE OR REPLACE FUNCTION ir_search_scenarios(
  p_tag     TEXT DEFAULT NULL,
  p_system  TEXT DEFAULT NULL,
  p_dsgvo   BOOLEAN DEFAULT NULL,
  p_series  ir_series DEFAULT NULL
)
RETURNS SETOF ir_scenario_summary LANGUAGE SQL STABLE AS $$
  SELECT *
  FROM ir_scenario_summary
  WHERE is_active = TRUE
    AND (p_tag    IS NULL OR tags             @> ARRAY[p_tag])
    AND (p_system IS NULL OR affected_systems @> ARRAY[p_system])
    AND (p_dsgvo  IS NULL OR dsgvo_relevant   = p_dsgvo)
    AND (p_series IS NULL OR series           = p_series)
  ORDER BY severity DESC, id;
$$;

COMMENT ON FUNCTION ir_search_scenarios IS 'Filtert Szenarien nach Tag, System, DSGVO-Relevanz und Serie';

-- -----------------------------------------------------------------------------
-- TRIGGERS — updated_at automatisch setzen
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ir_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_DATE;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scenarios_updated_at
  BEFORE UPDATE ON ir_scenarios
  FOR EACH ROW EXECUTE FUNCTION ir_set_updated_at();

-- -----------------------------------------------------------------------------
-- IMPORT FUNCTION — JSON → Datenbank
-- Lädt ein einzelnes Szenario-JSON-Objekt in alle 7 Tabellen
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ir_import_scenario(p_json JSONB)
RETURNS VARCHAR(10) LANGUAGE plpgsql AS $$
DECLARE
  v_s       JSONB := p_json -> 'scenario';
  v_sid     VARCHAR(10);
  v_class   JSONB;
  v_meta    JSONB;
  v_esc_lvl JSONB;
  v_esc_id  VARCHAR(15);
  v_rec     JSONB;
BEGIN
  v_sid   := v_s ->> 'id';
  v_class := v_s -> 'classification';
  v_meta  := v_s -> 'meta';

  -- Szenarien-Stammdaten
  INSERT INTO ir_scenarios (
    id, slug, version, series,
    title, subtitle, emoji, color_hex, tags, affected_systems,
    severity, severity_label, likelihood,
    dsgvo_relevant, nis2_relevant, financial_risk,
    avg_damage_eur_min, avg_damage_eur_max,
    overview, created_at, updated_at
  ) VALUES (
    v_sid,
    v_s ->> 'slug',
    COALESCE(v_s ->> 'version', '1.0.0'),
    (v_s ->> 'series')::ir_series,
    v_meta ->> 'title',
    v_meta ->> 'subtitle',
    v_meta ->> 'emoji',
    v_meta ->> 'color_hex',
    ARRAY(SELECT jsonb_array_elements_text(v_meta -> 'tags')),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_meta -> 'affected_systems')), '{}'),
    (v_class ->> 'severity')::ir_severity,
    v_class ->> 'severity_label',
    (v_class ->> 'likelihood')::ir_likelihood,
    (v_class ->> 'dsgvo_relevant')::BOOLEAN,
    (v_class ->> 'nis2_relevant')::BOOLEAN,
    (v_class ->> 'financial_risk')::ir_financial_risk,
    (v_class -> 'avg_damage_eur' ->> 'min')::INTEGER,
    (v_class -> 'avg_damage_eur' ->> 'max')::INTEGER,
    v_s ->> 'overview',
    (v_s ->> 'created_at')::DATE,
    (v_s ->> 'updated_at')::DATE
  )
  ON CONFLICT (id) DO UPDATE SET
    slug            = EXCLUDED.slug,
    version         = EXCLUDED.version,
    title           = EXCLUDED.title,
    subtitle        = EXCLUDED.subtitle,
    overview        = EXCLUDED.overview,
    updated_at      = CURRENT_DATE;

  -- Detection Indicators
  DELETE FROM ir_detection_indicators WHERE scenario_id = v_sid;
  INSERT INTO ir_detection_indicators (scenario_id, type, description, threshold, sequence)
  SELECT
    v_sid,
    (d ->> 'type')::ir_indicator_type,
    d ->> 'description',
    d ->> 'threshold',
    (ROW_NUMBER() OVER ())::SMALLINT
  FROM jsonb_array_elements(COALESCE(v_s -> 'detection_indicators', '[]'::jsonb)) d;

  -- Actions
  DELETE FROM ir_actions WHERE scenario_id = v_sid;
  INSERT INTO ir_actions (id, scenario_id, phase, time_window_minutes, time_label,
    priority, category, responsible, action, detail, do_not, tool_hint)
  SELECT
    a ->> 'id',
    v_sid,
    (a ->> 'phase')::ir_action_phase,
    (a ->> 'time_window_minutes')::INTEGER,
    a ->> 'time_label',
    (a ->> 'priority')::SMALLINT,
    (a ->> 'category')::ir_action_category,
    CASE WHEN (a ->> 'responsible') IS NULL THEN NULL
         ELSE (a ->> 'responsible')::ir_responsible END,
    a ->> 'action',
    a ->> 'detail',
    COALESCE((a ->> 'do_not')::BOOLEAN, FALSE),
    a ->> 'tool_hint'
  FROM jsonb_array_elements(v_s -> 'actions') a;

  -- Escalation Levels + Recipients
  DELETE FROM ir_escalation_levels WHERE scenario_id = v_sid;
  FOR v_esc_lvl IN SELECT * FROM jsonb_array_elements(v_s -> 'escalation') LOOP
    v_esc_id := v_esc_lvl ->> 'id';
    INSERT INTO ir_escalation_levels (id, scenario_id, level, label, color_hex, deadline_hours, condition)
    VALUES (
      v_esc_id, v_sid,
      (v_esc_lvl ->> 'level')::SMALLINT,
      v_esc_lvl ->> 'label',
      v_esc_lvl ->> 'color_hex',
      (v_esc_lvl ->> 'deadline_hours')::NUMERIC,
      v_esc_lvl ->> 'condition'
    );
    INSERT INTO ir_escalation_recipients (escalation_level_id, role, contact_type, legal_basis, message, condition, sequence)
    SELECT
      v_esc_id,
      r ->> 'role',
      (r ->> 'contact_type')::ir_contact_type,
      r ->> 'legal_basis',
      r ->> 'message',
      r ->> 'condition',
      (ROW_NUMBER() OVER ())::SMALLINT
    FROM jsonb_array_elements(v_esc_lvl -> 'recipients') r;
  END LOOP;

  -- Recovery Steps (ohne depends_on zuerst, dann update)
  DELETE FROM ir_recovery_steps WHERE scenario_id = v_sid;
  INSERT INTO ir_recovery_steps (id, scenario_id, phase_label, sequence, action, detail, responsible)
  SELECT
    r ->> 'id', v_sid,
    r ->> 'phase_label',
    (r ->> 'sequence')::SMALLINT,
    r ->> 'action',
    r ->> 'detail',
    (r ->> 'responsible')::ir_responsible
  FROM jsonb_array_elements(v_s -> 'recovery_steps') r;
  -- depends_on nachträglich setzen (nach Insert aller Steps)
  UPDATE ir_recovery_steps rs
  SET depends_on = src.dep
  FROM (
    SELECT r ->> 'id' AS rid, r ->> 'depends_on' AS dep
    FROM jsonb_array_elements(v_s -> 'recovery_steps') r
    WHERE (r ->> 'depends_on') IS NOT NULL
  ) src
  WHERE rs.id = src.rid AND rs.scenario_id = v_sid;

  -- Checklist
  DELETE FROM ir_checklist_items WHERE scenario_id = v_sid;
  INSERT INTO ir_checklist_items (id, scenario_id, sequence, category, item, mandatory, dsgvo_required)
  SELECT
    c ->> 'id', v_sid,
    (c ->> 'sequence')::SMALLINT,
    (c ->> 'category')::ir_checklist_category,
    c ->> 'item',
    COALESCE((c ->> 'mandatory')::BOOLEAN, TRUE),
    COALESCE((c ->> 'dsgvo_required')::BOOLEAN, FALSE)
  FROM jsonb_array_elements(v_s -> 'checklist') c;

  -- Lessons Learned
  DELETE FROM ir_lessons_learned WHERE scenario_id = v_sid;
  INSERT INTO ir_lessons_learned (id, scenario_id, question, category, maps_to_control)
  SELECT
    l ->> 'id', v_sid,
    l ->> 'question',
    (l ->> 'category')::ir_lessons_category,
    l ->> 'maps_to_control'
  FROM jsonb_array_elements(v_s -> 'lessons_learned') l;

  -- References
  DELETE FROM ir_references WHERE scenario_id = v_sid;
  INSERT INTO ir_references (scenario_id, type, name, url)
  SELECT
    v_sid,
    (ref ->> 'type')::ir_reference_type,
    ref ->> 'name',
    ref ->> 'url'
  FROM jsonb_array_elements(v_s -> 'references') ref;

  RETURN v_sid;
END;
$$;

COMMENT ON FUNCTION ir_import_scenario IS 'Lädt ein einzelnes Szenario-JSON-Objekt in alle 7 Tabellen (upsert)';

-- -----------------------------------------------------------------------------
-- EXAMPLE QUERIES (als Kommentare)
-- -----------------------------------------------------------------------------

-- Alle kritischen Szenarien mit DSGVO-Relevanz:
-- SELECT id, title, severity, avg_damage_eur_min, avg_damage_eur_max
-- FROM ir_scenario_summary
-- WHERE severity IN ('CRITICAL','HIGH') AND dsgvo_relevant = TRUE
-- ORDER BY severity, id;

-- Sofortmaßnahmen für Ransomware (erste 30 Min):
-- SELECT time_label, priority, action, detail, do_not
-- FROM ir_immediate_actions
-- WHERE scenario_id = 'S-002'
-- ORDER BY priority;

-- Alle DSGVO-Pflichtpunkte für Datenpanne:
-- SELECT sequence, category, item, mandatory
-- FROM ir_dsgvo_checklist
-- WHERE scenario_id = 'S-004'
-- ORDER BY sequence;

-- Szenarien die VPN als betroffenes System haben:
-- SELECT * FROM ir_search_scenarios(p_system => 'vpn');

-- BSI-Controls die am häufigsten auftauchen:
-- SELECT maps_to_control, scenario_count, scenario_ids
-- FROM ir_bsi_control_mapping
-- LIMIT 20;

-- Szenario aus JSON importieren:
-- SELECT ir_import_scenario('{"scenario": {...}}'::jsonb);

-- -----------------------------------------------------------------------------
-- GRANTS (Template — anpassen an eigene Rollen)
-- -----------------------------------------------------------------------------

-- CREATE ROLE ir_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO ir_readonly;
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO ir_readonly;
-- GRANT EXECUTE ON FUNCTION ir_get_actions TO ir_readonly;
-- GRANT EXECUTE ON FUNCTION ir_search_scenarios TO ir_readonly;

-- CREATE ROLE ir_editor;
-- GRANT ir_readonly TO ir_editor;
-- GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ir_editor;
-- GRANT EXECUTE ON FUNCTION ir_import_scenario TO ir_editor;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
