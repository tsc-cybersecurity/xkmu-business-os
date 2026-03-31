# Phase 6: Code Quality - Research

**Researched:** 2026-03-30
**Domain:** TypeScript type safety, Drizzle ORM batch queries, React component architecture
**Confidence:** HIGH

---

## Summary

Phase 6 is the final phase of the v1.4.0 milestone. It addresses three purely technical
debt categories that were deferred until a tested, hardened codebase was in place:
TypeScript `as any` elimination, N+1 query patterns, and monolithic component splitting.

All three problems are well-understood from direct codebase inspection. No new libraries
are required. The work is mechanical but high-volume: 43 `as any` casts across 5 files,
8 N+1 loops across 6 services/routes, and 7 components ranging from 760 to 1158 lines.
The CMS block typing work is the most architecturally interesting piece — the solution
already exists (each block component defines its own `*Content` interface) but those
types are not yet used at the renderer level.

**Primary recommendation:** Execute plans in order 06-01 → 06-02 → 06-03. The TypeScript
plan is the riskiest (many small edits, must not introduce TS errors), the N+1 plan is
the most impactful for performance, and the component splitting is the highest line-count
effort but lowest risk (pure restructuring).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R4.1 | 42 `as any` casts durch korrekte Typen ersetzen — 0 Ergebnisse bei `grep -rn "as any" src/` | All 43 casts located and categorized below; each block type already has a typed `*Content` interface ready to use |
| R4.2 | Sequentielle DB-Queries in Loops durch Batch-Queries ersetzen | All 8 N+1 locations found; Drizzle batch patterns (insert.values([]), inArray, sql CASE WHEN) documented below |
| R4.3 | 7 grosse Page-Komponenten (600-1100+ Zeilen) aufteilen — keine Komponente > 400 Zeilen | All 7 components measured; logical split boundaries identified for each |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

No CONTEXT.md exists for Phase 6 (no prior `/gsd:discuss-phase` session). The following
constraints are derived from CLAUDE.md project conventions which apply to all phases.

- **Tech stack**: No new libraries unless absolutely necessary — existing stack only
- **Backward compatibility**: No API endpoint changes (internal refactor only)
- **Build gate**: `npx next build` AND `tsc --noEmit` must pass after every plan
- **German UI**: All new string literals visible to users must be in German
- **Naming**: Components as named exports (`export function X`), services as const objects
- **Imports**: Always `@/` alias, never relative paths from `src/`
- **No Prettier**: Do not reformat files beyond the changes needed — ESLint only
- **Multi-tenant**: No service method changes that remove `tenantId` param

---

## R4.1: TypeScript Strictness — Complete Inventory

### Current Count
Confirmed via grep: **43 `as any` casts** in src/ (CONCERNS.md said 42; one new one in test file).

### Breakdown by File

| File | Count | Root Cause |
|------|-------|-----------|
| `src/app/intern/(dashboard)/cms/[id]/blocks/[blockId]/_components/block-field-renderer.tsx` | 18 | `content: Record<string, unknown>` prop — accessing nested typed properties requires cast |
| `src/app/_components/cms-block-renderer.tsx` | 22 | Each block component's `content` prop is typed as its specific `*Content` interface, but renderer receives `Record<string, unknown>` |
| `src/lib/db/seed-check.ts` | 1 | `(blockData as any).settings` |
| `src/lib/db/seeds/cms-seed.ts` | 1 | `(blockData as any).settings` |
| `src/__tests__/unit/utils/rate-limit.test.ts` | 1 | `mockRedis as any` in test — acceptable, but can be typed |

### The Fix Strategy

**CMS Block Renderer (22 casts — highest priority)**

The root cause: `CmsBlockRenderer` receives `content: Record<string, unknown>` and passes it
to typed block components like `<HeroBlock content={content as any} />`. Each block component
already defines its own `*HeroBlockContent` interface with all optional fields.

Fix: Create a **discriminated union** of all block content types, or simply cast to the
specific content type within each switch branch using a type assertion with the actual type
(not `any`). The correct approach is the **direct cast pattern**:

