---
phase: 03-services-entkoppeln-batch-1
plan: "02"
subsystem: management-services
tags: [tenant-decoupling, eos, okr, sop, deliverable, execution-log, process, project, task-queue]
dependency_graph:
  requires: []
  provides: [management-services-tenant-decoupled]
  affects: [eos.service, okr.service, sop.service, deliverable.service, execution-log.service, process.service, project.service, task-queue.service]
tech_stack:
  added: []
  patterns: [soft-removal-pattern, TENANT_ID-constant, _tenantId-unused-param]
key_files:
  modified:
    - src/lib/services/eos.service.ts
    - src/lib/services/okr.service.ts
    - src/lib/services/sop.service.ts
    - src/lib/services/deliverable.service.ts
    - src/lib/services/execution-log.service.ts
    - src/lib/services/process.service.ts
    - src/lib/services/project.service.ts
    - src/lib/services/task-queue.service.ts
decisions:
  - "Soft-removal pattern: rename tenantId → _tenantId, remove WHERE filters, use TENANT_ID constant in INSERT"
  - "updateCycle deactivate-all step runs without WHERE clause — correct for single-tenant (deactivates all cycles)"
  - "task-queue.service.ts tenantOnlyWhere variable removed; stats query now runs unfiltered"
  - "process.service.ts seed() and existingTask checks stripped of tenantId filters"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-13"
  tasks_completed: 3
  files_modified: 8
---

# Phase 03 Plan 02: Management-Block Services Tenant-Decoupling Summary

One-liner: Removed all `eq(X.tenantId, tenantId)` WHERE-filters from 8 management services (EOS, OKR, SOP, Deliverable, ExecutionLog, Process, Project, TaskQueue) using the soft-removal pattern, replacing INSERT values with `TENANT_ID` constant and renaming params to `_tenantId`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | EosService + OkrService tenant-filter removal | 8c64f4e | eos.service.ts, okr.service.ts |
| 2 | SopService + DeliverableService + ExecutionLogService tenant-filter removal | 24e0c0c | sop.service.ts, deliverable.service.ts, execution-log.service.ts |
| 3 | ProcessService + ProjectService + TaskQueueService tenant-filter removal | b34827f | process.service.ts, project.service.ts, task-queue.service.ts |

## What Was Done

All 8 management-block services now operate without tenant-ID WHERE clauses. The soft-removal pattern was applied uniformly:

1. `tenantId: string` parameter renamed to `_tenantId: string` in every method signature — callers unchanged
2. All `eq(X.tenantId, tenantId)` conditions removed from SELECT/UPDATE/DELETE WHERE clauses
3. INSERT values updated from bare `tenantId` variable to `TENANT_ID` constant
4. `import { TENANT_ID } from '@/lib/constants/tenant'` added to all 8 files
5. Unused `and()` wrapper calls removed where the tenant condition was the only or first condition

### Notable changes per service

**eos.service.ts:** `listRocks` and `listIssues` conditions arrays now start empty (`ReturnType<typeof eq>[]`); `listMeetings` no longer has a WHERE clause; `getVTO` uses `eq(vto.isActive, true)` alone.

**okr.service.ts:** `updateCycle` deactivate-all step drops `.where()` entirely — correct single-tenant behavior (all cycles in the DB belong to the one organisation). `listObjectives` conditions array starts empty.

**sop.service.ts:** `list()` conditions array starts with `[isNull(sopDocuments.deletedAt)]` only; `getById`/`getByIdWithDeliverable` use `and(eq(id), isNull(deletedAt))`. `publish()` internal `getById` call kept as-is (already ignores tenantId).

**deliverable.service.ts:** `getModulesWithCount` no longer filters modules or counts by tenantId. Inner `sopDocuments` join in `getById` drops the tenantId condition.

**execution-log.service.ts:** `list()` and `getStats()` start with empty conditions; `listByEntity` uses only entityType + entityId filters.

**process.service.ts:** `list()`, `listTasks()`, `listDevTasks()`, `getTaskById()`, seed task-existence checks all stripped of tenantId WHERE. `updateTaskByKey` uses only `eq(processTasks.taskKey, taskKey)`.

**project.service.ts:** `list()` conditions array starts empty; `listTasks()` uses only projectId; `deleteTask()` subtask cleanup uses only parentTaskId.

**task-queue.service.ts:** `tenantOnlyWhere` variable fully removed; stats `groupBy` query runs unfiltered; `deleteBulk` conditions array starts empty (scope filter added only when needed); all other methods use id-only WHERE.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All changes are internal query simplifications within existing service methods. API routes remain unchanged and still pass `auth.tenantId` to services (which services now ignore). Threat model acceptance documented in plan (`T-03b-01`, `T-03b-02`, `T-03b-03`).

## Self-Check: PASSED

- [x] All 8 service files modified and verified
- [x] Zero `eq(X.tenantId, tenantId)` patterns remain in any of the 8 files
- [x] All files contain `_tenantId` (min 4 occurrences each)
- [x] All 8 files import and use `TENANT_ID`
- [x] `tenantOnlyWhere` removed from task-queue.service.ts
- [x] TypeScript build: no new errors (pre-existing test-file errors only)
- [x] 3 task commits: 8c64f4e, 24e0c0c, b34827f
