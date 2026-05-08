# Agent-System Phase 1 — Schema & Service-Skelett

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Foundation für das KI-Agenten-System legen — DB-Schema (6 Tabellen + Extensions + Index) und leere Service-Module unter `src/lib/services/agents/`. Tick-Handler-Hook als no-op vorbereiten. Keine Logik, kein UI.

**Architecture:** Bounded Context unter `src/lib/services/agents/`. Schema additiv in bestehender `src/lib/db/schema.ts` ergänzt. Services als Skelette mit klaren Type-Signaturen (statt `any`-Stubs), damit Folge-Phasen sauber andocken können. PostgreSQL-Extensions (`pgvector`, `pg_trgm`) per separatem SQL-File vor Schema-Push aktiviert.

**Tech Stack:** Drizzle ORM 0.45, PostgreSQL (Supabase), `drizzle-kit push` für Schema-Sync, vitest für Smoke-Tests, Next.js 16.

**Spec-Referenz:** `docs/superpowers/specs/2026-05-08-agent-system-design.md`

---

## File Structure

**Neue Dateien:**
- `src/lib/services/agents/index.ts` — Re-Exports der Service-Module
- `src/lib/services/agents/orchestrator.service.ts` — Skeleton (plan/replan)
- `src/lib/services/agents/worker.service.ts` — Skeleton (executeStep)
- `src/lib/services/agents/memory.service.ts` — Skeleton (search/read/write/supersede/list)
- `src/lib/services/agents/tool-registry.ts` — Skeleton (Tool-Adapter-Definitions)
- `src/lib/services/agents/cost-tracker.service.ts` — Skeleton (recordCostEvent)
- `src/lib/services/agents/types.ts` — Shared TypeScript-Types für die Module
- `drizzle/manual/2026-05-08-agents-extensions.sql` — Manuelles SQL für Extensions
- `src/__tests__/unit/services/agents/skeleton-imports.test.ts` — Smoke-Test

**Modifizierte Dateien:**
- `src/lib/db/schema.ts` — neue Tabellen am Ende anhängen + neuer Import `vector`
- `src/lib/services/cron.service.ts` — `tick()` ruft no-op `processAgentTaskQueue()` auf

---

## Vorbedingungen

- Lokale `.env` zeigt auf eine Dev-Datenbank (Supabase Dev oder lokal)
- `pnpm install` ist aktuell

---

### Task 1: PostgreSQL-Extensions (pgvector, pg_trgm) aktivieren

**Files:**
- Create: `drizzle/manual/2026-05-08-agents-extensions.sql`

- [ ] **Step 1: SQL-File anlegen**

`drizzle/manual/2026-05-08-agents-extensions.sql`:

```sql
-- Extensions für Agent-Memory-System
-- Manuell ausführen vor `pnpm db:push` für Phase 1

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verifikation
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('vector', 'pg_trgm');
```

- [ ] **Step 2: SQL gegen Dev-DB ausführen**

```bash
psql "$DATABASE_URL" -f drizzle/manual/2026-05-08-agents-extensions.sql
```

Falls `psql` nicht verfügbar: SQL-Inhalt im Supabase-Studio SQL-Editor ausführen.

Erwartete Ausgabe (letzter SELECT):
```
 extname | extversion
---------+------------
 vector  | 0.x.x
 pg_trgm | 1.x
```

- [ ] **Step 3: Commit**

```bash
git add drizzle/manual/2026-05-08-agents-extensions.sql
git commit -m "chore(agents): pgvector + pg_trgm Extension SQL fuer Phase 1"
```

---

### Task 2: Schema-Imports erweitern

**Files:**
- Modify: `src/lib/db/schema.ts:1-23`

- [ ] **Step 1: `vector`-Import hinzufügen**

In der Import-Liste am Anfang von `src/lib/db/schema.ts` (Zeile 1-23) `vector` ergänzen:

```ts
import { pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  bigint,
  decimal,
  numeric,
  real,
  inet,
  index,
  uniqueIndex,
  unique,
  serial,
  smallint,
  char,
  time,
  vector,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartet: keine neuen Errors. Existierende Errors (falls vorhanden) gleich bleiben.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "chore(agents): vector-Import in schema.ts ergaenzen"
```

---

### Task 3: Schema `agent_goals`

**Files:**
- Modify: `src/lib/db/schema.ts` (am Dateiende anhängen)

- [ ] **Step 1: Tabelle definieren**

Am Ende von `src/lib/db/schema.ts` (nach allen bestehenden Tabellen) anhängen:

```ts
// ============================================
// Agents — Phase 1 (Schema only, no logic yet)
// Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md
// ============================================

export const agentGoals = pgTable('agent_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  executionMode: varchar('execution_mode', { length: 20 }).default('cron').notNull(),
  status: varchar('status', { length: 30 }).default('draft').notNull(),
  budgetTokens: integer('budget_tokens'),
  budgetCents: integer('budget_cents'),
  spentTokens: integer('spent_tokens').default(0).notNull(),
  spentCents: integer('spent_cents').default(0).notNull(),
  priority: integer('priority').default(2).notNull(),
  requirePlanApproval: boolean('require_plan_approval').default(false).notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_agent_goals_status_priority').on(table.status, table.priority, table.createdAt),
  index('idx_agent_goals_user_status').on(table.createdByUserId, table.status),
])

export type AgentGoal = typeof agentGoals.$inferSelect
export type NewAgentGoal = typeof agentGoals.$inferInsert
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartet: kein neuer Error. Falls `users.id`-Reference einen Fehler wirft, prüfen ob `users` bereits weiter oben im File definiert ist (Schema ist single-file, Reihenfolge zählt).

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(agents): agent_goals Tabelle"
```

