# Merge-Strategie: Tenant-Konsolidierung

**Datum:** 2026-04-16
**Ausgangslage:**
- Source (loeschen): `default` — 2ce4949e-8017-4d26-9d60-66c3f4060673
- Ziel (behalten): `xkmu-digital-solutions` — 7b6c13c5-1800-47b2-a12f-10ccb11f6358

**Prinzip bei Duplikaten:** xkmu-digital-solutions Version gewinnt immer.
Das Analyse-Skript (`analysis/tenant_collision_analysis.sql`) liefert die tatsaechlichen
Counts — Spalten mit `?` nach Ausfuehren befuellen.

---

## Legende Strategien

| Kuerzel | Bedeutung |
|---------|-----------|
| `DEDUP_THEN_MERGE` | Duplikate in default loeschen (xkmu-Version gewinnt), Rest mit UPDATE tenant_id migrieren |
| `MERGE_ALL` | Keine Duplikat-Pruefung, direkt UPDATE tenant_id = xkmu |
| `DELETE_DEFAULT` | Nur in default vorhanden oder semantisch "eine pro Tenant" — direkt loeschen (kein Merge) |
| `NO_DATA` | Beide Tenants haben 0 Zeilen — kein Handlungsbedarf |
| `JOIN_TABLE` | Kein tenant_id — automatisch durch CASCADE wenn Parent migriert wird |

---

## Tabellen-Analyse

### Gruppe 1: Roles & Users & Auth

| Tabelle | Default Count | xKMU Count | Duplikate (nach Business-Key) | Strategie | Business-Key | Notiz |
|---------|--------------|-----------|-------------------------------|-----------|-------------|-------|
| roles | ? | ? | ? (key: name) | `DEDUP_THEN_MERGE` | name | owner/admin/member in beiden — 3 Duplikate erwartet |
| role_permissions | JOIN | JOIN | n/a | `JOIN_TABLE` | via roles.tenant_id | Wird durch roles-CASCADE mitgezogen |
| users | ? | ? | ? (key: email) | `DEDUP_THEN_MERGE` | email | xKMU Admin hat vermutlich gleiche Email in beiden |
| api_keys | ? | ? | ? (key: key_prefix) | `MERGE_ALL` | key_hash | Default hat keine echten API-Keys, xkmu hat den echten |

### Gruppe 2: CRM

| Tabelle | Default Count | xKMU Count | Duplikate | Strategie | Business-Key | Notiz |
|---------|--------------|-----------|-----------|-----------|-------------|-------|
| companies | ? | ? | ? (key: vat_id oder name) | `DEDUP_THEN_MERGE` | vat_id THEN name | Demo-Firmen aus default koennen Echtkunden ueberlagern |
| persons | ? | ? | ? (key: email) | `DEDUP_THEN_MERGE` | email (nullable) | Ohne Email: MERGE_ALL |
| leads | ? | ? | n/a | `MERGE_ALL` | - | Kein eindeutiger Key, alle behalten |
| opportunities | ? | ? | n/a | `MERGE_ALL` | - | Kein eindeutiger Key |
| activities | ? | ? | n/a | `MERGE_ALL` | - | Interaktionslog, alle behalten |

### Gruppe 3: Produkte & Finanzen

| Tabelle | Default Count | xKMU Count | Duplikate | Strategie | Business-Key | Notiz |
|---------|--------------|-----------|-----------|-----------|-------------|-------|
| product_categories | ? | ? | ? (key: slug/name) | `DEDUP_THEN_MERGE` | COALESCE(slug, name) | |
| products | ? | ? | ? (key: sku/name) | `DEDUP_THEN_MERGE` | CASE sku THEN name | |
| documents | ? | ? | n/a | `MERGE_ALL` | - | Rechnungen/Angebote — alle behalten |
| document_items | ? | ? | n/a | `MERGE_ALL` | - | CASCADE via documents |
| document_templates | ? | ? | n/a | `MERGE_ALL` | - | |
| email_templates | ? | ? | n/a | `MERGE_ALL` | - | |
| contract_templates | ? | ? | n/a | `MERGE_ALL` | - | |
| contract_clauses | ? | ? | n/a | `MERGE_ALL` | - | |
| receipts | ? | ? | n/a | `MERGE_ALL` | - | Belege, alle behalten |

