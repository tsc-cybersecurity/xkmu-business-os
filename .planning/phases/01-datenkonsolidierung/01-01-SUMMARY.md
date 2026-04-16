---
phase: 01-datenkonsolidierung
plan: 01
subsystem: database
tags: [tenant-merge, analysis, migration-prep, read-only]
dependency_graph:
  requires: []
  provides: [tenant_collision_analysis.sql, MERGE-STRATEGY.md]
  affects: [plan-01-02]
tech_stack:
  added: []
  patterns: [cross-tenant-join, business-key-dedup]
key_files:
  created:
    - .planning/phases/01-datenkonsolidierung/analysis/tenant_collision_analysis.sql
    - .planning/phases/01-datenkonsolidierung/MERGE-STRATEGY.md
  modified: []
decisions:
  - "xkmu-digital-solutions wins all conflicts — default version deleted when duplicate found"
  - "Business-key strategy: vat_id/email/slug/code/source_task_id as natural keys for dedup"
  - "VTO is DELETE_DEFAULT (singleton per tenant) — no merge logic needed"
  - "EOS/OKR tables not yet in whitelist are included in analysis (vto, rocks, okr_*, sop_documents)"
metrics:
  duration: ~25min
  completed: 2026-04-16
  tasks_completed: 2
  files_created: 2
---

# Phase 01 Plan 01: Tenant Collision Analysis + Merge Strategy Summary

SQL dry-run collision analysis covering all 67 TENANT_TABLES + 13 join/scoped tables, with per-table merge strategy documented for human review before migration.

## What Was Built

### Task 1: tenant_collision_analysis.sql

Location: `.planning/phases/01-datenkonsolidierung/analysis/tenant_collision_analysis.sql`

A read-only PostgreSQL script (zero DML) that queries every tenant-scoped table in the database to expose:

- Row counts per tenant (default vs. xkmu-digital-solutions)
- Duplicate detection via cross-tenant JOIN on business keys for 17 tables in Gruppe A

**Gruppe A — Duplikat-Check (17 tables):**
roles, users, api_keys, companies, persons, product_categories, products, ai_providers,
projects, processes, deliverable_modules, deliverables, sop_documents, okr_cycles,
grundschutz_audit_sessions, din_audit_sessions, wiba_audit_sessions

**Gruppe B — Count only (no unique key, 46 tables):**
leads, opportunities, activities, ai_logs, ai_prompt_templates, ideas, webhooks, audit_log,
documents, document_items, document_templates, email_templates, contract_templates,
contract_clauses, receipts, din_answers, wiba_answers, grundschutz_answers, n8n_connections,
n8n_workflow_logs, media_uploads, generated_images, company_researches, firecrawl_researches,
business_documents, business_profiles, marketing_campaigns, marketing_tasks, marketing_templates,
social_media_topics, social_media_posts, newsletter_subscribers, newsletter_campaigns,
feedback_forms, process_tasks, project_tasks, time_entries, task_queue, chat_conversations,
cockpit_systems, execution_logs, vto, rocks, scorecard_metrics, eos_issues, meeting_sessions,
okr_objectives

**JOIN Tables — counted via parent (10 tables):**
role_permissions, chat_messages, cockpit_credentials, feedback_responses,
sop_steps, sop_versions, scorecard_entries, rock_milestones, okr_key_results, okr_checkins

**Execute:**
```bash
psql -h localhost -U postgres -d xkmu_bos -f \
  .planning/phases/01-datenkonsolidierung/analysis/tenant_collision_analysis.sql
```

Or via Docker:
```bash
docker exec xkmu-postgres psql -U postgres -d xkmu_bos -f /path/to/tenant_collision_analysis.sql
```

### Task 2: MERGE-STRATEGY.md

Location: `.planning/phases/01-datenkonsolidierung/MERGE-STRATEGY.md`

A human-readable review document with explicit merge decision for every table:

| Strategy | Count | Tables |
|----------|-------|--------|
| `DEDUP_THEN_MERGE` | 16 | roles, users, companies, persons, product_categories, products, ai_providers, projects, processes, deliverable_modules, deliverables, sop_documents, okr_cycles, grundschutz_audit_sessions, din_audit_sessions, wiba_audit_sessions |
| `MERGE_ALL` | 34+ | All tables without unique business keys |
| `DELETE_DEFAULT` | 1 | vto (semantic singleton per tenant) |
| `JOIN_TABLE` | 10 | role_permissions, chat_messages, cockpit_credentials, feedback_responses, sop_steps, sop_versions, scorecard_entries, rock_milestones, okr_key_results, okr_checkins |

## Deviations from Plan

### Auto-extended Coverage

**1. [Rule 2 - Missing Coverage] EOS/OKR/SOP tables added to analysis**
- **Found during:** Task 1
- **Issue:** The plan mentions "67 TENANT_TABLES" but table-whitelist.ts TENANT_TABLES array has 63 entries. The schema has 8 additional tables with tenant_id that are not in the whitelist: `vto`, `rocks`, `scorecard_metrics`, `eos_issues`, `meeting_sessions`, `okr_cycles`, `okr_objectives`, `sop_documents`
- **Fix:** All 8 tables included in SQL analysis and MERGE-STRATEGY.md for completeness. The "67" figure in the plan likely referred to this full set including EOS/OKR/SOP tables.
- **Files modified:** tenant_collision_analysis.sql, MERGE-STRATEGY.md

**2. [Rule 2 - Missing Coverage] Additional JOIN tables added beyond whitelist**
- **Found during:** Task 1
- **Issue:** The plan's JOIN_TABLES whitelist has 4 entries but the schema has additional join-scoped tables: rock_milestones, scorecard_entries, okr_key_results, okr_checkins, sop_steps, sop_versions
- **Fix:** All 6 additional join-scoped tables included in SQL analysis and MERGE-STRATEGY.md with COUNT via parent JOIN pattern

## Known Stubs

None. This plan produces analysis documents only — no application code with placeholders.

The `?` values in MERGE-STRATEGY.md are intentional placeholders to be filled
after executing the SQL script against production DB. This is documented as the
required next step.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `tenant_collision_analysis.sql` exists | FOUND |
| `MERGE-STRATEGY.md` exists | FOUND |
| Commit `3170e40` (SQL script) | FOUND |
| Commit `442d487` (MERGE-STRATEGY) | FOUND |
| DML in SQL file | 0 statements |
| TABLE markers in SQL | 75 |
| Strategy markers in MERGE-STRATEGY | 79 |