---

### Task 4: Schema `agent_runs`

**Files:**
- Modify: `src/lib/db/schema.ts` (nach `agentGoals` anhängen)

- [ ] **Step 1: Tabelle definieren**

Direkt nach `agentGoals` (und seinen Type-Exports) anhängen:

```ts
export const agentRuns = pgTable('agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id').notNull().references(() => agentGoals.id, { onDelete: 'cascade' }),
  attempt: integer('attempt').default(1).notNull(),
  status: varchar('status', { length: 30 }).default('planning').notNull(),
  planJson: jsonb('plan_json'),
  contextSnapshotJson: jsonb('context_snapshot_json'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  inputTokens: bigint('input_tokens', { mode: 'number' }).default(0).notNull(),
  outputTokens: bigint('output_tokens', { mode: 'number' }).default(0).notNull(),
  cachedInputTokens: bigint('cached_input_tokens', { mode: 'number' }).default(0).notNull(),
  costCents: integer('cost_cents').default(0).notNull(),
  livenessCheckedAt: timestamp('liveness_checked_at', { withTimezone: true }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_agent_runs_goal_status').on(table.goalId, table.status),
  index('idx_agent_runs_status_liveness').on(table.status, table.livenessCheckedAt),
])

export const agentRunsRelations = relations(agentRuns, ({ one }) => ({
  goal: one(agentGoals, { fields: [agentRuns.goalId], references: [agentGoals.id] }),
}))

export type AgentRun = typeof agentRuns.$inferSelect
export type NewAgentRun = typeof agentRuns.$inferInsert
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartet: kein neuer Error.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(agents): agent_runs Tabelle + Relation"
```

---

### Task 5: Schema `agent_steps`

**Files:**
- Modify: `src/lib/db/schema.ts` (nach `agentRuns`)

- [ ] **Step 1: Tabelle definieren**

```ts
export const agentSteps = pgTable('agent_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull().references(() => agentRuns.id, { onDelete: 'cascade' }),
  goalId: uuid('goal_id').notNull().references(() => agentGoals.id, { onDelete: 'cascade' }),
  stepKey: varchar('step_key', { length: 200 }).notNull(),
  workerType: varchar('worker_type', { length: 200 }).notNull(),
  config: jsonb('config').default({}).notNull(),
  contextRefs: jsonb('context_refs').default([]).notNull(),
  dependsOnStepKeys: text('depends_on_step_keys').array().default(sql`ARRAY[]::text[]`).notNull(),
  status: varchar('status', { length: 30 }).default('pending').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  resultJson: jsonb('result_json'),
  resultSummary: varchar('result_summary', { length: 500 }),
  resultDocumentId: uuid('result_document_id'),
  inputTokens: bigint('input_tokens', { mode: 'number' }).default(0).notNull(),
  outputTokens: bigint('output_tokens', { mode: 'number' }).default(0).notNull(),
  costCents: integer('cost_cents').default(0).notNull(),
  error: text('error'),
  taskQueueId: uuid('task_queue_id').references(() => taskQueue.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_agent_steps_run_step_key').on(table.runId, table.stepKey),
  index('idx_agent_steps_run_status').on(table.runId, table.status),
  index('idx_agent_steps_status_taskqueue').on(table.status, table.taskQueueId),
])

export const agentStepsRelations = relations(agentSteps, ({ one }) => ({
  run: one(agentRuns, { fields: [agentSteps.runId], references: [agentRuns.id] }),
  goal: one(agentGoals, { fields: [agentSteps.goalId], references: [agentGoals.id] }),
}))

export type AgentStep = typeof agentSteps.$inferSelect
export type NewAgentStep = typeof agentSteps.$inferInsert
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartet: kein neuer Error.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(agents): agent_steps Tabelle + Relation + UNIQUE(run, stepKey)"
```

---

### Task 6: Schema `agent_definitions`

**Files:**
- Modify: `src/lib/db/schema.ts` (nach `agentSteps`)

- [ ] **Step 1: Tabelle definieren**

```ts
export const agentDefinitions = pgTable('agent_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  role: varchar('role', { length: 30 }).notNull(),
  name: varchar('name', { length: 200 }),
  systemPrompt: text('system_prompt').notNull(),
  allowedTools: text('allowed_tools').array().default(sql`ARRAY[]::text[]`).notNull(),
  modelHint: varchar('model_hint', { length: 100 }),
  maxTokensPerCall: integer('max_tokens_per_call').default(4096).notNull(),
  maxIterations: integer('max_iterations').default(8).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_agent_definitions_role_active').on(table.role, table.isActive),
])

export type AgentDefinition = typeof agentDefinitions.$inferSelect
export type NewAgentDefinition = typeof agentDefinitions.$inferInsert
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(agents): agent_definitions Tabelle"
```