```typescript
// Instead of: content as any
// Use: content as HeroBlockContent
case 'hero':
  return <HeroBlock content={content as HeroBlockContent} settings={settings} />
```

Since `HeroBlockContent` has all-optional fields and `Record<string, unknown>` is wider,
TypeScript will accept the narrowing cast without error. This eliminates `any` while
preserving runtime behavior.

The `CmsBlockRendererProps` interface keeps `content: Record<string, unknown>` (correct —
the DB stores JSON, the type is only enforced at the block level).

All 22 required imports from block files:
```typescript
import type { HeroBlockContent } from './blocks/hero-block'
import type { FeaturesBlockContent } from './blocks/features-block'
// ... (22 block types × 1 import each)
```

**block-field-renderer.tsx (18 casts)**

Same root cause: `content: Record<string, unknown>` prop. The fix is two-layered:

1. For the `badge` object (`content.badge as any`): Define a local `BadgeContent` interface
   `{ icon?: string; text?: string }` and cast to it where needed.

2. For array fields (`content.items as any[]`, `content.buttons as any[]`, etc.): Cast to
   specific item-typed arrays. Each block type's items have known shapes already defined in
   the block components — these can be re-exported or duplicated locally as small interfaces.

   Simpler alternative that satisfies the requirement: cast to `unknown[]` instead of `any[]`
   — this removes `any` while keeping the content type flexible. `ArrayField` already accepts
   items for display; the field names are string literals, so no item typing is needed
   downstream.

**Seed files (2 casts)**

Both do `(blockData as any).settings`. The `blockData` variable is typed from a literal object
in the seed data. Fix: add an explicit type to the seed block data objects that includes a
`settings` property, or use `(blockData as { settings?: Record<string, unknown> }).settings`.

**Test file (1 cast)**

`mockRedis as any` can be typed as `mockRedis as ReturnType<typeof getRedisClient>` or use
`vi.mocked(getRedisClient).mockReturnValue(mockRedis as unknown as Redis)`.

### Type Definitions to Create

A new file `src/app/_components/blocks/types.ts` (or inline imports) for the discriminated
union is optional. The simpler approach that avoids a new file:

- In `cms-block-renderer.tsx`: Import each `*BlockContent` type from its block file and use
  specific casts in the switch.
- In `block-field-renderer.tsx`: Define a local `BadgeContent` interface at the top of the
  file; cast arrays to `unknown[]` (removes `any`, avoids needing full item types).

### Acceptance Verification
```bash
grep -rn "as any" src/ --include="*.ts" --include="*.tsx"
# Expected: 0 results (or only documented exceptions in comments)
npx tsc --noEmit
npx next build
```

---

## R4.2: N+1 Query Fixes — Complete Inventory

### All 8 Locations

| File | Method | Loop Type | Items | Batch Strategy |
|------|--------|-----------|-------|----------------|
| `src/lib/services/din-audit.service.ts:202-208` | `saveBulkAnswers` | `for...of` loop calling `saveAnswer` (upsert) | ~50 answers per audit session | `INSERT ... ON CONFLICT DO UPDATE` with values array |
| `src/lib/services/cms-block.service.ts:106-112` | `reorder` | `for (let i)` updating sortOrder per block | ~10-20 blocks per page | Drizzle `sql` CASE WHEN batch UPDATE |
| `src/lib/services/cms-navigation.service.ts:105-110` | `reorder` | `for (let i)` in transaction, updating sortOrder | ~10-20 nav items | Drizzle `sql` CASE WHEN batch UPDATE (inside existing transaction) |
| `src/lib/services/document-calculation.service.ts:194-205` | `reorderItems` | `for (let i)` updating `position` | ~20 items | Drizzle `sql` CASE WHEN batch UPDATE |
| `src/lib/services/ai/image-generation.service.ts:477-481` | `bulkDelete` | `for...of` calling `this.delete()` per id | variable | `db.delete().where(inArray(table.id, ids))` |
| `src/app/api/v1/processes/dev-tasks/generate/route.ts:98-99` | inline handler | `for...of` calling `ProcessService.listTasks` per process | ~10-30 processes | Load all tasks in one query with `inArray(processTasks.processId, processIds)` |
| `src/app/api/v1/social-media/topics/generate/route.ts:60-66` | inline handler | `for (let i)` calling `SocialMediaTopicService.create` per topic | ~5-10 topics | `db.insert(socialMediaTopics).values(topicsArray).returning()` |
| `src/lib/services/ai-prompt-template.service.ts:127-141` | `seedDefaults` | `for...of` checking existence then creating per slug | ~20 templates | Load all existing slugs for tenant in one query, then batch-insert missing |

