---
phase: "04"
plan: "02"
subsystem: services
tags: [tenant-decoupling, soft-removal, marketing, communication, media, cms, api-key]
dependency_graph:
  requires: [03-01, 03-02, 03-03, 04-01]
  provides: [SVC-21, SVC-22]
  affects: [src/lib/services]
tech_stack:
  added: []
  patterns: [soft-removal-pattern, TENANT_ID-constant]
key_files:
  created: []
  modified:
    - src/lib/services/social-publishing.service.ts
    - src/lib/services/social-media-post.service.ts
    - src/lib/services/social-media-topic.service.ts
    - src/lib/services/marketing-template.service.ts
    - src/lib/services/marketing-task.service.ts
    - src/lib/services/marketing-campaign.service.ts
    - src/lib/services/chat.service.ts
    - src/lib/services/feedback.service.ts
    - src/lib/services/product-category.service.ts
    - src/lib/services/media-upload.service.ts
    - src/lib/services/email.service.ts
    - src/lib/services/api-key.service.ts
decisions:
  - "user.service.ts left completely unchanged per AUTH-05 exemption"
  - "image-optimizer.service.ts has no DB queries; tenantId used only as file subDir (external param) — no soft-removal needed"
  - "cron.service.ts already clean — no tenantId WHERE filters existed"
  - "cms-navigation, cms-block-template, cms-block already global — no tenantId filters existed"
  - "Pre-existing TS errors in __tests__ dir are not introduced by this plan — no fix applied"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-13"
  tasks: 3
  files: 12
---

# Phase 04 Plan 02: Marketing/Communication/Misc Service Decoupling Summary

**One-liner:** Soft-removed tenantId WHERE filters from 12 service files covering social media, marketing, chat, feedback, product categories, media uploads, email, and API keys — completing the 18-service Phase 4 Batch 2 decoupling.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Social, Marketing and Communication Services (9) | a41aca5 | social-publishing, social-media-post, social-media-topic, marketing-template, marketing-task, marketing-campaign, chat, feedback, product-category |
| 2 | Media, Infrastructure and CMS Services (8 + user special) | 17b3a4a | media-upload, email, api-key (+ 5 already-clean confirmed) |
| 3 | Phase 4 completion validation | f6a6ee6 | (validation only) |

## What Was Done

Applied the Phase 3 soft-removal pattern identically to all targeted services:

1. Added `import { TENANT_ID } from '@/lib/constants/tenant'` to each service that needed it
2. Renamed `tenantId: string` parameters to `_tenantId: string` throughout
3. Removed all `eq(X.tenantId, tenantId)` clauses from WHERE conditions
4. Replaced `tenantId` (param) with `TENANT_ID` (constant) in all INSERT values

**Services confirmed already clean (no changes needed):**
- `cron.service.ts` — no tenantId WHERE filters (uses `tenant.id` from a DB lookup for task_queue logging, which is correct behavior)
- `cms-navigation.service.ts` — already global, no tenantId
- `cms-block-template.service.ts` — already global, no tenantId
- `cms-block.service.ts` — already global, no tenantId
- `image-optimizer.service.ts` — no DB queries; `tenantId` arg used only as filesystem subdirectory name

**Special handling:**
- `social-media-post.service.ts` bulkCreate: replaced the per-item `tenantId` (param) with `TENANT_ID` constant in the mapped values
- `chat.service.ts` listConversations: tenantId filter removed; list now scoped by `userId` only (correct for single-tenant)
- `feedback.service.ts`: both `feedbackForms.tenantId` filters and the joined count query filter removed
- `product-category.service.ts`: hasProducts and hasChildren simplified by removing products.tenantId filter
- `media-upload.service.ts`: `ImageOptimizerService.optimize(buffer, tenantId)` — the `tenantId` arg became `TENANT_ID` as the subDir constant
- `user.service.ts`: **left completely unchanged** per AUTH-05 exemption

## Deviations from Plan

None — plan executed exactly as written.

All 5 "already-clean" services were confirmed clean before being skipped. The TypeScript check revealed pre-existing errors only in `src/__tests__/` files (not introduced by this plan).

## Verification Results

```
# All 17 plan services clean:
grep -rn "eq(.*\.tenantId, tenantId)" src/lib/services/{social-publishing,social-media-post,...}.ts
→ CLEAN for all 17

# TypeScript (production code):
npx tsc --noEmit 2>&1 | grep "^src/lib"
→ (no output = 0 errors in src/lib)

# user.service.ts diff:
git diff HEAD -- src/lib/services/user.service.ts
→ (no output = unchanged)
```

## Known Stubs

None.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced. All changes are internal service-layer query simplifications consistent with the accepted single-tenant threat model (T-04-03 through T-04-05).

## Self-Check: PASSED

All modified files verified present and committed:
- a41aca5: 9 social/marketing/communication services
- 17b3a4a: 3 infra services (media-upload, email, api-key)
- f6a6ee6: validation chore commit
