# Merge-Strategie: Tenant-Konsolidierung (FINAL)

**Datum:** 2026-04-16 (nach Review)
**User-Entscheidung:** Option B — CRM-Seed-Daten aus default verwerfen, Rest mergen

**Ausgangslage:**
- Source (loeschen): `default` — `2ce4949e-8017-4d26-9d60-66c3f4060673`
- Ziel (behalten): `xkmu-digital-solutions` — `7b6c13c5-1800-47b2-a12f-10ccb11f6358`

**Tatsaechliche Counts aus Produktions-DB (2026-04-16):**

| Tabelle | xkmu | default | Aktion |
|---------|------|---------|--------|
| users | 1 | 1 | DELETE default admin (Email-Konflikt), reassign FKs vorher |
| roles | 6 | 1 | UPDATE default role |
| api_keys | 1 | 0 | nichts zu tun |
| companies | 9 | 5 | **DELETE default (CRM-Seed verwerfen)** |
| persons | 4 | 8 | **DELETE default (CRM-Seed verwerfen)** |
| leads | 9 | 5 | **DELETE default (CRM-Seed verwerfen)** |
| opportunities | 0 | 39 | **DELETE default (CRM-Seed verwerfen)** |
| products | 0 | 6 | UPDATE (xKMU-Services, real) |
| product_categories | ? | ? | UPDATE (CASCADE via products) |
| vto | 0 | 1 | UPDATE |
| rocks | 0 | 4 | UPDATE |
| scorecard_metrics | 0 | 6 | UPDATE |
| eos_issues | 0 | 3 | UPDATE |
| meeting_sessions | 0 | 1 | UPDATE |
| okr_cycles | 0 | 2 | UPDATE |
| okr_objectives | 0 | 3 | UPDATE |
| sop_documents | 0 | 221 | UPDATE (alle SOPs liegen in default) |
| deliverable_modules | 16 | 16 | DELETE default (Duplikate by code) |
| deliverables | 70 | 70 | DELETE default (Duplikate by module_id+name) |
| ai_prompt_templates | 51 | 38 | UPDATE (default's Extras behalten, Duplikate DELETE) |
| processes | 9 | 0 | nichts zu tun |
| projects | 3 | 0 | nichts zu tun |
| documents | 2 | 0 | nichts zu tun |
| din_audit_sessions | 0 | 1 | **DELETE default (Demo)** |
| wiba_audit_sessions | 0 | 1 | **DELETE default (Demo)** |
| grundschutz_audit_sessions | 0 | 1 | **DELETE default (Demo)** |
| marketing_campaigns | 0 | 1 | **DELETE default (Demo)** |

## Finale Strategie pro Tabellen-Gruppe

### Gruppe A: DELETE FROM default (verwerfen)

CRM-Seed-Daten und Demo-Audit-Sessions — alle Zeilen aus default werden geloescht, nichts migriert:

- `companies` (+ CASCADE: keine Child-Tables direkt, aber persons haben FK)
- `persons` (CASCADE via company_id waere moeglich, aber wir loeschen persons direkt)
- `leads` (CASCADE: emails.lead_id → SET NULL)
- `opportunities`
- `activities` (alle default activities)
- `marketing_campaigns` (+ CASCADE: marketing_tasks)
- `social_media_topics`, `social_media_posts`
- `newsletter_subscribers`, `newsletter_campaigns`
- `feedback_forms` (+ JOIN: feedback_responses via CASCADE)
- `chat_conversations` (+ JOIN: chat_messages via CASCADE)
- `cockpit_systems` (+ JOIN: cockpit_credentials via CASCADE)
- `din_audit_sessions` (+ CASCADE: din_answers)
- `wiba_audit_sessions` (+ CASCADE: wiba_answers)
- `grundschutz_audit_sessions` (+ CASCADE: grundschutz_answers)
- `grundschutz_assets`, `grundschutz_asset_controls`, `grundschutz_asset_relations`
- `ideas`, `webhooks`, `audit_log` (default-bezogen)
- `business_documents`, `business_profiles`, `company_researches`, `firecrawl_researches`
- `n8n_connections` (+ CASCADE: n8n_workflow_logs)
- `ai_logs` (default's AI log history — demo)
- `media_uploads` (default-hochgeladen)
- `generated_images`
- `time_entries`, `task_queue`, `receipts` (falls vorhanden)

### Gruppe B: UPDATE tenant_id = xkmu (migrieren)

Business-relevante Daten die xKMU-weiter nuetzt:

- `vto` (1 Zeile, Management Framework)
- `rocks` (4) + `rock_milestones` (CASCADE)
- `scorecard_metrics` (6) + `scorecard_entries` (CASCADE)
- `eos_issues` (3)
- `meeting_sessions` (1)
- `okr_cycles` (2) + `okr_objectives` (3) + `okr_key_results` + `okr_checkins`
- `sop_documents` (221!) + `sop_steps` + `sop_versions`
- `products` (6 xKMU-Services) + `product_categories`
- `ai_providers` (6 — nur wenn noch nicht in xkmu)
- `documents` (nur default-eigene, nicht lead-bezogen)
- `document_templates`, `email_templates`, `contract_templates`, `contract_clauses`

### Gruppe C: DELETE duplicates, UPDATE rest

Echte Duplikate die aufgeloest werden muessen:

- `deliverable_modules`: DELETE default's 16 (duplicate codes A1-D3), keep xkmu's
- `deliverables`: DELETE default's 70 (duplicate by module_id+name), keep xkmu's
- `ai_prompt_templates`: DELETE default's Duplikate by slug, UPDATE rest
- `roles`: DELETE default's 1 role wenn Name in xkmu existiert, sonst UPDATE
- `users`: DELETE default-admin (gleiche Email), nachdem owner_id/created_by in migrierten Tabellen auf xkmu-admin umgehangen

### Gruppe D: Special — User Reassignment

Vor `DELETE FROM users WHERE tenant_id = default`:

```sql
-- Alle FK-Felder die auf default-admin zeigen auf xkmu-admin umhaengen
-- (sonst kaputte Referenzen in migrierten Tabellen)
UPDATE sop_documents SET owner_id = xkmu_admin_id WHERE owner_id = default_admin_id;
UPDATE sop_documents SET approved_by = xkmu_admin_id WHERE approved_by = default_admin_id;
UPDATE sop_versions SET created_by = xkmu_admin_id WHERE created_by = default_admin_id;
UPDATE rocks SET owner_id = xkmu_admin_id WHERE owner_id = default_admin_id;
UPDATE scorecard_metrics SET owner_id = xkmu_admin_id WHERE owner_id = default_admin_id;
UPDATE okr_objectives SET owner_id = xkmu_admin_id WHERE owner_id = default_admin_id;
UPDATE vto SET updated_by = xkmu_admin_id WHERE updated_by = default_admin_id;
UPDATE eos_issues SET created_by = xkmu_admin_id WHERE created_by = default_admin_id;
UPDATE meeting_sessions SET ... WHERE ... = default_admin_id;
UPDATE okr_checkins SET created_by = ...;
UPDATE workflows SET created_by = ...;
UPDATE cron_jobs SET created_by = ...;
UPDATE email_accounts SET created_by = ...;
-- (alle users-FKs ON DELETE SET NULL/NO ACTION durchgehen)
```

### Gruppe E: Final Step

```sql
DELETE FROM users WHERE tenant_id = default_id;  -- default-admin
DELETE FROM tenants WHERE id = default_id;       -- CASCADE raeumt alles was noch hing
```

## Validierung nach Migration

```sql
-- 1. Nur noch 1 Tenant
SELECT COUNT(*) FROM tenants;  -- Expect: 1

-- 2. Kein FK auf default-ID uebrig (stichprobenartig)
SELECT COUNT(*) FROM sop_documents WHERE tenant_id = '2ce4949e-...';  -- 0
SELECT COUNT(*) FROM users WHERE tenant_id = '2ce4949e-...';  -- 0
SELECT COUNT(*) FROM deliverable_modules WHERE tenant_id = '2ce4949e-...';  -- 0

-- 3. Erwartete Counts im Ziel-Tenant
SELECT COUNT(*) FROM sop_documents;     -- Expect: ~221
SELECT COUNT(*) FROM deliverable_modules; -- Expect: 16
SELECT COUNT(*) FROM deliverables;      -- Expect: 70
SELECT COUNT(*) FROM companies;         -- Expect: 9 (xkmu-only, default discarded)
SELECT COUNT(*) FROM leads;             -- Expect: 9
SELECT COUNT(*) FROM vto;               -- Expect: 1
```

---

**Bereit fuer Plan 01-02** — SQL-Migration implementieren basierend auf dieser Strategie.