---

### Task 7: Schema `agent_memory_entries` (mit pgvector + trgm)

**Files:**
- Modify: `src/lib/db/schema.ts` (nach `agentDefinitions`)

- [ ] **Step 1: Tabelle definieren**

```ts
export const agentMemoryEntries = pgTable('agent_memory_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  para: varchar('para', { length: 20 }).notNull(),
  scope: varchar('scope', { length: 500 }).notNull(),
  filePath: text('file_path').notNull(),
  title: varchar('title', { length: 500 }),
  summary: text('summary'),
  tags: text('tags').array().default(sql`ARRAY[]::text[]`).notNull(),
  contentHash: varchar('content_hash', { length: 64 }).notNull(),
  contentTrgm: text('content_trgm'),
  embedding: vector('embedding', { dimensions: 768 }),
  sourceRunId: uuid('source_run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
  sourceStepId: uuid('source_step_id').references(() => agentSteps.id, { onDelete: 'set null' }),
  sourceUserId: uuid('source_user_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  supersededByEntryId: uuid('superseded_by_entry_id').references((): AnyPgColumn => agentMemoryEntries.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_agent_memory_entries_filepath').on(table.filePath),
  index('idx_agent_memory_entries_scope_status').on(table.scope, table.status),
  // GIN trgm-Index für FTS — als raw SQL via index().using(...)
  index('idx_agent_memory_entries_trgm').using('gin', sql`${table.contentTrgm} gin_trgm_ops`),
  // IVFFlat für Vector-Cosine
  index('idx_agent_memory_entries_embedding').using('ivfflat', sql`${table.embedding} vector_cosine_ops`),
])

export type AgentMemoryEntry = typeof agentMemoryEntries.$inferSelect
export type NewAgentMemoryEntry = typeof agentMemoryEntries.$inferInsert
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartet: kein neuer Error. Falls `vector(...)` rote Markierung wirft, sicherstellen dass der Import in Task 2 korrekt vorgenommen wurde.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(agents): agent_memory_entries mit pgvector + trgm GIN"
```

---

### Task 8: Schema `agent_cost_events`

**Files:**
- Modify: `src/lib/db/schema.ts` (nach `agentMemoryEntries`)

- [ ] **Step 1: Tabelle definieren**

```ts
export const agentCostEvents = pgTable('agent_cost_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
  stepId: uuid('step_id').references(() => agentSteps.id, { onDelete: 'set null' }),
  goalId: uuid('goal_id').references(() => agentGoals.id, { onDelete: 'set null' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  callRole: varchar('call_role', { length: 50 }).notNull(),
  inputTokens: integer('input_tokens').default(0).notNull(),
  cachedInputTokens: integer('cached_input_tokens').default(0).notNull(),
  outputTokens: integer('output_tokens').default(0).notNull(),
  costCents: integer('cost_cents').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_agent_cost_events_goal_occurred').on(table.goalId, table.occurredAt),
  index('idx_agent_cost_events_run_occurred').on(table.runId, table.occurredAt),
  index('idx_agent_cost_events_provider_occurred').on(table.provider, table.occurredAt),
])

export type AgentCostEvent = typeof agentCostEvents.$inferSelect
export type NewAgentCostEvent = typeof agentCostEvents.$inferInsert
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(agents): agent_cost_events Tabelle"
```

---

### Task 9: Index für `task_queue` (Tick-Performance)

**Files:**
- Modify: `src/lib/db/schema.ts:2499-2517` (Index-Liste der bestehenden `taskQueue`-Tabelle)

- [ ] **Step 1: Bestehende `taskQueue`-Definition finden**

Suchen nach `export const taskQueue = pgTable('task_queue'` (~Zeile 2499). Der Index-Block ist aktuell leer:

```ts
}, (table) => [
])
```

- [ ] **Step 2: Index ergänzen**

```ts
}, (table) => [
  index('idx_task_queue_type_status_scheduled').on(table.type, table.status, table.scheduledFor),
])
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "perf(task-queue): Index (type, status, scheduled_for) fuer Agent-Tick"
```

---

### Task 10: Schema-Push gegen Dev-DB

**Files:** keine

- [ ] **Step 1: Push ausführen**

```bash
pnpm db:push
```

Erwartet: drizzle-kit fragt für jede neue Tabelle nach Bestätigung, dann Schema-Sync. Bei interaktiven Prompts mit `Yes` bestätigen.

- [ ] **Step 2: Tabellen-Existenz verifizieren**

```bash
psql "$DATABASE_URL" -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name LIKE 'agent_%'
  ORDER BY table_name;
"
```

Erwartete Ausgabe:
```
       table_name
------------------------
 agent_cost_events
 agent_definitions
 agent_goals
 agent_memory_entries
 agent_runs
 agent_steps
```

- [ ] **Step 3: pgvector-Spalte verifizieren**