### Gruppe 4: KI & Medien

| Tabelle | Default Count | xKMU Count | Duplikate | Strategie | Business-Key | Notiz |
|---------|--------------|-----------|-----------|-----------|-------------|-------|
| ai_providers | ? | ? | ? (key: provider_type+name) | `DEDUP_THEN_MERGE` | (provider_type, name) | xKMU hat echte API-Keys |
| ai_logs | ? | ? | n/a | `MERGE_ALL` | - | Logs alle behalten |
| ai_prompt_templates | ? | ? | n/a | `MERGE_ALL` | - | |
| media_uploads | ? | ? | n/a | `MERGE_ALL` | - | Dateien physisch auf /data/uploads — keine Konflikte |
| generated_images | ? | ? | n/a | `MERGE_ALL` | - | |

### Gruppe 5: Audit & Compliance

| Tabelle | Default Count | xKMU Count | Duplikate | Strategie | Business-Key | Notiz |
|---------|--------------|-----------|-----------|-----------|-------------|-------|
| din_audit_sessions | ? | ? | ? (key: date) | `DEDUP_THEN_MERGE` | created_at::date | Vorsicht: selbe Datum = moeglicherweise Test+Echt |
| din_answers | ? | ? | n/a | `MERGE_ALL` | - | CASCADE via din_audit_sessions |
| wiba_audit_sessions | ? | ? | ? (key: date) | `DEDUP_THEN_MERGE` | created_at::date | |
| wiba_answers | ? | ? | n/a | `MERGE_ALL` | - | |
| grundschutz_audit_sessions | ? | ? | ? (key: title) | `DEDUP_THEN_MERGE` | COALESCE(title, created_at::date) | |
| grundschutz_answers | ? | ? | n/a | `MERGE_ALL` | - | |
| audit_log | ? | ? | n/a | `MERGE_ALL` | - | Historische Eintraege, alle behalten |
| ideas | ? | ? | n/a | `MERGE_ALL` | - | |
| webhooks | ? | ? | n/a | `MERGE_ALL` | - | |

### Gruppe 6: Marketing & Social

| Tabelle | Default Count | xKMU Count | Duplikate | Strategie | Business-Key | Notiz |
|---------|--------------|-----------|-----------|-----------|-------------|-------|
| marketing_campaigns | ? | ? | n/a | `MERGE_ALL` | - | |
| marketing_tasks | ? | ? | n/a | `MERGE_ALL` | - | |
| marketing_templates | ? | ? | n/a | `MERGE_ALL` | - | |
| social_media_topics | ? | ? | n/a | `MERGE_ALL` | - | |
| social_media_posts | ? | ? | n/a | `MERGE_ALL` | - | |
| newsletter_subscribers | ? | ? | n/a | `MERGE_ALL` | - | |
| newsletter_campaigns | ? | ? | n/a | `MERGE_ALL` | - | |

### Gruppe 7: n8n, BI, Chat, Cockpit, Feedback

| Tabelle | Default Count | xKMU Count | Duplikate | Strategie | Business-Key | Notiz |
|---------|--------------|-----------|-----------|-----------|-------------|-------|
| n8n_connections | ? | ? | n/a | `MERGE_ALL` | - | |
| n8n_workflow_logs | ? | ? | n/a | `MERGE_ALL` | - | |
| company_researches | ? | ? | n/a | `MERGE_ALL` | - | |
| firecrawl_researches | ? | ? | n/a | `MERGE_ALL` | - | |
| business_documents | ? | ? | n/a | `MERGE_ALL` | - | |
| business_profiles | ? | ? | n/a | `MERGE_ALL` | - | |
| chat_conversations | ? | ? | n/a | `MERGE_ALL` | - | |
| chat_messages | JOIN | JOIN | n/a | `JOIN_TABLE` | via chat_conversations | |
| cockpit_systems | ? | ? | n/a | `MERGE_ALL` | - | |
| cockpit_credentials | JOIN | JOIN | n/a | `JOIN_TABLE` | via cockpit_systems | |
| feedback_forms | ? | ? | n/a | `MERGE_ALL` | - | |
| feedback_responses | JOIN | JOIN | n/a | `JOIN_TABLE` | via feedback_forms | |