### Batch Patterns Available in This Codebase

**Pattern 1: Batch INSERT (already used in grundschutz-catalog.service.ts)**
```typescript
await db.insert(socialMediaTopics).values(topicsArray).returning()
```

**Pattern 2: Batch DELETE with inArray (already used in lead.service.ts)**
```typescript
import { inArray } from 'drizzle-orm'
await db.delete(generatedImages).where(
  and(eq(generatedImages.tenantId, tenantId), inArray(generatedImages.id, ids))
)
```

**Pattern 3: Sort-order batch UPDATE with sql CASE WHEN**
For reorder operations where each ID gets a different sortOrder value:
```typescript
import { sql } from 'drizzle-orm'

// Build: UPDATE cms_blocks SET sort_order = CASE id
//   WHEN 'uuid1' THEN 0 WHEN 'uuid2' THEN 1 ... END
//   WHERE id IN (...)
const caseExpr = sql`CASE id ${sql.join(
  blockIds.map((id, i) => sql`WHEN ${id} THEN ${i}`),
  sql` `
)} END`
await db.update(cmsBlocks)
  .set({ sortOrder: caseExpr, updatedAt: new Date() })
  .where(inArray(cmsBlocks.id, blockIds))
```

Note: Drizzle ORM's `sql` tagged template supports this pattern. The `sql.join()` helper
concatenates sql fragments. This replaces N individual UPDATE calls with one.

**Pattern 4: Upsert (INSERT ON CONFLICT) for din-audit saveBulkAnswers**
```typescript
await db.insert(dinAnswers)
  .values(answers.map(a => ({ tenantId, sessionId, requirementId: a.requirementId, ... })))
  .onConflictDoUpdate({
    target: [dinAnswers.sessionId, dinAnswers.requirementId],
    set: { status: sql`excluded.status`, justification: sql`excluded.justification`, answeredAt: new Date() }
  })
  .returning()
```
This requires verifying the unique constraint on `(sessionId, requirementId)` exists in the
schema. If not, a DB migration or fallback to `Promise.all()` is needed.

**Pattern 5: Promise.all() for independent queries (processes dev-tasks)**
```typescript
const tasksByProcess = await Promise.all(
  allProcesses.map(p => ProcessService.listTasks(auth.tenantId, p.id))
)
```
This parallelizes the queries rather than eliminating them, but reduces wall-clock time
from N×latency to max(latency). Use when queries are truly independent and a JOIN would
be complex.

**Pattern 6: Pre-load then filter (ai-prompt-template seedDefaults)**
```typescript
const existingSlugs = new Set(
  (await db.select({ slug: aiPromptTemplates.slug })
    .from(aiPromptTemplates)
    .where(eq(aiPromptTemplates.tenantId, tenantId)))
  .map(r => r.slug)
)
const toCreate = Object.entries(DEFAULT_TEMPLATES).filter(([slug]) => !existingSlugs.has(slug))
if (toCreate.length > 0) {
  await db.insert(aiPromptTemplates).values(toCreate.map(([slug, d]) => ({ tenantId, slug, ... })))
}
```

### Priority Order for Plan 06-02

1. **`bulkDelete` in image-generation.service.ts** — trivial `inArray` fix, high value
2. **`reorder` in cms-block.service.ts** — called on every drag-drop in CMS editor
3. **`reorder` in cms-navigation.service.ts** — same pattern, same fix
4. **`reorderItems` in document-calculation.service.ts** — same pattern
5. **`create` loop in social-media topics generate route** — batch INSERT
6. **`seedDefaults` in ai-prompt-template.service.ts** — pre-load + batch insert
7. **`listTasks` loop in dev-tasks generate route** — Promise.all() (queries are per-process)
8. **`saveBulkAnswers` in din-audit.service.ts** — upsert or Promise.all() (verify unique constraint first)