```bash
psql "$DATABASE_URL" -c "
  SELECT column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_name='agent_memory_entries' AND column_name='embedding';
"
```

Erwartete Ausgabe:
```
 column_name | data_type | udt_name
-------------+-----------+----------
 embedding   | USER-DEFINED | vector
```

Falls `data_type=text`, ist die `vector`-Extension nicht aktiv → Task 1 wiederholen.

- [ ] **Step 4: GIN-trgm-Index verifizieren**

```bash
psql "$DATABASE_URL" -c "
  SELECT indexname FROM pg_indexes
  WHERE tablename='agent_memory_entries';
"
```

Erwartet: enthält `idx_agent_memory_entries_trgm` und `idx_agent_memory_entries_embedding`.

---

### Task 11: Shared-Types für Agent-Module

**Files:**
- Create: `src/lib/services/agents/types.ts`

- [ ] **Step 1: Types-Datei anlegen**

`src/lib/services/agents/types.ts`:

```ts
/**
 * Shared TypeScript-Types für das Agent-Subsystem.
 * Wird in Phase 1 als Skelett angelegt, in Folge-Phasen erweitert.
 */

import type { AgentGoal, AgentRun, AgentStep, AgentDefinition, AgentMemoryEntry } from '@/lib/db/schema'

// ── Public Re-Exports ──────────────────────────────────────────────────────
export type { AgentGoal, AgentRun, AgentStep, AgentDefinition, AgentMemoryEntry }

// ── Tool-Namespace-Schema ──────────────────────────────────────────────────
export type ToolNamespace = 'memory' | 'workflow' | 'prompt' | 'service' | 'agent'

export interface ToolRef {
  namespace: ToolNamespace
  name: string                  // e.g. 'search', 'lead.created', 'lead_research'
  raw: string                   // 'memory:search'
}

// ── Run-Lifecycle-Status ───────────────────────────────────────────────────
export type GoalStatus =
  | 'draft' | 'planning' | 'awaiting_approval'
  | 'running' | 'paused' | 'done' | 'failed' | 'cancelled'

export type RunStatus =
  | 'planning' | 'executing' | 'replanning'
  | 'succeeded' | 'failed' | 'cancelled'

export type StepStatus =
  | 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'

export type ExecutionMode = 'cron' | 'immediate'

// ── Memory-Refs ────────────────────────────────────────────────────────────
/** memory://<scope> oder memory://<scope>#<itemId> */
export type MemoryRef = `memory://${string}`

// ── Step-Plan (vom Orchestrator erzeugt) ───────────────────────────────────
export interface PlannedStep {
  stepKey: string
  workerType: string            // 'workflow:lead.created' | 'prompt:research' | 'service:lead-research' | 'agent:writer'
  config: Record<string, unknown>
  contextRefs: MemoryRef[]
  dependsOnStepKeys: string[]
  nextStepMode?: ExecutionMode
}

// ── Worker-Result ──────────────────────────────────────────────────────────
export interface WorkerResult {
  status: 'succeeded' | 'failed'
  resultJson?: Record<string, unknown>
  resultSummary: string         // max 500 chars
  resultDocumentId?: string
  inputTokens?: number
  outputTokens?: number
  costCents?: number
  error?: string
  /** Optionale Auto-Memory-Persistierung. */
  memoryWrite?: { para: string; scope: string; body: string }
}

// ── Cost-Event-Roles ───────────────────────────────────────────────────────
export type CallRole =
  | 'orchestrator_plan'
  | 'orchestrator_replan'
  | 'smart_worker'
  | 'memory_embed'
  | 'memory_compact'

// ── Task-Queue-Types fürs Agent-Subsystem ──────────────────────────────────
export const AGENT_TASK_TYPES = {
  STEP_RUN: 'agent_step_run',
  REPLAN: 'agent_replan',
  CONTINUATION: 'agent_continuation',
} as const

export type AgentTaskType = typeof AGENT_TASK_TYPES[keyof typeof AGENT_TASK_TYPES]
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartet: kein Error. `vector`-Spalte in `AgentMemoryEntry` muss als Type tragbar sein.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/types.ts
git commit -m "feat(agents): shared types fuer Agent-Subsystem"
```

---

### Task 12: Service-Skeleton `memory.service.ts`

**Files:**
- Create: `src/lib/services/agents/memory.service.ts`

- [ ] **Step 1: Skeleton anlegen**

`src/lib/services/agents/memory.service.ts`:

```ts
/**
 * Memory Service — PARA-Markdown auf Disk + DB-Index.
 * Phase 1: Skeleton. Vollimplementierung in Phase 2.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4
 */

import type { AgentMemoryEntry, MemoryRef } from './types'

export interface MemorySearchHit {
  id: string
  scope: string
  title: string | null
  summary: string | null
  snippet: string
  score: number
}

export interface MemoryReadResult {
  id: string
  title: string | null
  body: string
  items: Array<{ id: string; fact: string; status: string; source: string }>
}

export interface MemoryFact {
  id?: string
  fact: string
  source: string
  confidence?: number
  status?: 'active' | 'superseded' | 'archived'
}

