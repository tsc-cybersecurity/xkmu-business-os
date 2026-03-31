---
phase: 06-code-quality
plan: "01"
subsystem: cms
tags: [typescript, type-safety, code-quality, cms-blocks]
dependency_graph:
  requires: []
  provides: [typed-cms-block-renderer, typed-block-field-renderer]
  affects: [src/app/_components/blocks/, src/app/_components/cms-block-renderer.tsx, src/app/intern/(dashboard)/cms/]
tech_stack:
  added: []
  patterns: [exported-content-interfaces, typed-casts-in-switch]
key_files:
  created: []
  modified:
    - src/app/_components/cms-block-renderer.tsx
    - src/app/_components/blocks/hero-block.tsx
    - src/app/_components/blocks/banner-block.tsx
    - src/app/_components/blocks/blog-listing-block.tsx
    - src/app/_components/blocks/cards-block.tsx
    - src/app/_components/blocks/comparison-block.tsx
    - src/app/_components/blocks/cta-block.tsx
    - src/app/_components/blocks/divider-block.tsx
    - src/app/_components/blocks/faq-block.tsx
    - src/app/_components/blocks/features-block.tsx
    - src/app/_components/blocks/gallery-block.tsx
    - src/app/_components/blocks/heading-block.tsx
    - src/app/_components/blocks/image-block.tsx
    - src/app/_components/blocks/logocloud-block.tsx
    - src/app/_components/blocks/placeholder-block.tsx
    - src/app/_components/blocks/pricing-block.tsx
    - src/app/_components/blocks/service-cards-block.tsx
    - src/app/_components/blocks/stats-block.tsx
    - src/app/_components/blocks/team-block.tsx
    - src/app/_components/blocks/testimonials-block.tsx
    - src/app/_components/blocks/text-block.tsx
    - src/app/_components/blocks/timeline-block.tsx
    - src/app/_components/blocks/video-block.tsx
    - src/app/intern/(dashboard)/cms/[id]/blocks/[blockId]/_components/block-field-renderer.tsx
    - src/lib/db/seed-check.ts
    - src/lib/db/seeds/cms-seed.ts
    - src/__tests__/unit/utils/rate-limit.test.ts
decisions:
  - "All CMS content interfaces made optional: JSON from DB has no field guarantees, so all *BlockContent fields are optional by design"
  - "PricingPlanItem and ServiceCardItem interfaces added locally in block-field-renderer: avoids Record<string,unknown> type holes while staying within file scope"
  - "BannerBlockContent.text made optional: was the only required field found, making Record<string,unknown> cast invalid"
metrics:
  duration_minutes: 13
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 27
---

# Phase 6 Plan 1: Eliminate all `as any` casts — Summary

**One-liner:** Replaced 43 `as any` casts with specific TypeScript types across CMS block renderer, block field renderer, seed files, and rate-limit test; build passes cleanly.

## What Changed

### Task 1: Export content interfaces + cms-block-renderer (22 block files + 1 renderer)

Added `export` keyword to the `*BlockContent` interface in all 22 block files:
- hero-block, banner-block, blog-listing-block, cards-block, comparison-block, cta-block, divider-block, faq-block, features-block, gallery-block, heading-block, image-block, logocloud-block, placeholder-block, pricing-block, service-cards-block, stats-block, team-block, testimonials-block, text-block, timeline-block, video-block

Added 22 `import type { *BlockContent }` statements to `cms-block-renderer.tsx` and replaced every `content as any` in the switch statement with `content as *BlockContent`.

**Before:** 22 casts `content as any` in switch
**After:** `content as HeroBlockContent`, `content as FeaturesBlockContent`, etc.

### Task 2: Fix remaining 21 casts (block-field-renderer, seeds, test)

**block-field-renderer.tsx (18 casts):**
- Added local interfaces: `BadgeContent`, `PricingPlanItem`, `ServiceCardItem`
- `content.badge as any` → `content.badge as BadgeContent | undefined` (4 casts)
- `content.buttons/stats/items/highlights as any[]` → `as Record<string, string>[]` (12 casts)
- `content.columns/rows as any[]` → typed array types matching `ComparisonField` props (2 casts)
- `PricingPlansField`/`ServiceCardsField` internal types: `Array<Record<string, any>>` → typed interfaces
- Updated `updatePlan`/`updateItem` to accept `value: unknown` instead of `value: any`

**seed files (2 casts):**
- `(blockData as any).settings` → `(blockData as { settings?: Record<string, unknown> }).settings`
- Applied to both `seed-check.ts` and `seeds/cms-seed.ts`

**rate-limit test (1 cast):**
- `mockRedis as any` → `mockRedis as unknown as ReturnType<typeof getRedisClient>`

## Grep Counts

| Metric | Before | After |
|--------|--------|-------|
| `as any` in src/ | 43 | 0 |
| `Record<string, any>` in src/ | 4 | 0 |

## Build Status

- `npx tsc --noEmit`: exits 0 for app code (pre-existing test file errors unrelated to this plan)
- `npx next build`: SUCCESS — all 200+ routes compiled

Pre-existing tsc errors in test files (out of scope, not caused by this plan):
- `src/__tests__/helpers/mock-request.ts` — AbortSignal null compatibility
- `src/__tests__/integration-real/auth-flow.test.ts` — Cannot find module (route file)
- `src/__tests__/unit/services/cms-navigation.service.test.ts` — DB type conversion
- `src/__tests__/unit/services/user.service.test.ts` — possibly undefined

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | aa32bfe | feat(06-01): export BlockContent interfaces and typed cms-block-renderer |
| Task 2 | 4e936df | feat(06-01): fix remaining 21 as-any casts and verify build |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BannerBlockContent.text was required, causing invalid cast**
- **Found during:** Task 2 (tsc run after initial changes)
- **Issue:** `text: string` (required) made `content as BannerBlockContent` invalid from `Record<string, unknown>`
- **Fix:** Changed `text: string` to `text?: string` in banner-block.tsx — all CMS content fields should be optional (JSON from DB has no guarantees)
- **Files modified:** `src/app/_components/blocks/banner-block.tsx`
- **Commit:** 4e936df

**2. [Rule 1 - Bug] PricingPlansField/ServiceCardsField used Record<string, unknown> causing unknown property access**
- **Found during:** Task 2 (tsc run)
- **Issue:** After changing `Array<Record<string, any>>` to `Array<Record<string, unknown>>`, property accesses like `plan.name` returned `unknown`, which is incompatible with Input `value` prop
- **Fix:** Added local `PricingPlanItem` and `ServiceCardItem` interfaces with properly typed optional fields; updated function signatures and usage sites to use these interfaces
- **Files modified:** `src/app/intern/(dashboard)/cms/[id]/blocks/[blockId]/_components/block-field-renderer.tsx`
- **Commit:** 4e936df

## Self-Check: PASSED