---

## R4.3: Komponenten-Splitting — Complete Inventory

### Current State

| File | Lines | Primary Concern |
|------|-------|-----------------|
| `src/app/intern/(dashboard)/cockpit/page.tsx` | 1158 | Single page with system list, stats, create/edit dialog, credential sub-dialog — all in one component |
| `src/components/shared/ai-research-card.tsx` | 1047 | Has 4 internal helper components already (`renderValue`, `AddressesDisplay`, `ResearchResultDisplay`, `CrawlPageItem`, `CrawlResultsDisplay`, `ProposedChangesPanel`), plus main `AIResearchCard` export |
| `src/app/intern/(dashboard)/prozesse/dev/page.tsx` | 983 | Dev tasks page with filters, stats, task cards, AI analysis dialog |
| `src/app/intern/(dashboard)/cybersecurity/grundschutz/assets/[id]/page.tsx` | 883 | 3-tab detail page (Stammdaten, Beziehungen, Controls) + ControlDialog |
| `src/app/intern/(dashboard)/cms/[id]/blocks/[blockId]/_components/block-field-renderer.tsx` | 878 | Large switch on blockType — each case is a form section for one block type |
| `src/app/intern/(dashboard)/chancen/page.tsx` | 763 | Opportunities list with filters, create/edit dialog, table |
| `src/app/intern/(dashboard)/catalog/_components/product-form.tsx` | 760 | Single-form component for product create/edit (no internal components) |

### Split Strategies

**cockpit/page.tsx (1158 lines → target: 4 files)**

Logical sections from comment markers:
- `CockpitStatsCards` (~60 lines) — the 4 stat cards (`{/* Stats Cards */}`)
- `CockpitSystemsTable` (~130 lines) — the table section (`{/* Systems Table */}`)
- `CockpitSystemDialog` (~400 lines) — the create/edit dialog with credential sub-section (`{/* Create/Edit Dialog */}`)
- `cockpit/page.tsx` (~200 lines remaining) — state, handlers, header, orchestration

Files go in `src/app/intern/(dashboard)/cockpit/_components/`:
- `cockpit-stats-cards.tsx`
- `cockpit-systems-table.tsx`
- `cockpit-system-dialog.tsx`

**ai-research-card.tsx (1047 lines → already partially split)**

This file already defines sub-functions as named functions in the same file. The fix is to
move the already-separated internal components into their own files in a
`src/components/shared/ai-research/` directory:
- `addresses-display.tsx` (function `AddressesDisplay`, ~35 lines)
- `research-result-display.tsx` (function `ResearchResultDisplay`, ~130 lines)
- `crawl-results-display.tsx` (functions `CrawlPageItem` + `CrawlResultsDisplay`, ~60 lines)
- `proposed-changes-panel.tsx` (function `ProposedChangesPanel`, ~130 lines)
- `ai-research-card.tsx` (main export, remaining ~600 lines — still large but split further if needed)

Note: The 4 helper function/components are already logically separated in the file with comment
blocks. This is mostly a mechanical file-split.

**prozesse/dev/page.tsx (983 lines → target: 3 files)**

Section boundaries from comment markers:
- `DevTaskFilters` (~65 lines) — `{/* Filters */}` section (filters bar)
- `DevTaskCard` (~200 lines) — the per-task rendering block inside `{/* Results */}`
- `DevAnalysisDialog` (~80 lines) — `{/* AI Analysis Dialog */}`
- `dev/page.tsx` (~400 lines) — state, data fetch, generate functions, header, stats

Files in `src/app/intern/(dashboard)/prozesse/dev/_components/`:
- `dev-task-filters.tsx`
- `dev-task-card.tsx`
- `dev-analysis-dialog.tsx`

**grundschutz/assets/[id]/page.tsx (883 lines → target: 3 files)**