### Gruppe 8: Projekte & Prozesse & Zeit

| Tabelle | Default Count | xKMU Count | Duplikate | Strategie | Business-Key | Notiz |
|---------|--------------|-----------|-----------|-----------|-------------|-------|
| projects | ? | ? | ? (key: name) | `DEDUP_THEN_MERGE` | name | |
| project_tasks | ? | ? | n/a | `MERGE_ALL` | - | CASCADE via projects |
| processes | ? | ? | ? (key: name) | `DEDUP_THEN_MERGE` | name | |
| process_tasks | ? | ? | n/a | `MERGE_ALL` | - | CASCADE via processes |
| time_entries | ? | ? | n/a | `MERGE_ALL` | - | |
| task_queue | ? | ? | n/a | `MERGE_ALL` | - | Job-Queue, alle behalten |

### Gruppe 9: EOS Management Framework

| Tabelle | Default Count | xKMU Count | Duplikate | Strategie | Business-Key | Notiz |
|---------|--------------|-----------|-----------|-----------|-------------|-------|
| vto | ? | ? | 1 pro Tenant erwartet | `DELETE_DEFAULT` | n/a (eine pro Tenant) | xKMU-VTO gewinnt, default VTO wird geloescht |
| rocks | ? | ? | n/a | `MERGE_ALL` | - | Rocks sind instanz-spezifisch |
| rock_milestones | JOIN | JOIN | n/a | `JOIN_TABLE` | via rocks | CASCADE via rock_id |
| scorecard_metrics | ? | ? | n/a | `MERGE_ALL` | - | |
| scorecard_entries | JOIN | JOIN | n/a | `JOIN_TABLE` | via scorecard_metrics | CASCADE via metric_id |
| eos_issues | ? | ? | n/a | `MERGE_ALL` | - | |
| meeting_sessions | ? | ? | n/a | `MERGE_ALL` | - | |

### Gruppe 10: OKR

| Tabelle | Default Count | xKMU Count | Duplikate | Strategie | Business-Key | Notiz |
|---------|--------------|-----------|-----------|-----------|-------------|-------|
| okr_cycles | ? | ? | ? (key: name) | `DEDUP_THEN_MERGE` | name | z.B. "Q1 2026" koennte in beiden sein |
| okr_objectives | ? | ? | n/a | `MERGE_ALL` | - | CASCADE via okr_cycles |
| okr_key_results | JOIN | JOIN | n/a | `JOIN_TABLE` | via okr_objectives | CASCADE via objective_id |
| okr_checkins | JOIN | JOIN | n/a | `JOIN_TABLE` | via okr_key_results | CASCADE via key_result_id |

### Gruppe 11: SOPs & Deliverables (Framework v2)

| Tabelle | Default Count | xKMU Count | Duplikate | Strategie | Business-Key | Notiz |
|---------|--------------|-----------|-----------|-----------|-------------|-------|
| deliverable_modules | ? | ? | ? (key: code) | `DEDUP_THEN_MERGE` | code (A1-D3) | Beide Tenants haben die 16 Module geseedet |
| deliverables | ? | ? | ? (key: code+name) | `DEDUP_THEN_MERGE` | module.code + name | Beide Tenants haben 70 Deliverables geseedet |
| sop_documents | ? | ? | ? (key: source_task_id) | `DEDUP_THEN_MERGE` | COALESCE(source_task_id, title) | Beide Tenants haben 109 SOPs geseedet |
| sop_steps | JOIN | JOIN | n/a | `JOIN_TABLE` | via sop_documents | CASCADE via sop_id |
| sop_versions | JOIN | JOIN | n/a | `JOIN_TABLE` | via sop_documents | CASCADE via sop_id |
| execution_logs | ? | ? | n/a | `MERGE_ALL` | - | |

---

## Sonderfaelle

### users — Email-Konflikt-Aufloesung

