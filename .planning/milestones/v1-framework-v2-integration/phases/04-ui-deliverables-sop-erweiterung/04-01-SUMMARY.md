---
phase: 04-ui-deliverables-sop-erweiterung
plan: "01"
subsystem: management-ui
tags: [deliverables, sidebar, list-page, filter, shadcn]
dependency_graph:
  requires: []
  provides: [deliverables-list-ui, sidebar-deliverables-entry]
  affects: [sidebar, management-deliverables-route]
tech_stack:
  added: []
  patterns: [useCallback-debounced-fetch, shadcn-card-grid, framework-constants-import]
key_files:
  created:
    - src/app/intern/(dashboard)/management/deliverables/page.tsx
  modified:
    - src/components/layout/sidebar.tsx
decisions:
  - "No create button on deliverables page — deliverables are seeded only, not manually created"
  - "getCategoryLabel from framework.ts used instead of local enum to avoid duplication"
  - "Debounced 300ms load pattern matches sops/page.tsx exactly for consistency"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-13"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 4 Plan 01: Deliverables List Page & Sidebar Entry Summary

## One-liner

Sidebar Management-Gruppe um "Deliverables" erweitert und filterbare Listenseite `/intern/management/deliverables` mit Modul- und Kategorie-Filter erstellt.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Sidebar — Deliverables-Eintrag unter Management | `9b44466` | src/components/layout/sidebar.tsx |
| 2 | Deliverable-Listenseite mit Modul-/Kategorie-Filter | `35d4028` | src/app/intern/(dashboard)/management/deliverables/page.tsx |

## What Was Built

### Task 1: Sidebar Entry
Added `{ name: 'Deliverables', href: '/intern/management/deliverables' }` to the Management group's children array in `sidebar.tsx`, positioned after "SOPs Prozesse". No `requiredModule` required (consistent with Dashboard/EOS/OKR/SOPs in the same group).

### Task 2: Deliverables List Page
Created a `'use client'` page at `src/app/intern/(dashboard)/management/deliverables/page.tsx` with:
- **Module filter**: Loads all modules from `/api/v1/deliverables/modules` on mount, displays each with `deliverableCount`
- **Category filter**: Uses `FRAMEWORK_CATEGORIES` from `@/lib/constants/framework` (8 categories, no duplicate enum definitions)
- **Deliverables grid**: Fetches from `/api/v1/deliverables` with `module` and `category` query params; debounced 300ms via `useCallback`/`useEffect` pattern identical to `sops/page.tsx`
- **Card layout**: Each card shows module code badge (monospace), category badge via `getCategoryLabel()`, name, description (2-line clamp), format, version, and trigger
- **Navigation**: Click on any card navigates to `/intern/management/deliverables/[id]`
- **Empty state**: Card with "Keine Deliverables gefunden"
- **Loading state**: Centered `Loader2` spinner

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

All 4 verification checks passed:
1. `grep "Deliverables.*deliverables" sidebar.tsx` → line 136 match
2. `deliverables/page.tsx` exists
3. `grep -c "api/v1/deliverables" page.tsx` → 2 matches (modules + deliverables endpoints)
4. `FRAMEWORK_CATEGORIES` and `getCategoryLabel` imported from `@/lib/constants/framework` (no local enum definitions)

## Self-Check: PASSED

Files exist:
- `src/components/layout/sidebar.tsx` — FOUND (modified)
- `src/app/intern/(dashboard)/management/deliverables/page.tsx` — FOUND (created)

Commits exist:
- `9b44466` feat(04-01): add Deliverables nav entry to Management sidebar — FOUND
- `35d4028` feat(04-01): create Deliverables list page with module/category filters — FOUND