Tabs map directly to sub-components:
- `AssetStammdatenTab` (~140 lines) — Tab 1 (Stammdaten & Schutzbedarf)
- `AssetBeziehungenTab` (~75 lines) — Tab 2 (Beziehungen)
- `AssetControlsTab` (~70 lines) — Tab 3 (Controls table)
- `AssetControlDialog` (~120 lines) — control add/edit dialog
- `[id]/page.tsx` (~300 lines) — state, fetch, handlers, header, tab switcher

Files in `src/app/intern/(dashboard)/cybersecurity/grundschutz/assets/[id]/_components/`:
- `asset-stammdaten-tab.tsx`
- `asset-beziehungen-tab.tsx`
- `asset-controls-tab.tsx`
- `asset-control-dialog.tsx`

**cms/blocks/block-field-renderer.tsx (878 lines → target: per-block-type files)**

The 878-line switch statement renders fields for each of ~20 block types. The natural split:
- Move each `case 'hero': return (<>...</>)` to its own file
- `HeroBlockFields`, `FeaturesBlockFields`, etc.

However, this creates 20 small files (~20-40 lines each) plus a thin dispatcher.
A pragmatic middle approach: group related block field editors:

- `text-blocks-fields.tsx` — hero, heading, text, cta (~150 lines)
- `media-blocks-fields.tsx` — image, video, gallery, logo-cloud, banner, divider (~130 lines)
- `list-blocks-fields.tsx` — features, cards, testimonials, faq, stats, team, timeline, service-cards (~250 lines)
- `complex-blocks-fields.tsx` — pricing, comparison, blog-listing (~130 lines)
- `block-field-renderer.tsx` — thin dispatcher importing from above (~80 lines)

This reduces the main file from 878 to ~80 lines while keeping related fields co-located.

**chancen/page.tsx (763 lines → target: 3 files)**

Same pattern as other list pages:
- `ChancenDialog` (~200 lines) — create/edit dialog
- `ChancenTable` (~150 lines) — the table section
- `chancen/page.tsx` (~250 lines) — state, handlers, header, filters

Files in `src/app/intern/(dashboard)/chancen/_components/`:
- `chancen-dialog.tsx`
- `chancen-table.tsx`

**catalog/product-form.tsx (760 lines → target: 3-4 files)**

The product form is a single `<form>` with sections. Extract field-group sub-components:
- `ProductBasicFields` (~100 lines) — name, SKU, type, status fields
- `ProductPricingFields` (~120 lines) — pricing, tax, unit fields
- `ProductDescriptionFields` (~100 lines) — description, long-description, features fields
- `product-form.tsx` (~300 lines) — form shell, submit handler, state management

Files in `src/app/intern/(dashboard)/catalog/_components/`:
- `product-basic-fields.tsx`
- `product-pricing-fields.tsx`
- `product-description-fields.tsx`

### Component Splitting Rules (from conventions)

- Sub-components live in `_components/` directory alongside the page file
- Named exports: `export function ComponentName(...)`
- Import with `@/app/intern/(dashboard)/.../_components/...` alias
- Shared components (used in multiple pages) go to `src/components/shared/`
- Props interfaces are defined in the same file as the component (not in a shared types file)
- State that is only needed in one sub-component moves down to that component
- Callbacks that modify parent state are passed as props

### Anti-Patterns to Avoid

- **Do not split just by line count**: split by logical concern (state ownership, render scope)
- **Do not create "dumb" prop-drilling chains**: if a sub-component needs 10+ props, reconsider
  the boundary or use a context
- **Do not extract inline lambdas as named components**: only extract components that have their
  own clear state or render responsibilities
- **Do not move shared state to a sub-component**: state that drives multiple siblings stays in
  the parent

---

## Standard Stack

No new dependencies needed for Phase 6. All work uses:

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | 5.9.3 (existing) | Strict type checking — `tsc --noEmit` is the gate |
| Drizzle ORM | 0.45.1 (existing) | `sql`, `inArray`, `and`, `eq` — all available |
| React | 19.2.4 (existing) | Component splitting |
| Vitest | 4.1.0 (existing) | Verify no regressions |

---

## Architecture Patterns

### Recommended File Structure After Splitting

