---
phase: 05-management-dashboard
plan: 01
subsystem: management-ui
tags: [dashboard, deliverables, sop-maturity, api, stats]
dependency_graph:
  requires: [04-ui-deliverables-sop-erweiterung]
  provides: [GET /api/v1/sops/stats, management-dashboard-stats]
  affects: [src/app/intern/(dashboard)/management/page.tsx]
tech_stack:
  added: []
  patterns: [drizzle-groupBy-aggregation, parallel-fetch-pattern]
key_files:
  created:
    - src/app/api/v1/sops/stats/route.ts
  modified:
    - src/app/intern/(dashboard)/management/page.tsx
decisions:
  - "Always return all 5 maturity levels (default count 0) to avoid frontend gaps"
  - "Category breakdown hides zero-count categories for cleaner display"
  - "SOP-Maturity bars use percentage of totalSops (not absolute) for correct proportional display"
metrics:
  duration: "~15 min"
  completed: "2026-04-13"
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 1
---

# Phase 5 Plan 01: Management Dashboard Stats Summary

## One-liner

SOP-Maturity stats endpoint (Drizzle groupBy) + management page extended with Deliverable-breakdown and color-coded maturity bar chart.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | API-Endpunkt GET /api/v1/sops/stats | 2de4f17 | src/app/api/v1/sops/stats/route.ts |
| 2 | Management-Seite erweitern | e3e2ab3 | src/app/intern/(dashboard)/management/page.tsx |
| 3 | Visuelle Verifikation | — | SKIPPED (per executor instruction) |

## What Was Built

### Task 1 — GET /api/v1/sops/stats

New route at `src/app/api/v1/sops/stats/route.ts`:
- Drizzle `groupBy(sopDocuments.maturityLevel)` with `count(*)::int` aggregation
- Filters `deletedAt IS NULL` and `tenantId` for tenant isolation
- Always returns all 5 levels (1–5) even when count = 0
- Labels: Anfaenger / Grundkenntnisse / Kompetent / Fortgeschritten / Experte
- Response: `{ maturityDistribution: Array<{level, count, label}>, totalSops: number }`
- Auth: `withPermission(processes, read)`

### Task 2 — Management Page Extensions

Extended `management/page.tsx` with:
- Two new state variables: `modules` and `sopStats`
- Promise.all extended to fetch `/api/v1/deliverables/modules` and `/api/v1/sops/stats` in parallel with existing calls
- **Deliverables section (UI-03):** Total count + module count, category breakdown via FRAMEWORK_CATEGORIES (zero counts hidden), per-module list as 2-column grid with deliverableCount badges
- **SOP-Maturity section (UI-04):** Horizontal bar chart for levels 1–5, percentage-width bars colored by level (red/orange/yellow/blue/green), label + count + percentage
- Both sections handle empty state without crashing

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both sections wire live API data. Empty-state fallbacks are intentional UX, not stubs.

## Self-Check

- [x] `src/app/api/v1/sops/stats/route.ts` exists and contains `maturityDistribution`
- [x] `management/page.tsx` contains `sopStats`, `modules`, `FRAMEWORK_CATEGORIES`, `Package`, `Layers`
- [x] Commits `2de4f17` and `e3e2ab3` exist
- [x] TypeScript: no errors in modified files (pre-existing test errors unrelated to this plan)
