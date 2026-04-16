---
phase: "04"
plan: "01"
subsystem: services
tags: [tenant-decoupling, soft-removal, compliance, audit, documents, utilities]
dependency_graph:
  requires: ["03-01", "03-02", "03-03"]
  provides: ["04-02"]
  affects: ["src/lib/services"]
tech_stack:
  added: []
  patterns: ["soft-removal pattern", "TENANT_ID constant", "_tenantId prefix"]
key_files:
  created: []
  modified:
    - src/lib/services/grundschutz-asset.service.ts
    - src/lib/services/grundschutz-audit.service.ts
    - src/lib/services/wiba-audit.service.ts
    - src/lib/services/din-audit.service.ts
    - src/lib/services/document-calculation.service.ts
    - src/lib/services/document-template.service.ts
    - src/lib/services/email-template.service.ts
    - src/lib/services/contract-template.service.ts
    - src/lib/services/contract-clause.service.ts
    - src/lib/services/cockpit.service.ts
    - src/lib/services/receipt.service.ts
    - src/lib/services/webhook.service.ts
    - src/lib/services/activity.service.ts
    - src/lib/services/business-document.service.ts
    - src/lib/services/business-profile.service.ts
    - src/lib/services/company-research.service.ts
    - src/lib/services/firecrawl-research.service.ts
    - src/lib/services/idea.service.ts
    - src/lib/services/tenant-seed.service.ts
decisions:
  - "firecrawl.service.ts and serpapi.service.ts required no changes: no DB queries with tenantId, only optional param for logging"
  - "contract-template and contract-clause use TENANT_ID in both INSERT and WHERE (these tables support nullable tenantId for system records)"
  - "cockpit.verifyCredentialOwnership: removed tenantId from join condition since cockpitSystems no longer filtered by tenant"
  - "tenant-seed.service.ts: TENANT_ID constant used for all inserts and seeded-check queries; _tenantId param still passed to RoleService for compatibility"
metrics:
  duration_minutes: 45
  completed_date: "2026-04-13"
  tasks_completed: 3
  files_modified: 19
---

# Phase 04 Plan 01: Compliance/Audit/Docs/Utilities Tenant Decoupling Summary

**One-liner:** Soft-removed all eq(X.tenantId, tenantId) WHERE filters and replaced INSERT tenantId params with TENANT_ID constant across 21 compliance, audit, document, and utility services.

## What Was Done

Applied the Phase 3 soft-removal pattern identically to 21 service files across two task groups:

### Task 1: 11 Compliance/Audit Services (commit 2697918)

| Service | Changes |
|---------|---------|
| grundschutz-asset | Removed tenantId from list/getById/update/delete/createRelation/deleteRelation/upsertControlMapping/getSchutzbedarfOverview; TENANT_ID in all inserts |
| grundschutz-audit | Removed tenantId from getById/list/delete/updateStatus; TENANT_ID in create/saveAnswer inserts |
| wiba-audit | Removed tenantId from getById/update/delete/list/getAnswers; TENANT_ID in create/saveAnswer |
| din-audit | Removed tenantId from getById/update/delete/list/getAnswers; TENANT_ID in create/saveAnswer |
| document-calculation | Removed tenantId from all WHERE clauses on documents/documentItems; TENANT_ID in addItem insert |
| document-template | Removed tenantId WHERE filters; TENANT_ID in create; seed() checks by name only |
| email-template | Removed tenantId WHERE filters from all methods; TENANT_ID in create |
| contract-template | Replaced tenantId param with TENANT_ID constant in WHERE and INSERT |
| contract-clause | Replaced tenantId param with TENANT_ID constant in WHERE and INSERT |
| cockpit | Removed tenantId from all system queries; TENANT_ID in create; removed tenantId from verifyCredentialOwnership join |
| receipt | Removed tenantId WHERE filters; TENANT_ID in create |

### Task 2: 10 Utility/Research/Seed Services (commit 23e57b0)

| Service | Changes |
|---------|---------|
| webhook | Removed tenantId WHERE filters from all methods; TENANT_ID in create |
| activity | Removed tenantId WHERE filters; TENANT_ID in create |
| business-document | Removed tenantId WHERE filters; TENANT_ID in create |
| business-profile | Uses TENANT_ID constant for getByTenant lookup and insert |
| company-research | Removed tenantId WHERE filters; TENANT_ID in create |
| firecrawl-research | Removed tenantId WHERE filters; TENANT_ID in create |
| firecrawl | No changes needed (no DB queries, tenantId only for logging) |
| idea | Removed tenantId WHERE filters; TENANT_ID in create |
| serpapi | No changes needed (no DB queries, tenantId only for logging) |
| tenant-seed | Renamed all tenantId params to _tenantId; TENANT_ID in all inserts and seeded-check WHERE clauses |

### Task 3: Build Validation

TypeScript check (`npx tsc --noEmit`) returned 0 errors in production source files. Pre-existing test file errors (in `__tests__/`) are unrelated to this plan's changes.

Smoke grep confirmed: `grep -rn "eq(.*\.tenantId, tenantId)"` returns no matches across all 21 files.

## Pattern Applied

```typescript
// Before
async list(tenantId: string, filters = {}) {
  const conditions = [eq(table.tenantId, tenantId)]
  // ...
}
async create(tenantId: string, data) {
  await db.insert(table).values({ tenantId, ...data })
}

// After
async list(_tenantId: string, filters = {}) {
  const conditions = []  // tenant filter removed
  // ...
}
async create(_tenantId: string, data) {
  await db.insert(table).values({ tenantId: TENANT_ID, ...data })
}
```

## Deviations from Plan

None — plan executed exactly as written, with two files (firecrawl.service.ts, serpapi.service.ts) confirmed clean without modification per the plan's special-case notes.

## Self-Check

### Files exist
- All 19 modified files confirmed present in git diff for commits 2697918 and 23e57b0

### Commits exist
- 2697918: feat(04-01): soft-remove tenant filters from 11 compliance/audit services
- 23e57b0: feat(04-01): soft-remove tenant filters from utility/research/seed services

## Self-Check: PASSED