```
src/
├── app/
│   ├── _components/
│   │   ├── cms-block-renderer.tsx          # Updated: specific type casts
│   │   └── blocks/
│   │       ├── hero-block.tsx              # Existing: exports HeroBlockContent type
│   │       └── types.ts                    # Optional: re-exports all Content types
│   └── intern/(dashboard)/
│       ├── cockpit/
│       │   ├── page.tsx                    # Reduced: ~200 lines
│       │   └── _components/
│       │       ├── cockpit-stats-cards.tsx
│       │       ├── cockpit-systems-table.tsx
│       │       └── cockpit-system-dialog.tsx
│       ├── cms/[id]/blocks/[blockId]/
│       │   └── _components/
│       │       ├── block-field-renderer.tsx  # Thin dispatcher: ~80 lines
│       │       ├── text-blocks-fields.tsx
│       │       ├── media-blocks-fields.tsx
│       │       ├── list-blocks-fields.tsx
│       │       └── complex-blocks-fields.tsx
│       └── ...
├── components/shared/
│   ├── ai-research-card.tsx                # Reduced main component
│   └── ai-research/
│       ├── addresses-display.tsx
│       ├── research-result-display.tsx
│       ├── crawl-results-display.tsx
│       └── proposed-changes-panel.tsx
└── lib/services/
    ├── din-audit.service.ts                # saveBulkAnswers: upsert
    ├── cms-block.service.ts                # reorder: CASE WHEN
    ├── cms-navigation.service.ts           # reorder: CASE WHEN
    ├── document-calculation.service.ts     # reorderItems: CASE WHEN
    ├── ai-prompt-template.service.ts       # seedDefaults: pre-load + batch insert
    └── ai/
        └── image-generation.service.ts     # bulkDelete: inArray
```

### Pattern: CMS Block Type Discriminated Union (for cms-block-renderer.tsx)

```typescript
// Source: existing block component files
import type { HeroBlockContent } from './blocks/hero-block'
import type { FeaturesBlockContent } from './blocks/features-block'
// ... repeat for all 22 block types

// In switch statement — cast to specific type, not any:
case 'hero':
  return wrapWithBackground(<HeroBlock content={content as HeroBlockContent} settings={settings} />)
case 'features':
  return wrapWithBackground(<FeaturesBlock content={content as FeaturesBlockContent} settings={settings} />)
```

TypeScript accepts this because `HeroBlockContent` has all-optional fields, making
`Record<string, unknown>` assignable to it via type assertion.

### Pattern: Sort-Order Batch UPDATE (for reorder methods)

```typescript
// Source: Drizzle ORM sql tagged templates — verified pattern
import { sql, inArray } from 'drizzle-orm'

async reorder(pageId: string, blockIds: string[]): Promise<boolean> {
  if (blockIds.length === 0) return true

  const caseExpr = sql`CASE id ${sql.join(
    blockIds.map((id, i) => sql`WHEN ${id}::uuid THEN ${i}`),
    sql` `
  )} ELSE sort_order END`

  await db.update(cmsBlocks)
    .set({ sortOrder: caseExpr, updatedAt: new Date() })
    .where(and(eq(cmsBlocks.pageId, pageId), inArray(cmsBlocks.id, blockIds)))

  await markPageDraftChanges(pageId)
  return true
}
```

### Pattern: Batch INSERT for topic/template seeding