export const MemoryService = {
  async search(_query: string, _scope?: string, _limit = 5): Promise<MemorySearchHit[]> {
    throw new Error('MemoryService.search: nicht implementiert (Phase 2)')
  },

  async read(_idOrPath: string): Promise<MemoryReadResult> {
    throw new Error('MemoryService.read: nicht implementiert (Phase 2)')
  },

  async write(
    _scope: string,
    _body: string,
    _items?: MemoryFact[],
  ): Promise<{ id: string; path: string }> {
    throw new Error('MemoryService.write: nicht implementiert (Phase 2)')
  },

  async supersede(
    _itemId: string,
    _newFact: string,
    _source: string,
  ): Promise<void> {
    throw new Error('MemoryService.supersede: nicht implementiert (Phase 2)')
  },

  async list(
    _para: 'projects' | 'areas' | 'resources' | 'archives',
    _limit = 20,
  ): Promise<Array<Pick<AgentMemoryEntry, 'id' | 'scope' | 'title' | 'summary'>>> {
    throw new Error('MemoryService.list: nicht implementiert (Phase 2)')
  },

  /** Expandiert MemoryRefs zu vollen Inhalten — wird beim Worker-Start aufgerufen. */
  async expandRefs(
    _refs: MemoryRef[],
  ): Promise<Array<{ ref: MemoryRef; title: string | null; body: string }>> {
    throw new Error('MemoryService.expandRefs: nicht implementiert (Phase 2)')
  },

  /** Komprimiert Run-History für Re-Plan-Kontext. */
  async compactRunHistory(_runId: string, _keepLast = 5): Promise<string> {
    throw new Error('MemoryService.compactRunHistory: nicht implementiert (Phase 2)')
  },
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/memory.service.ts
git commit -m "feat(agents): memory.service Skeleton"
```

---

### Task 13: Service-Skeleton `tool-registry.ts`

**Files:**
- Create: `src/lib/services/agents/tool-registry.ts`

- [ ] **Step 1: Skeleton anlegen**

`src/lib/services/agents/tool-registry.ts`:

```ts
/**
 * Tool Registry — Adapter-Definitionen für die fünf Tool-Namespaces.
 * Phase 1: Skeleton (Type-Definitionen). Adapter-Implementation in Phase 3.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5
 */

import type { ToolNamespace, ToolRef } from './types'

export interface ToolDescriptor {
  ref: ToolRef
  description: string
  /** JSON-Schema des Inputs — wird erst beim Worker-Start an LLM gegeben. */
  inputSchema: Record<string, unknown>
  /** JSON-Schema des Outputs (optional, für strukturierte Validierung). */
  outputSchema?: Record<string, unknown>
}

export interface ToolInvocation {
  ref: ToolRef
  input: Record<string, unknown>
  /** Kontext: laufender Run/Step für Cost-Tracking & Provenance. */
  context: {
    runId: string
    stepId: string
    goalId: string
  }
}

export interface ToolInvocationResult {
  status: 'succeeded' | 'failed'
  output?: Record<string, unknown>
  error?: string
  /** Optional: vom Tool ausgegebene Token/Cost-Daten (z.B. bei `prompt:*`). */
  usage?: { inputTokens: number; outputTokens: number; costCents: number; provider: string; model: string }
}

export interface ToolAdapter {
  namespace: ToolNamespace
  /** Listet alle Tools dieses Namespaces (z.B. alle aktiven Workflows als `workflow:<trigger>`). */
  list(): Promise<ToolDescriptor[]>
  /** Führt einen einzelnen Tool-Call aus. */
  invoke(invocation: ToolInvocation): Promise<ToolInvocationResult>
}

const adapters = new Map<ToolNamespace, ToolAdapter>()

export const ToolRegistry = {
  register(adapter: ToolAdapter): void {
    adapters.set(adapter.namespace, adapter)
  },

  get(namespace: ToolNamespace): ToolAdapter | undefined {
    return adapters.get(namespace)
  },

  async listAll(): Promise<ToolDescriptor[]> {
    const all: ToolDescriptor[] = []
    for (const adapter of adapters.values()) {
      all.push(...(await adapter.list()))
    }
    return all
  },

  /** Parsed `'memory:search'` zu ToolRef. */
  parseRef(raw: string): ToolRef {
    const sep = raw.indexOf(':')
    if (sep < 0) throw new Error(`Invalid tool ref (missing ':'): ${raw}`)
    const namespace = raw.slice(0, sep) as ToolNamespace
    const name = raw.slice(sep + 1)
    return { namespace, name, raw }
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const adapter = this.get(invocation.ref.namespace)
    if (!adapter) {
      return { status: 'failed', error: `Kein Adapter fuer Namespace '${invocation.ref.namespace}' registriert` }
    }
    return adapter.invoke(invocation)
  },
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/tool-registry.ts
git commit -m "feat(agents): tool-registry Skeleton mit Adapter-Interface"
```

---

### Task 14: Service-Skeleton `cost-tracker.service.ts`

**Files:**
- Create: `src/lib/services/agents/cost-tracker.service.ts`

- [ ] **Step 1: Skeleton anlegen**

`src/lib/services/agents/cost-tracker.service.ts`:

```ts
/**
 * Cost Tracker — schreibt agent_cost_events und aggregiert Run/Goal-Spend.
 * Phase 1: Skeleton. Implementation in Phase 4 (Orchestrator-Loop).
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.3
 */

import type { CallRole } from './types'

export interface CostEventInput {
  runId?: string
  stepId?: string
  goalId?: string
  provider: string
  model: string
  callRole: CallRole
  inputTokens: number
  cachedInputTokens?: number
  outputTokens: number
  costCents: number
}

export interface BudgetCheckResult {
  exceeded: boolean
  reason: 'tokens' | 'cents' | null
  spentTokens: number
  spentCents: number
  budgetTokens: number | null
  budgetCents: number | null
}

export const CostTrackerService = {
  async record(_input: CostEventInput): Promise<void> {
    throw new Error('CostTrackerService.record: nicht implementiert (Phase 4)')
  },

  async checkBudget(_goalId: string): Promise<BudgetCheckResult> {
    throw new Error('CostTrackerService.checkBudget: nicht implementiert (Phase 4)')
  },
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/cost-tracker.service.ts
git commit -m "feat(agents): cost-tracker Skeleton"
```

---

### Task 15: Service-Skeleton `worker.service.ts`

**Files:**
- Create: `src/lib/services/agents/worker.service.ts`

- [ ] **Step 1: Skeleton anlegen**

`src/lib/services/agents/worker.service.ts`:

```ts
/**
 * Worker Service — fuehrt einzelne agent_steps aus.
 * Phase 1: Skeleton. Implementation in Phase 3 (Tool-Registry + Worker)
 * und Phase 5 (Smart-Worker mit eigenem LLM-Call).
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §2.2 + §6.5
 */

import type { WorkerResult } from './types'

export const WorkerService = {
  /**
   * Fuehrt einen Step aus.
   * - Lade Step + Run + Goal
   * - Expandiere contextRefs via MemoryService
   * - Resolve Tool via ToolRegistry
   * - Persistiere Result + Cost-Event
   * - Queue agent_replan-Task fuer den Run
   */
  async executeStep(_stepId: string): Promise<WorkerResult> {
    throw new Error('WorkerService.executeStep: nicht implementiert (Phase 3)')
  },
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/worker.service.ts
git commit -m "feat(agents): worker.service Skeleton"
```

---

### Task 16: Service-Skeleton `orchestrator.service.ts`

**Files:**
- Create: `src/lib/services/agents/orchestrator.service.ts`

- [ ] **Step 1: Skeleton anlegen**

`src/lib/services/agents/orchestrator.service.ts`:

```ts
/**
 * Orchestrator Service — Hauptagent-Loop.
 * Phase 1: Skeleton. Implementation in Phase 4 (Orchestrator-Loop).
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §2.2 + §6
 */

import type { ExecutionMode, PlannedStep } from './types'

export interface ReplanDecision {
  action: 'continue' | 'goal_complete' | 'pause' | 'fail'
  newSteps?: PlannedStep[]
  /** Wenn nur ein einziger naechster Step folgt und nextStepMode='immediate', kann Inline-Lane uebernommen werden. */
  nextStepMode?: ExecutionMode
  reason?: string
}

export const OrchestratorService = {
  /**
   * Erstes Plannen eines Goals.
   * - Sammle Tool-Liste (kurz)
   * - Sammle initiale Memory-Refs
   * - Rufe Orchestrator-LLM (JSON-Mode)
   * - Persistiere agent_runs + initiale agent_steps
   * - Queue agent_step_run-Tasks fuer Steps ohne unaufgeloeste Dependencies
   */
  async plan(_goalId: string): Promise<{ runId: string; steps: PlannedStep[] }> {
    throw new Error('OrchestratorService.plan: nicht implementiert (Phase 4)')
  },

  /**
   * Re-Plan nach jedem Worker-Result.
   * - Lade aktuellen Run-State (komprimiert via MemoryService.compactRunHistory)
   * - Rufe Orchestrator-LLM mit kompaktem Kontext (Sliding-Summary, Prompt-Caching)
   * - Parse Decision; bei newSteps -> erzeuge agent_steps + queue agent_step_run
   */
  async replan(_runId: string): Promise<ReplanDecision> {
    throw new Error('OrchestratorService.replan: nicht implementiert (Phase 4)')
  },
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/orchestrator.service.ts
git commit -m "feat(agents): orchestrator.service Skeleton"
```

---

### Task 17: Service-Index `agents/index.ts`

**Files:**
- Create: `src/lib/services/agents/index.ts`

- [ ] **Step 1: Re-Exports anlegen**

`src/lib/services/agents/index.ts`:

```ts
/**
 * Agent-Subsystem — Public API.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md
 */

export { OrchestratorService } from './orchestrator.service'
export { WorkerService } from './worker.service'
export { MemoryService } from './memory.service'
export { CostTrackerService } from './cost-tracker.service'
export { ToolRegistry } from './tool-registry'

export type {
  AgentGoal,
  AgentRun,
  AgentStep,
  AgentDefinition,
  AgentMemoryEntry,
  GoalStatus,
  RunStatus,
  StepStatus,
  ExecutionMode,
  PlannedStep,
  WorkerResult,
  MemoryRef,
  ToolNamespace,
  ToolRef,
  CallRole,
  AgentTaskType,
} from './types'

export { AGENT_TASK_TYPES } from './types'

export type {
  ToolDescriptor,
  ToolAdapter,
  ToolInvocation,
  ToolInvocationResult,
} from './tool-registry'

export type {
  CostEventInput,
  BudgetCheckResult,
} from './cost-tracker.service'

export type {
  MemorySearchHit,
  MemoryReadResult,
  MemoryFact,
} from './memory.service'

export type {
  ReplanDecision,
} from './orchestrator.service'
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartet: kein Error. Falls ein Type nicht gefunden wird, prüfen ob er in der jeweiligen Quelldatei `export`-Markiert ist.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/index.ts
git commit -m "feat(agents): public Modul-Exports unter agents/index.ts"
```

---

### Task 18: Tick-Handler-Hook in CronService (no-op)

**Files:**
- Modify: `src/lib/services/cron.service.ts:304-328`

- [ ] **Step 1: No-op-Funktion `processAgentTaskQueue` lokal anlegen**

In `src/lib/services/cron.service.ts`, **vor** der `tick()`-Methode (also vor Zeile 304), eine private Helper-Funktion am Modul-Top-Level einfügen:

```ts
/**
 * Verarbeitet anstehende Agent-Tasks aus der task_queue.
 * Phase 1: no-op Skeleton. Implementation in Phase 4.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.4
 */
async function processAgentTaskQueue(): Promise<void> {
  // Phase 1: bewusst leer.
  // Phase 4 wird hier task_queue mit FOR UPDATE SKIP LOCKED claimen
  // und WorkerService/OrchestratorService aufrufen.
}

/**
 * Reconciliert stranded agent_runs (>10 min ohne Update).
 * Phase 1: no-op Skeleton. Implementation in Phase 6.
 */
async function reconcileStrandedRuns(): Promise<void> {
  // Phase 1: bewusst leer.
}
```

Diese Funktionen liegen **außerhalb** des `CronService`-Objekts, als Modul-Top-Level. Direkt nach dem `INTERVAL_OPTIONS`/`ACTION_TYPE_OPTIONS`/`calculateNextRun`-Block einfügen.

- [ ] **Step 2: `tick()` um Aufrufe erweitern**

In der `tick()`-Methode (Zeile 304-328) **vor** `return { executed, failed }` einfügen:

```ts
  async tick(): Promise<{ executed: number; failed: number }> {
    const now = new Date()
    const dueJobs = await db
      .select()
      .from(cronJobs)
      .where(and(
        eq(cronJobs.isActive, true),
        lte(cronJobs.nextRunAt, now)))
      .orderBy(asc(cronJobs.nextRunAt))

    let executed = 0
    let failed = 0

    for (const job of dueJobs) {
      const result = await this.executeJob(job)
      if (result.success) executed++
      else failed++
    }

    if (dueJobs.length > 0) {
      logger.info(`Cron tick: ${executed} OK, ${failed} failed out of ${dueJobs.length} due`, { module: 'CronService' })
    }

    // Agent-Subsystem (Phase 1: no-op, wird in Phase 4 + 6 implementiert)
    await processAgentTaskQueue()
    await reconcileStrandedRuns()

    return { executed, failed }
  },
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/cron.service.ts
git commit -m "feat(agents): processAgentTaskQueue + reconcileStrandedRuns Hooks (no-op)"
```

---

### Task 19: Smoke-Test für Agent-Module-Imports

**Files:**
- Create: `src/__tests__/unit/services/agents/skeleton-imports.test.ts`

- [ ] **Step 1: Test-Datei anlegen**

`src/__tests__/unit/services/agents/skeleton-imports.test.ts`:

```ts
/**
 * Smoke-Tests fuer Phase 1 — pruefen dass alle Agent-Module importierbar sind
 * und Skeleton-Methoden mit klarer "nicht implementiert"-Message werfen.
 */

import { describe, it, expect } from 'vitest'
import {
  OrchestratorService,
  WorkerService,
  MemoryService,
  CostTrackerService,
  ToolRegistry,
  AGENT_TASK_TYPES,
} from '@/lib/services/agents'

describe('Agent-Module Skeleton — Phase 1', () => {
  it('exportiert alle fuenf Service-Module', () => {
    expect(OrchestratorService).toBeDefined()
    expect(WorkerService).toBeDefined()
    expect(MemoryService).toBeDefined()
    expect(CostTrackerService).toBeDefined()
    expect(ToolRegistry).toBeDefined()
  })

  it('AGENT_TASK_TYPES enthaelt die drei task_queue-Typen', () => {
    expect(AGENT_TASK_TYPES).toEqual({
      STEP_RUN: 'agent_step_run',
      REPLAN: 'agent_replan',
      CONTINUATION: 'agent_continuation',
    })
  })

  it('OrchestratorService.plan wirft "nicht implementiert"', async () => {
    await expect(OrchestratorService.plan('goal-1')).rejects.toThrow(/nicht implementiert/)
  })

  it('OrchestratorService.replan wirft "nicht implementiert"', async () => {
    await expect(OrchestratorService.replan('run-1')).rejects.toThrow(/nicht implementiert/)
  })

  it('WorkerService.executeStep wirft "nicht implementiert"', async () => {
    await expect(WorkerService.executeStep('step-1')).rejects.toThrow(/nicht implementiert/)
  })

  it('MemoryService.search wirft "nicht implementiert"', async () => {
    await expect(MemoryService.search('foo')).rejects.toThrow(/nicht implementiert/)
  })

  it('CostTrackerService.record wirft "nicht implementiert"', async () => {
    await expect(
      CostTrackerService.record({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        callRole: 'orchestrator_plan',
        inputTokens: 100,
        outputTokens: 50,
        costCents: 1,
      }),
    ).rejects.toThrow(/nicht implementiert/)
  })

  it('ToolRegistry.parseRef parst "memory:search" korrekt', () => {
    const ref = ToolRegistry.parseRef('memory:search')
    expect(ref).toEqual({ namespace: 'memory', name: 'search', raw: 'memory:search' })
  })

  it('ToolRegistry.parseRef wirft bei fehlendem Doppelpunkt', () => {
    expect(() => ToolRegistry.parseRef('invalid')).toThrow(/Invalid tool ref/)
  })

  it('ToolRegistry.invoke gibt failed-Result zurueck wenn kein Adapter registriert', async () => {
    const result = await ToolRegistry.invoke({
      ref: { namespace: 'memory', name: 'search', raw: 'memory:search' },
      input: {},
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(result.status).toBe('failed')
    expect(result.error).toMatch(/Kein Adapter/)
  })
})
```

- [ ] **Step 2: Test ausführen**

```bash
pnpm test:unit src/__tests__/unit/services/agents/skeleton-imports.test.ts
```

Erwartet: 10/10 Tests grün.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/unit/services/agents/skeleton-imports.test.ts
git commit -m "test(agents): Smoke-Test fuer Phase-1-Module-Imports"
```

---

### Task 20: Final-Verification (Typecheck + Boot)

**Files:** keine

- [ ] **Step 1: Voller Typecheck**

```bash
pnpm typecheck
```

Erwartet: kein neuer TypeScript-Error gegenüber dem Stand vor Phase 1.

- [ ] **Step 2: Vollständiger Test-Lauf**

```bash
pnpm test
```

Erwartet: alle bestehenden Tests + die 10 neuen Smoke-Tests grün.

- [ ] **Step 3: Dev-Server-Boot-Smoke-Test**

```bash
pnpm dev
```

Erwartet:
- Boot ohne Fehler/Crash
- API erreichbar (kurz manuell `http://localhost:3000` prüfen oder curl auf health-Endpoint)
- Mit Ctrl+C beenden

- [ ] **Step 4: Cron-Tick-Endpoint-Smoke-Test**

Bei laufendem Dev-Server:

```bash
curl -i "http://localhost:3000/api/cron/tick"
```

Erwartet: HTTP 200, JSON-Response `{"success":true,"data":{"executed":...,"failed":...}}`. Kein Error wegen der neuen `processAgentTaskQueue`/`reconcileStrandedRuns`-Aufrufe.

- [ ] **Step 5: Final-Commit (sofern noch was offen ist) + Status**

```bash
git status
```

Erwartet: clean working tree (alle Tasks committed).

- [ ] **Step 6: Branch pushen (optional)**

Wenn Plan in einem Feature-Branch (`feat/agents-foundation`) gelaufen ist:

```bash
git push origin feat/agents-foundation
```

CI bumpt Version automatisch (z.B. von 1.5.696 auf 1.5.697 — tatsächliche Versionsnummer wird vom CI nach Push genannt).

---

## Self-Review-Notiz

**Spec-Coverage Phase 1:**
- 6 neue Tabellen → Tasks 3-8
- pgvector + pg_trgm Extensions → Task 1
- task_queue Index → Task 9
- Schema-Push → Task 10
- 5 Service-Skelette + types + index → Tasks 11-17
- Tick-Handler-Hook (no-op) → Task 18
- DoD: typecheck + drizzle-kit push + Boot ohne Crash → Task 20
- Test: Schema-Migration sauber → Task 10 Step 2-4 + Smoke-Test (Task 19)

Alle Phase-1-Items aus dem Spec abgedeckt.

**Was bewusst NICHT in Phase 1:**
- File-Watcher (chokidar) — Phase 2
- Embedding-Pipeline — Phase 2
- Tool-Adapter-Implementations (memory/workflow/prompt/service) — Phase 3
- Orchestrator-LLM-Calls — Phase 4
- Smart-Worker mit eigenem LLM — Phase 5
- Stranded-Reconcile-Logic — Phase 6
- UI — Phase 7

---

## Geschätzter Aufwand

20 Tasks à 2-15 min = ~3-4 h reine Implementation + ~1 h Schema-Push-Verifikation und Boot-Smoke = **1 Arbeitstag**.
