---
phase: 03-services-entkoppeln-batch-1
plan: 03
subsystem: services
tags: [services, tenant, soft-removal, single-tenant, refactor]

dependency_graph:
  requires: [02-01]
  provides: [document-service-decoupled, n8n-service-decoupled, ai-provider-service-decoupled, ai-prompt-template-service-decoupled, role-service-decoupled, newsletter-service-decoupled, time-entry-service-decoupled]
  affects: [all-api-routes-using-these-services]

tech_stack:
  added: []
  patterns: [soft-removal-tenantId, _tenantId-param-prefix, TENANT_ID-const-for-inserts]

key_files:
  created: []
  modified:
    - src/lib/services/document.service.ts
    - src/lib/services/n8n.service.ts
    - src/lib/services/ai-provider.service.ts
    - src/lib/services/ai-prompt-template.service.ts
    - src/lib/services/role.service.ts
    - src/lib/services/newsletter.service.ts
    - src/lib/services/time-entry.service.ts

decisions:
  - "Soft-removal pattern: tenantId param renamed to _tenantId (callers unaffected), eq(X.tenantId, ...) filter removed, INSERT uses TENANT_ID const"
  - "document.service list() conditions array starts empty (no tenantId base condition) — whereClause becomes undefined when no filters, Drizzle handles undefined correctly"
  - "newsletter.service sendCampaign keeps EmailService.send(_tenantId, ...) call — EmailService signature unchanged"
  - "role.service countUsersPerRole removes eq(users.tenantId, ...) filter from user count query"

metrics:
  duration: "~5 min"
  completed: "2026-04-13"
  tasks_completed: 7
  files_changed: 7
---

# Phase 03 Plan 03: Rest-Block Services entkoppeln — Summary

**One-liner:** Soft-removal of tenantId from document, n8n, ai-provider, ai-prompt-template, role, newsletter, and time-entry services — params renamed to _tenantId, DB filters removed, INSERTs use TENANT_ID constant.

## Was wurde gebaut

Applied the soft-removal pattern to 7 remaining service files:

### Task 1: document.service.ts (6010da0)

- All `tenantId` params renamed to `_tenantId` (7 methods: generateNumber, getNextNumber, create, getById, update, delete, list, updateStatus, convertOfferToInvoice, convertContractToDocument)
- Removed `eq(documents.tenantId, tenantId)` from all WHERE clauses
- Removed `eq(documentItems.tenantId, tenantId)` from documentItems queries
- Removed `eq(companies.tenantId, tenantId)` from company snapshot lookup
- All `tenantId:` values in INSERT replaced with `TENANT_ID`
- `list()` conditions array now starts empty — no tenantId base filter

### Task 2: n8n.service.ts (729e807)

- `getConnection()`, `n8nFetch()`, all public methods: `tenantId` → `_tenantId`
- Removed `eq(n8nConnections.tenantId, tenantId)` from connection lookup (now just `isActive = true`)
- Removed `eq(n8nConnections.tenantId, tenantId)` from `getConnection()` public method (now no filter, returns first)
- Removed `eq(n8nWorkflowLogs.tenantId, tenantId)` from `listWorkflowLogs()`
- All INSERTs use `tenantId: TENANT_ID`

### Task 3: ai-provider.service.ts (803ca04)

- All methods: `tenantId` → `_tenantId`
- Removed `eq(aiProviders.tenantId, tenantId)` from list, getById, getActiveProviders, getDefaultProvider, create (default reset), update (default reset), update, delete
- Removed `eq(aiLogs.tenantId, tenantId)` from listLogs, getLogById, getLogStats
- INSERTs use `tenantId: TENANT_ID`
- `listLogs()` conditions array starts empty; `getLogStats()` has no WHERE

### Task 4: ai-prompt-template.service.ts (ff8d93b)

- All methods: `tenantId` → `_tenantId`
- Removed `eq(aiPromptTemplates.tenantId, tenantId)` from list, getById, getBySlug, update, delete, seedDefaults
- INSERTs use `tenantId: TENANT_ID`

### Task 5: role.service.ts (7737b96)

- All methods: `tenantId` → `_tenantId`
- Removed `eq(roles.tenantId, tenantId)` from seedDefaultRoles, getByName, getById, list, create, update, delete
- Removed `eq(users.tenantId, tenantId)` from countUsersPerRole
- INSERTs use `tenantId: TENANT_ID`

### Task 6: newsletter.service.ts (c00462c)

- All methods: `tenantId` → `_tenantId`
- Removed `eq(newsletterSubscribers.tenantId, tenantId)` from listSubscribers, deleteSubscriber, importSubscribers (email check)
- Removed `eq(newsletterCampaigns.tenantId, tenantId)` from listCampaigns, getCampaign, updateCampaign, deleteCampaign
- Removed `eq(newsletterSubscribers.tenantId, tenantId)` from sendCampaign subscriber query
- INSERTs use `tenantId: TENANT_ID`

### Task 7: time-entry.service.ts (956356e)

- All methods: `tenantId` → `_tenantId`
- Removed `eq(timeEntries.tenantId, tenantId)` from list, getById, update, delete, getRunningTimer, sumByCompany
- INSERTs use `tenantId: TENANT_ID`
- `list()` conditions array starts empty; `sumByCompany()` no longer includes tenantId condition

## Commits

| Hash    | Task | Service                    |
|---------|------|----------------------------|
| 6010da0 | 1    | document.service.ts        |
| 729e807 | 2    | n8n.service.ts             |
| 803ca04 | 3    | ai-provider.service.ts     |
| ff8d93b | 4    | ai-prompt-template.service.ts |
| 7737b96 | 5    | role.service.ts            |
| c00462c | 6    | newsletter.service.ts      |
| 956356e | 7    | time-entry.service.ts      |

## Deviations from Plan

None — plan executed exactly as written. All 7 services received identical soft-removal treatment.

## Self-Check: PASSED

- [x] src/lib/services/document.service.ts — FOUND, TENANT_ID import present, _tenantId params
- [x] src/lib/services/n8n.service.ts — FOUND, TENANT_ID import present, _tenantId params
- [x] src/lib/services/ai-provider.service.ts — FOUND, TENANT_ID import present, _tenantId params
- [x] src/lib/services/ai-prompt-template.service.ts — FOUND, TENANT_ID import present, _tenantId params
- [x] src/lib/services/role.service.ts — FOUND, TENANT_ID import present, _tenantId params
- [x] src/lib/services/newsletter.service.ts — FOUND, TENANT_ID import present, _tenantId params
- [x] src/lib/services/time-entry.service.ts — FOUND, TENANT_ID import present, _tenantId params
- [x] Commit 6010da0 — FOUND
- [x] Commit 729e807 — FOUND
- [x] Commit 803ca04 — FOUND
- [x] Commit ff8d93b — FOUND
- [x] Commit 7737b96 — FOUND
- [x] Commit c00462c — FOUND
- [x] Commit 956356e — FOUND