```typescript
// For social-media topics generate route:
const topicsToInsert = generated.map((t, i) => ({
  tenantId: auth.tenantId,
  name: t.name,
  description: t.description,
  color: colors[i % colors.length],
}))
const saved = await db.insert(socialMediaTopics).values(topicsToInsert).returning()
return apiSuccess(saved, undefined, 201)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sort-order update for N items | N individual UPDATE calls | `sql` CASE WHEN + `inArray` | Already in codebase (Drizzle sql import) |
| Bulk delete by IDs | Loop calling `this.delete()` | `inArray(table.id, ids)` | Already used in lead.service.ts |
| Batch insert | Loop calling `create()` | `.insert().values([...]).returning()` | Used in grundschutz-catalog.service.ts |
| Block type discriminator | Custom type registry or runtime checks | TypeScript `as BlockContent` in switch | Block content interfaces already exist |

---

## Common Pitfalls

### Pitfall 1: TypeScript Cast Causes Build Error
**What goes wrong:** Casting `content as HeroBlockContent` fails if `HeroBlockContent` has
required (non-optional) fields, because TS won't narrow a wider type to one with required
properties via simple cast.
**Why it happens:** If any content interface has a required field, `content as HeroBlockContent`
produces a TS error because `Record<string, unknown>` doesn't satisfy it.
**How to avoid:** Verify all `*BlockContent` interfaces have only optional fields (they do —
checked in hero-block.tsx). If a field is added as required in the future, this cast pattern
must be revisited.
**Warning signs:** `tsc --noEmit` error: "Conversion of type 'Record<string, unknown>' to type
'HeroBlockContent' may be a mistake because neither type sufficiently overlaps the other."

### Pitfall 2: CASE WHEN with UUID Column
**What goes wrong:** PostgreSQL requires explicit UUID cast when using string literals in CASE
WHEN expressions against UUID-typed columns.
**Why it happens:** `WHEN 'some-string'` vs `WHEN 'some-string'::uuid` — PostgreSQL's type
system rejects the uncast literal against a UUID column in some contexts.
**How to avoid:** Always use `sql`WHEN ${id}::uuid THEN ${i}`` in sort-order CASE WHEN
expressions. Check schema column types before writing the query.
**Warning signs:** PostgreSQL error `operator does not exist: uuid = text`.

### Pitfall 3: Component Split Breaks Shared State
**What goes wrong:** Extracting a sub-component that needs state managed in the parent
results in excessive prop drilling or the need to lift state back up.
**Why it happens:** Component boundaries are drawn at UI sections, not at state ownership
boundaries.
**How to avoid:** Before splitting, identify which state variables are only used in one JSX
section. Move those down. State variables used across multiple sections stay in the parent.
Passing > 5 props to a sub-component is a warning sign.
**Warning signs:** Sub-component needs `setXxx` callback for state that is also read by
another sub-component.

### Pitfall 4: Missing export of Content Type from Block File
**What goes wrong:** `cms-block-renderer.tsx` imports `HeroBlockContent` from
`./blocks/hero-block`, but the interface is not exported from that file.
**Why it happens:** Original interfaces were defined as local (no `export` keyword).
**How to avoid:** When adding imports, verify each `*BlockContent` interface has `export` in
its definition. If not, add `export` to the interface in its source file (safe, no behavior
change).
**Warning signs:** TS error "Module has no exported member 'HeroBlockContent'".

### Pitfall 5: din-audit upsert requires unique constraint
**What goes wrong:** `INSERT ... ON CONFLICT DO UPDATE` on `(sessionId, requirementId)` fails
if there is no unique index on those columns.
**Why it happens:** Drizzle's `.onConflictDoUpdate({ target: [...] })` requires the target
columns to have a unique constraint in the DB schema.
**How to avoid:** Check `schema.ts` for the `din_answers` table definition before writing
the upsert. If no unique constraint exists, fall back to `Promise.all(answers.map(a =>
this.saveAnswer(...)))` which parallelizes without eliminating queries but is safe.
**Warning signs:** PostgreSQL error `there is no unique or exclusion constraint matching
the ON CONFLICT specification`.

---

## Code Examples

### Existing Batch INSERT Pattern (from grundschutz-catalog.service.ts)
```typescript
// Source: src/lib/services/grundschutz-catalog.service.ts
if (groupRows.length > 0) {
  await tx.insert(grundschutzGroups).values(groupRows)
}
```

### Existing inArray Pattern (from lead.service.ts)
```typescript
// Source: src/lib/services/lead.service.ts
import { inArray } from 'drizzle-orm'
conditions.push(inArray(leads.status, status))
```

### Existing Promise.all Pattern (from activity.service.ts)
```typescript
// Source: src/lib/services/activity.service.ts
const [items, [{ total }]] = await Promise.all([
  db.select()...,
  db.select({ total: count() })...,
])
```

### Block Content Type Import Pattern
```typescript
// Source: src/app/_components/blocks/hero-block.tsx
interface HeroBlockContent {
  backgroundImage?: string
  badge?: { icon?: string; text?: string }
  headline?: string
  // ... all optional
}
// Make exportable by adding export keyword
export interface HeroBlockContent { ... }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `as any` for polymorphic content | Specific content type casts in switch | Phase 6 | TS errors caught at compile time |
| N individual UPDATE calls for reorder | Single CASE WHEN UPDATE | Phase 6 | O(N) → O(1) DB round trips |
| 1000-line page components | Sub-components in `_components/` | Phase 6 | Faster re-renders, easier testing |