Wenn xkmu-Admin und default-Admin die gleiche Email haben:
- xkmu-User bleibt bestehen (hat echte Sessions, API-Key-Zuordnung)
- default-User wird GELOESCHT (nicht migriert)
- Eventuelle Fremdschluessel auf default-User (lead.assigned_to, etc.) werden
  auf NULL gesetzt via ON DELETE SET NULL (bereits in Schema so definiert)

### roles — System-Rollen-Duplikate

Alle drei System-Rollen (owner, admin, member) existieren in beiden Tenants.
- xkmu-Rollen bleiben bestehen
- default-Rollen werden geloescht
- role_permissions: CASCADE via role_id — werden mitgeloescht
- users.roleId: references roles.id ON DELETE SET NULL — wird NULL gesetzt

### deliverable_modules & deliverables & sop_documents

Seed-Daten (16 Module, 70 Deliverables, 109 SOPs) wurden in beide Tenants geseedet.
- Fast alle Zeilen sind Duplikate nach Business-Key.
- Default-Version wird geloescht, xkmu-Version bleibt.
- sop_documents.produces_deliverable_id zeigt auf deliverables in default-Tenant:
  Diese FK muss nach Dedup auf xkmu-Deliverable umgeschrieben werden.

### okr_cycles

Wenn "Q1 2026" in beiden Tenants existiert:
- xkmu-Cycle bleibt
- default-Cycle wird geloescht
- okr_objectives referenzieren cycle_id — werden mitgeloescht via CASCADE
  (Annahme: Objectives im default sind Demo-Daten, nicht Produktionsdaten)

### vto — Eine pro Tenant

VTO ist semantisch ein Singleton pro Tenant (Vision/Traction Organizer).
- default hat maximal 1 VTO-Zeile — wird geloescht
- xkmu hat maximal 1 VTO-Zeile — bleibt bestehen
- Keine Merge-Logik noetig

---

## Tabellen-Vollstaendigkeit (Whitelist-Abgleich)

Die folgende Liste zeigt alle Tabellen aus `TENANT_TABLES` in `table-whitelist.ts`
plus die EOS/OKR/SOP-Tabellen die im Schema tenant_id haben aber noch nicht in der
Whitelist aufgefuehrt sind.

### In TENANT_TABLES (63 Eintraege):
roles, users, api_keys, companies, persons, leads, opportunities,
product_categories, products, ai_providers, ai_logs, ai_prompt_templates,
ideas, activities, webhooks, audit_log, documents, document_items,
document_templates, email_templates, din_audit_sessions, din_answers,
wiba_audit_sessions, wiba_answers, n8n_connections, n8n_workflow_logs,
media_uploads, generated_images, company_researches, firecrawl_researches,
business_documents, business_profiles, marketing_campaigns, marketing_tasks,
marketing_templates, social_media_topics, social_media_posts,
newsletter_subscribers, newsletter_campaigns, feedback_forms, processes,
process_tasks, projects, project_tasks, time_entries, task_queue, receipts,
chat_conversations, cockpit_systems, grundschutz_audit_sessions,
grundschutz_answers, contract_templates, contract_clauses,
deliverable_modules, deliverables, execution_logs

### In JOIN_TABLES (4 Eintraege):
role_permissions, chat_messages, cockpit_credentials, feedback_responses

### Zusaetzliche tenant_id Tabellen (nicht in Whitelist, aber im Schema):
vto, rocks, scorecard_metrics, eos_issues, meeting_sessions,
okr_cycles, okr_objectives, sop_documents

### Zusaetzliche JOIN-Tabellen (kein tenant_id, aber scoped via Parent):
rock_milestones (via rocks), scorecard_entries (via scorecard_metrics),
okr_key_results (via okr_objectives), okr_checkins (via okr_key_results),
sop_steps (via sop_documents), sop_versions (via sop_documents)

---

## Naechste Schritte

1. [ ] `analysis/tenant_collision_analysis.sql` auf Produktions-DB ausfuehren
2. [ ] Alle `?`-Felder in dieser Tabelle mit echten Counts befuellen
3. [ ] Sonderfaelle (users Email-Konflikte, okr_cycles) manuell verifizieren
4. [ ] Review und Freigabe vor Ausfuehren von Plan 01-02
5. [ ] Plan 01-02 implementiert die Migration basierend auf dieser Strategie
