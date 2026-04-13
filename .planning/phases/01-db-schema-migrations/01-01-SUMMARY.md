---
phase: 01-db-schema-migrations
plan: 01
subsystem: database
tags: [typescript, constants, enums, framework]

# Dependency graph
requires: []
provides:
  - "src/lib/constants/framework.ts — all shared Framework enum constants and derived TypeScript types"
  - "FRAMEWORK_CATEGORIES (8 categories), STATUS_ENUM, AUTOMATION_LEVEL_ENUM, EXECUTOR_ENUM, SEVERITY_ENUM"
  - "ENTITY_TYPE_ENUM, EXECUTED_BY_ENUM, EXECUTION_STATUS_ENUM for execution log"
  - "getCategoryLabel() helper function"
affects:
  - 01-db-schema-migrations/01-02
  - services
  - ui
  - seeds

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "as const arrays with derived typeof union types for type-safe enums without drizzle dependency"
    - "Single source of truth for all Framework enum values — no magic strings in services/UI/seeds"

key-files:
  created:
    - src/lib/constants/framework.ts
  modified: []

key-decisions:
  - "Pure TypeScript constants file — zero imports from drizzle-orm or schema.ts to avoid circular dependency risk"
  - "as const pattern with typeof[number] derived union types for compile-time exhaustiveness checking"
  - "getCategoryLabel() included in constants file for co-location with FRAMEWORK_CATEGORIES"

patterns-established:
  - "Framework enum pattern: export const X_ENUM = [...] as const; export type XEnum = typeof X_ENUM[number]"
  - "Import pattern for consumers: import { FRAMEWORK_CATEGORIES, StatusEnum } from '@/lib/constants/framework'"

requirements-completed: [ENUM-01, ENUM-02, ENUM-03]

# Metrics
duration: 5min
completed: 2026-04-13
---

# Phase 01 Plan 01: Shared Framework Enum Constants Summary

**TypeScript-only constants file establishing single source of truth for all xKMU Framework v2 enum values (categories, status, automation level, executor, severity) with derived union types.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-13T10:10:00Z
- **Completed:** 2026-04-13T10:15:09Z
- **Tasks:** 1/1
- **Files modified:** 1 (created)

## Accomplishments

### Task 1: src/lib/constants/framework.ts created

Created `src/lib/constants/framework.ts` as the single source of truth for all Framework enum values. The file exports:

**Constants (9 named exports):**
- `FRAMEWORK_CATEGORIES` — 8 category entries: V (Vertrieb), M (Marketing), IT (IT & Cybersicherheit), P (Projektmanagement), C (Compliance & DSGVO), F (Finanzen), HR (Human Resources), Q (Qualitaetssicherung)
- `STATUS_ENUM` — ['draft', 'review', 'approved', 'archived']
- `AUTOMATION_LEVEL_ENUM` — ['manual', 'semi', 'full']
- `EXECUTOR_ENUM` — ['agent', 'human', 'flex']
- `SEVERITY_ENUM` — ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
- `ENTITY_TYPE_ENUM` — ['sop', 'deliverable']
- `EXECUTED_BY_ENUM` — ['agent', 'human']
- `EXECUTION_STATUS_ENUM` — ['completed', 'aborted', 'escalated']
- `getCategoryLabel(code)` — helper function

**Derived TypeScript union types (9 types):**
- `FrameworkCategoryCode`, `FrameworkCategory`, `StatusEnum`, `AutomationLevelEnum`, `ExecutorEnum`, `SeverityEnum`, `EntityTypeEnum`, `ExecutedByEnum`, `ExecutionStatusEnum`

## Verification Results

- TypeScript compiler: no errors for framework.ts (`npx tsc --noEmit`)
- Runtime import check via tsx: FRAMEWORK_CATEGORIES.length = 8, STATUS_ENUM.length = 4, AUTOMATION_LEVEL_ENUM.length = 3, EXECUTOR_ENUM.length = 3, SEVERITY_ENUM.length = 4
- Export count: 18 lines starting with `export` (>= 13 required)
- No drizzle-orm or schema.ts imports confirmed

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 2ef1808 | feat(01-01): add shared Framework enum constants |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- File exists: `/c/Daten/xkmu-business-os/.claude/worktrees/agent-a9e5eed2/src/lib/constants/framework.ts` — FOUND
- Commit `2ef1808` exists — FOUND