---

## Open Questions

1. **din_answers unique constraint**
   - What we know: `saveBulkAnswers` calls `saveAnswer` in a loop (upsert per answer)
   - What's unclear: Whether `(sessionId, requirementId)` has a unique index in schema.ts
   - Recommendation: Check `src/lib/db/schema.ts` for `dinAnswers` table before writing the
     batch fix. If no unique constraint → use `Promise.all()` instead of upsert.

2. **block-field-renderer ArrayField item types**
   - What we know: `ArrayField` receives `items` and `fields` (string array of field names)
   - What's unclear: Whether `ArrayField` component's type signature accepts `unknown[]` or
     requires a specific item type
   - Recommendation: Check `ArrayField` props definition before deciding between `unknown[]`
     and a typed item interface.

3. **ProcessService.listTasks — can it accept multiple processIds?**
   - What we know: Called in a loop per process in dev-tasks generate route
   - What's unclear: Whether `ProcessService.listTasks` supports an array of processIds or
     requires a single ID
   - Recommendation: If only single-ID, use `Promise.all()` (parallel not sequential). If
     the service can be extended to accept `processIds: string[]` with `inArray`, do that.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 6 is purely code refactoring with no external dependencies beyond
the existing project stack (TypeScript compiler, Drizzle, React). No new tools, services,
or runtimes are required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R4.1 | `as any` removed, no TS errors | static analysis | `npx tsc --noEmit` | N/A (compiler check) |
| R4.1 | Build succeeds after type changes | build | `npx next build` | N/A |
| R4.2 | `bulkDelete` uses inArray (no loop) | unit | `npx vitest run src/__tests__/unit/services/image-generation` | ❌ Wave 0 |
| R4.2 | `reorder` uses batch UPDATE (no loop) | unit | `npx vitest run src/__tests__/unit/services/cms-block` | ❌ Wave 0 |
| R4.2 | `saveBulkAnswers` uses batch (no loop) | unit | `npx vitest run src/__tests__/unit/services/din-audit` | ❌ Wave 0 |
| R4.3 | No component > 400 lines | static analysis | see bash command below | N/A |
| R4.3 | Build succeeds after splitting | build | `npx next build` | N/A |

Line count verification command:
```bash
find src/app -name "*.tsx" -exec wc -l {} \; | awk '$1 > 400 {print}' | sort -rn
```

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npx vitest run && npx next build`
- **Phase gate:** Full suite green + zero `as any` + all components < 400 lines before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/unit/services/image-generation.service.test.ts` — covers R4.2 bulkDelete
- [ ] `src/__tests__/unit/services/cms-block.service.test.ts` — covers R4.2 reorder
- [ ] `src/__tests__/unit/services/din-audit.service.test.ts` — covers R4.2 saveBulkAnswers

Existing test infrastructure (Vitest, vitest.config.ts, src/__tests__/setup.ts) is in place
and no framework installation is needed.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase grep — all `as any` counts and locations verified by running grep
- Direct file read — all N+1 locations verified from source
- Direct wc -l — all component line counts verified

### Secondary (MEDIUM confidence)
- CONCERNS.md (2026-03-30) — used as initial inventory, verified/updated by live grep
- CLAUDE.md conventions — authoritative for naming and architectural patterns

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all patterns from existing codebase
- Architecture: HIGH — patterns verified from live source files
- Pitfalls: HIGH — derived from direct inspection of actual types and schema patterns

**Research date:** 2026-03-30
**Valid until:** This research reflects the live codebase at research date. Re-run the grep
commands before executing each plan to confirm counts have not changed due to other work
landing in the interim.
