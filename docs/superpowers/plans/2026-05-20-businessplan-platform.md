# Businessplan-Plattform Implementation Plan

> Spec: `docs/superpowers/specs/2026-05-20-businessplan-platform-design.md`
> Stand: 2026-05-20

**Goal:** KI-gestützte Pipeline im /intern-Bereich, die aus Idee/Briefing einen Businessplan generiert, mit selbst gehostetem Mirofish simuliert, KI-analysiert und iterativ verbessert bis Score-Schwelle oder Iterations-Max.

**Architektur:** Async-Pipeline via taskQueue (analog News-Pipeline) + Erweiterung der bestehenden Workflow-Engine um `loop`-StepKind + neue Actions. Mirofish läuft als zusätzlicher Docker-Service.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM, PostgreSQL JSONB, Docker Compose, REST zu Mirofish (Python+Vue, AGPL).

---

## Task 1: Mirofish-Docker-Service einbinden

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.local.yml`
- Modify: `docker-compose.prod.yml`
- Modify: `.env.example`

- [ ] **Step 1: Mirofish-Service in docker-compose.yml ergänzen**

```yaml
mirofish:
  image: ghcr.io/666ghj/mirofish:latest
  restart: unless-stopped
  environment:
    LLM_API_KEY: ${MIROFISH_LLM_API_KEY}
    LLM_BASE_URL: ${MIROFISH_LLM_BASE_URL}
    LLM_MODEL_NAME: ${MIROFISH_LLM_MODEL:-gpt-4o-mini}
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  networks:
    - default
```

In `docker-compose.local.yml`: zusätzlich `ports: ["5001:5001"]` für lokales Debugging.

- [ ] **Step 2: ENV-Variablen in .env.example dokumentieren**

```
# Mirofish (Self-host Simulationstool)
MIROFISH_BASE_URL=http://mirofish:5001
MIROFISH_LLM_API_KEY=
MIROFISH_LLM_BASE_URL=
MIROFISH_LLM_MODEL=gpt-4o-mini
```

- [ ] **Step 3: docker compose pull + up mirofish lokal**

```bash
docker compose pull mirofish
docker compose up -d mirofish
curl -f http://localhost:5001/health
```

Erwartung: HTTP 200. Falls Image-Tag nicht existiert: Fallback auf Build aus Fork-Repo (siehe Spec, AGPL).

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker-compose.local.yml docker-compose.prod.yml .env.example
git commit -m "feat(infra): Mirofish als Docker-Service einbinden (Simulationstool fuer Businessplan-Pipeline)"
```

---

## Task 2: MirofishClient implementieren

**Files:**
- Create: `src/lib/services/mirofish/client.ts`
- Create: `src/lib/services/mirofish/types.ts`
- Create: `src/__tests__/unit/services/mirofish/client.test.ts`

- [ ] **Step 1: Failing-Test schreiben**

```ts
// src/__tests__/unit/services/mirofish/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('MirofishClient', () => {
  beforeEach(() => vi.resetModules())

  it('POSTs simulate request and parses result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        summary: 'OK',
        risk_signals: [{ severity: 'low', description: 'X' }],
        narrative_paths: [{ persona: 'P', reaction: 'R', reasoning: 'Y' }],
        follow_up_questions: ['F?'],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.doMock('@/lib/services/cms-settings.service', () => ({
      CmsSettingsService: { get: vi.fn().mockResolvedValue('http://mirofish:5001') },
    }))
    const { MirofishClient } = await import('@/lib/services/mirofish/client')
    const result = await MirofishClient.simulate({
      question: 'Wird das funktionieren?',
      seedMaterials: [{ filename: 'plan.md', contentType: 'text/markdown', content: '...' }],
    })
    expect(result.summary).toBe('OK')
    expect(result.riskSignals).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://mirofish:5001/simulate',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
```

- [ ] **Step 2: Test laufen lassen → FAIL**

```bash
npx vitest run src/__tests__/unit/services/mirofish/client.test.ts
```

Erwartung: ENOENT bzw. Modul nicht gefunden.

- [ ] **Step 3: Types definieren**

```ts
// src/lib/services/mirofish/types.ts
export interface MirofishSimulateRequest {
  question: string
  seedMaterials: Array<{
    filename: string
    contentType: 'text/markdown' | 'application/pdf' | 'text/plain'
    content: string
  }>
}

export interface MirofishRiskSignal {
  severity: 'low' | 'medium' | 'high'
  description: string
}

export interface MirofishNarrativePath {
  persona: string
  reaction: string
  reasoning: string
}

export interface MirofishSimulateResult {
  summary: string
  riskSignals: MirofishRiskSignal[]
  narrativePaths: MirofishNarrativePath[]
  followUpQuestions: string[]
  rawResponse: unknown
}
```

- [ ] **Step 4: Client implementieren**

```ts
// src/lib/services/mirofish/client.ts
import { logger } from '@/lib/utils/logger'
import type { MirofishSimulateRequest, MirofishSimulateResult } from './types'

const DEFAULT_BASE_URL = 'http://mirofish:5001'
const SIMULATE_TIMEOUT_MS = 5 * 60 * 1000

async function getBaseUrl(): Promise<string> {
  const { CmsSettingsService } = await import('@/lib/services/cms-settings.service')
  const stored = await CmsSettingsService.get('mirofish.baseUrl')
  return stored?.trim() || DEFAULT_BASE_URL
}

export const MirofishClient = {
  async healthcheck(): Promise<boolean> {
    const baseUrl = await getBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/health`, { method: 'GET' })
      return res.ok
    } catch {
      return false
    }
  },

  async simulate(req: MirofishSimulateRequest): Promise<MirofishSimulateResult> {
    const baseUrl = await getBaseUrl()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SIMULATE_TIMEOUT_MS)
    try {
      const res = await fetch(`${baseUrl}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal,
      })
      if (!res.ok) {
        throw new Error(`Mirofish responded with ${res.status}`)
      }
      const raw = await res.json()
      return {
        summary: String(raw.summary ?? ''),
        riskSignals: Array.isArray(raw.risk_signals) ? raw.risk_signals : [],
        narrativePaths: Array.isArray(raw.narrative_paths) ? raw.narrative_paths : [],
        followUpQuestions: Array.isArray(raw.follow_up_questions) ? raw.follow_up_questions : [],
        rawResponse: raw,
      }
    } finally {
      clearTimeout(timer)
    }
  },
}
```

- [ ] **Step 5: Test laufen lassen → PASS**

```bash
npx vitest run src/__tests__/unit/services/mirofish/client.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/mirofish src/__tests__/unit/services/mirofish
git commit -m "feat(mirofish): REST-Client mit healthcheck + simulate, Base-URL aus cms_settings"
```

---

## Task 3: DB-Schema für Businessplan + Iterationen

**Files:**
- Create: `src/lib/db/migrations/075_business_plans.sql`
- Create: `src/lib/db/migrations/076_business_plan_iterations.sql`
- Create: `src/lib/db/migrations/077_business_plan_artifacts.sql`
- Modify: `src/lib/db/migrations/index.ts`
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Migration 075 schreiben**

```sql
-- 075_business_plans.sql
CREATE TABLE IF NOT EXISTS business_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  mode varchar(16) NOT NULL CHECK (mode IN ('canvas', 'kfw', 'both')),
  input_type varchar(16) NOT NULL CHECK (input_type IN ('quick', 'briefing')),
  seed_input jsonb NOT NULL,
  current_iteration int NOT NULL DEFAULT 0,
  max_iterations int NOT NULL DEFAULT 5 CHECK (max_iterations > 0 AND max_iterations <= 10),
  score_threshold int NOT NULL DEFAULT 80 CHECK (score_threshold >= 0 AND score_threshold <= 100),
  final_score int CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 100)),
  status varchar(20) NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'running', 'completed', 'failed', 'stopped')),
  error text,
  current_iteration_task_id uuid REFERENCES task_queue(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_plans_status ON business_plans(status);
CREATE INDEX IF NOT EXISTS idx_business_plans_created_by ON business_plans(created_by);
```

- [ ] **Step 2: Migration 076 schreiben**

```sql
-- 076_business_plan_iterations.sql
CREATE TABLE IF NOT EXISTS business_plan_iterations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  iteration_number int NOT NULL CHECK (iteration_number > 0),
  plan_canvas jsonb,
  plan_kfw_markdown text,
  simulation_request jsonb,
  simulation_result jsonb,
  analysis jsonb,
  duration_ms int,
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'simulating', 'analyzing', 'done', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, iteration_number)
);

CREATE INDEX IF NOT EXISTS idx_business_plan_iter_plan ON business_plan_iterations(plan_id);
CREATE INDEX IF NOT EXISTS idx_business_plan_iter_status ON business_plan_iterations(status);
```

- [ ] **Step 3: Migration 077 schreiben**

```sql
-- 077_business_plan_artifacts.sql
CREATE TABLE IF NOT EXISTS business_plan_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  iteration_id uuid REFERENCES business_plan_iterations(id) ON DELETE SET NULL,
  kind varchar(30) NOT NULL,
  file_url text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_plan_art_plan ON business_plan_artifacts(plan_id);
```

- [ ] **Step 4: Im Migration-Registry eintragen**

In `src/lib/db/migrations/index.ts` nach 074:

```ts
{
  name: '075_business_plans.sql',
  description: 'business_plans-Tabelle: Haupt-Datensatz mit Mode/Input/Threshold/Iteration-Counter',
},
{
  name: '076_business_plan_iterations.sql',
  description: 'business_plan_iterations: pro Iteration Plan-Version + Mirofish-Resultat + Analyse',
},
{
  name: '077_business_plan_artifacts.sql',
  description: 'business_plan_artifacts: PDF-Exporte + Pitch-Materialien',
},
```

- [ ] **Step 5: Drizzle-Schema in `src/lib/db/schema.ts` ergänzen**

```ts
// nach den News-Topics-Definitionen
export const businessPlans = pgTable('business_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  mode: varchar('mode', { length: 16 }).notNull(),
  inputType: varchar('input_type', { length: 16 }).notNull(),
  seedInput: jsonb('seed_input').notNull(),
  currentIteration: integer('current_iteration').notNull().default(0),
  maxIterations: integer('max_iterations').notNull().default(5),
  scoreThreshold: integer('score_threshold').notNull().default(80),
  finalScore: integer('final_score'),
  status: varchar('status', { length: 20 }).notNull().default('idle'),
  error: text('error'),
  currentIterationTaskId: uuid('current_iteration_task_id').references(() => taskQueue.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_business_plans_status').on(table.status),
])

export const businessPlanIterations = pgTable('business_plan_iterations', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => businessPlans.id, { onDelete: 'cascade' }),
  iterationNumber: integer('iteration_number').notNull(),
  planCanvas: jsonb('plan_canvas'),
  planKfwMarkdown: text('plan_kfw_markdown'),
  simulationRequest: jsonb('simulation_request'),
  simulationResult: jsonb('simulation_result'),
  analysis: jsonb('analysis'),
  durationMs: integer('duration_ms'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_business_plan_iter').on(table.planId, table.iterationNumber),
])

export const businessPlanArtifacts = pgTable('business_plan_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => businessPlans.id, { onDelete: 'cascade' }),
  iterationId: uuid('iteration_id').references(() => businessPlanIterations.id, { onDelete: 'set null' }),
  kind: varchar('kind', { length: 30 }).notNull(),
  fileUrl: text('file_url').notNull(),
  meta: jsonb('meta').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type BusinessPlan = typeof businessPlans.$inferSelect
export type NewBusinessPlan = typeof businessPlans.$inferInsert
export type BusinessPlanIteration = typeof businessPlanIterations.$inferSelect
export type NewBusinessPlanIteration = typeof businessPlanIterations.$inferInsert
export type BusinessPlanArtifact = typeof businessPlanArtifacts.$inferSelect
```

- [ ] **Step 6: TypeCheck + Commit**

```bash
npx tsc --noEmit
git add src/lib/db/migrations/075_business_plans.sql src/lib/db/migrations/076_business_plan_iterations.sql src/lib/db/migrations/077_business_plan_artifacts.sql src/lib/db/migrations/index.ts src/lib/db/schema.ts
git commit -m "feat(business-plan): DB-Schema fuer Businessplan-Pipeline (3 Tabellen + Drizzle-Schema)"
```

---

## Task 4: Workflow-Engine um `loop`-StepKind erweitern

**Files:**
- Modify: `src/lib/services/workflow/engine.ts`
- Modify: `src/__tests__/unit/services/workflow/engine.test.ts` (falls existent, sonst neu)

- [ ] **Step 1: Failing-Test für Loop-Step**

```ts
it('loop step iterates body until maxIterations reached', async () => {
  const counter = { value: 0 }
  const workflow = {
    id: 'wf1',
    trigger: '__manual__',
    steps: [{
      kind: 'loop',
      label: 'iterate',
      maxIterations: 3,
      steps: [
        { kind: 'action', action: 'set_field', input: { } /* counter++ via mock */ },
      ],
    }],
  }
  // ... mock action-registry um counter zu zählen
  await WorkflowEngine.runSingle(workflow, {})
  expect(counter.value).toBe(3)
})

it('loop step respects MAX_LOOP_ITERATIONS guard', async () => {
  // maxIterations: 999 → wird auf 50 gekappt + Fehler geloggt
})

it('loop step exits early when condition becomes false', async () => {
  // condition checked vor jeder Runde, condition wertet runtime-data aus
})
```

- [ ] **Step 2: Tests laufen → FAIL**

- [ ] **Step 3: StepKind 'loop' in engine.ts implementieren**

```ts
const MAX_LOOP_ITERATIONS = 50

type StepKind = 'action' | 'branch' | 'parallel' | 'for_each' | 'loop'

interface LoopStep extends BaseStep {
  kind: 'loop'
  maxIterations: number
  condition?: string
  steps: WorkflowStep[]
}

type WorkflowStep = ActionStep | BranchStep | ParallelStep | ForEachStep | LoopStep

// in der zentralen runStep-Funktion:
if (kind === 'loop') {
  const ls = step as LoopStep
  const cap = Math.min(Math.max(1, ls.maxIterations | 0), MAX_LOOP_ITERATIONS)
  if (ls.maxIterations > MAX_LOOP_ITERATIONS) {
    ctx.logger.warn(`loop step maxIterations=${ls.maxIterations} capped to ${MAX_LOOP_ITERATIONS}`)
  }
  let i = 0
  for (; i < cap; i++) {
    if (ls.condition && !evaluateCondition(ls.condition, ctx.data)) break
    for (const sub of ls.steps) {
      await runStep(sub, ctx, `${path}/loop[${i}]`)
    }
  }
  ctx.results.push({
    step: stepNum, path, action: 'loop', kind: 'loop', label: ls.label,
    output: { iterations: i },
  })
  return
}
```

- [ ] **Step 4: Tests laufen → PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/workflow/engine.ts src/__tests__/unit/services/workflow
git commit -m "feat(workflow): loop-StepKind mit MAX_LOOP_ITERATIONS guard und optionalem condition-exit"
```

---

## Task 5: AI-Templates für Businessplan-Pipeline

**Files:**
- Create: `src/lib/db/migrations/078_business_plan_ai_templates.sql`
- Modify: `src/lib/db/migrations/index.ts`
- Modify: `src/lib/services/ai-prompt-template.defaults.ts` (Placeholders dokumentieren)

- [ ] **Step 1: Migration 078 mit allen 6 Templates schreiben**

Templates (jeweils `slug`, `name`, `description`, `system_prompt`, `user_prompt`, `output_format`):

1. `business_plan.idea_to_story` — Input: `{seed}`, Output: `{story}`
2. `business_plan.story_to_canvas` — Input: `{story}`, Output: `{canvas: {problem,solution,...,unfairAdvantage}}`
3. `business_plan.story_to_kfw` — Input: `{story}`, Output: `{markdown}`
4. `business_plan.simulation_question` — Input: `{plan,mode,seedInput}`, Output: `{question}`
5. `business_plan.analyze_simulation` — Input: `{plan, simulationResult}`, Output: `{score, strengths[], weaknesses[], improvements[]}`
6. `business_plan.revise_plan` — Input: `{previousPlan, improvements, mode}`, Output: `{canvas?, markdown?}`

Jeweils INSERT … ON CONFLICT (slug) DO NOTHING für Idempotenz (falls slug-Konflikt aus Vorlauf-Seed).

- [ ] **Step 2: Im Registry eintragen + ausführen + Commit**

```bash
git add src/lib/db/migrations/078_business_plan_ai_templates.sql src/lib/db/migrations/index.ts
git commit -m "feat(business-plan): 6 AI-Templates fuer Pipeline (idea/story/canvas/kfw/sim-question/analyze/revise)"
```

---

## Task 6: Actions in Workflow-Action-Registry registrieren

**Files:**
- Modify: `src/lib/services/workflow/action-registry.ts`
- Create: `src/lib/services/business-plan/actions.ts`
- Create: `src/__tests__/unit/services/business-plan/actions.test.ts`

- [ ] **Step 1: Failing-Test für generate_business_plan**

```ts
it('generate_business_plan returns canvas + markdown for mode=both', async () => {
  vi.doMock('@/lib/services/ai-prompt-template.service', () => ({ /* mock canvas+kfw */ }))
  vi.doMock('@/lib/services/ai/ai.service', () => ({ AIService: { completeWithContext: vi.fn().mockResolvedValue({ text: JSON.stringify({ ... }) }) } }))
  const { generateBusinessPlan } = await import('@/lib/services/business-plan/actions')
  const out = await generateBusinessPlan({ story: 'X', mode: 'both' }, ctx)
  expect(out.canvas).toBeDefined()
  expect(out.kfw).toBeDefined()
})
```

- [ ] **Step 2-N: Actions implementieren**

`src/lib/services/business-plan/actions.ts`:

```ts
import { AIService } from '@/lib/services/ai/ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { MirofishClient } from '@/lib/services/mirofish/client'

export async function generateBusinessIdea(input, ctx) { /* runTemplate('business_plan.idea_to_story') ... */ }
export async function generateBusinessStory(input, ctx) { /* ... */ }
export async function generateBusinessPlan(input, ctx) {
  // mode-abhängig parallel beide Templates aufrufen
}
export async function simulateWithMirofish(input, ctx) {
  // formuliere question via business_plan.simulation_question
  // packe Plan als seedMaterial: { filename: 'plan.md', contentType: 'text/markdown', content: ... }
  return MirofishClient.simulate({ question, seedMaterials })
}
export async function analyzeSimulation(input, ctx) { /* ... */ }
export async function reviseBusinessPlan(input, ctx) { /* ... */ }
```

Helper `runTemplate(slug, vars, options)` analog `news-pipeline.service.ts` (extrahieren in shared util oder duplizieren initial).

- [ ] **Step 3: In action-registry.ts registrieren**

```ts
import * as bpActions from '@/lib/services/business-plan/actions'

const ACTIONS = {
  // ... bestehende
  generate_business_idea: bpActions.generateBusinessIdea,
  generate_business_story: bpActions.generateBusinessStory,
  generate_business_plan: bpActions.generateBusinessPlan,
  simulate_with_mirofish: bpActions.simulateWithMirofish,
  analyze_simulation: bpActions.analyzeSimulation,
  revise_business_plan: bpActions.reviseBusinessPlan,
}
```

- [ ] **Step 4: Tests grün + Commit**

```bash
npx vitest run src/__tests__/unit/services/business-plan
git add src/lib/services/business-plan/actions.ts src/lib/services/workflow/action-registry.ts src/__tests__/unit/services/business-plan
git commit -m "feat(business-plan): 6 Workflow-Actions (generate/story/plan/simulate/analyze/revise)"
```

---

## Task 7: BusinessPlanService + IterationService

**Files:**
- Create: `src/lib/services/business-plan/business-plan.service.ts`
- Create: `src/lib/services/business-plan/iteration.service.ts`
- Create: `src/__tests__/unit/services/business-plan/iteration.service.test.ts`
- Modify: `src/lib/utils/validation.ts` (Schemas für Input)

- [ ] **Step 1: Validation-Schemas in validation.ts**

```ts
export const businessPlanModeSchema = z.enum(['canvas', 'kfw', 'both'])
export const businessPlanInputTypeSchema = z.enum(['quick', 'briefing'])

export const businessPlanQuickInputSchema = z.object({ idea: z.string().min(10).max(2000) })
export const businessPlanBriefingInputSchema = z.object({
  industry: z.string().min(1).max(255),
  audience: z.string().min(1).max(500),
  usp: z.string().min(1).max(500),
  region: z.string().min(1).max(255),
  capital: z.string().min(1).max(255),
})

export const createBusinessPlanSchema = z.object({
  mode: businessPlanModeSchema,
  inputType: businessPlanInputTypeSchema,
  seedInput: z.union([businessPlanQuickInputSchema, businessPlanBriefingInputSchema]),
  maxIterations: z.number().int().min(1).max(10).optional(),
  scoreThreshold: z.number().int().min(0).max(100).optional(),
})
```

- [ ] **Step 2: BusinessPlanService skeleton**

```ts
// src/lib/services/business-plan/business-plan.service.ts
import { db } from '@/lib/db'
import { businessPlans, businessPlanIterations, taskQueue } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export const BusinessPlanService = {
  async create(input, createdBy) {
    const title = await generateTitleFromSeed(input.seedInput)
    const [plan] = await db.insert(businessPlans).values({
      title,
      mode: input.mode,
      inputType: input.inputType,
      seedInput: input.seedInput,
      maxIterations: input.maxIterations ?? 5,
      scoreThreshold: input.scoreThreshold ?? 80,
      status: 'idle',
      createdBy,
    }).returning()
    return plan
  },
  async start(planId) {
    await db.update(businessPlans).set({ status: 'running' }).where(eq(businessPlans.id, planId))
    const [task] = await db.insert(taskQueue).values({
      type: 'business_plan_iteration',
      status: 'pending',
      priority: 2,
      scheduledFor: new Date(),
      payload: { planId },
      referenceType: 'business_plans',
      referenceId: planId,
    }).returning()
    await db.update(businessPlans).set({ currentIterationTaskId: task.id }).where(eq(businessPlans.id, planId))
  },
  async stop(planId) { /* cancel task + status='stopped' */ },
  async get(planId) { /* mit Iterationen */ },
  async list(filters) { /* pagination */ },
  async delete(planId) { /* cascade */ },
}
```

- [ ] **Step 3: IterationService mit runIteration**

```ts
// src/lib/services/business-plan/iteration.service.ts
import * as actions from './actions'

export const IterationService = {
  async runIteration(planId: string): Promise<void> {
    const plan = await loadPlan(planId)
    const lastIter = await loadLastIteration(planId)
    const iterationNumber = (lastIter?.iterationNumber ?? 0) + 1
    const [iter] = await db.insert(businessPlanIterations).values({
      planId,
      iterationNumber,
      status: 'generating',
    }).returning()

    const start = Date.now()
    try {
      const planVersion = iterationNumber === 1
        ? await firstPlan(plan)
        : await actions.reviseBusinessPlan({
            previousPlan: lastIter,
            improvements: lastIter.analysis.improvements,
            mode: plan.mode,
          }, ctx)

      await db.update(businessPlanIterations).set({
        planCanvas: planVersion.canvas,
        planKfwMarkdown: planVersion.kfw,
        status: 'simulating',
      }).where(eq(businessPlanIterations.id, iter.id))

      const simReq = await buildSimulationRequest(plan, planVersion)
      const simResult = await actions.simulateWithMirofish(simReq, ctx)

      await db.update(businessPlanIterations).set({
        simulationRequest: simReq,
        simulationResult: simResult,
        status: 'analyzing',
      }).where(eq(businessPlanIterations.id, iter.id))

      const analysis = await actions.analyzeSimulation({ plan: planVersion, simulationResult: simResult }, ctx)

      await db.update(businessPlanIterations).set({
        analysis,
        status: 'done',
        durationMs: Date.now() - start,
      }).where(eq(businessPlanIterations.id, iter.id))

      await db.update(businessPlans).set({
        currentIteration: iterationNumber,
        finalScore: analysis.score,
      }).where(eq(businessPlans.id, planId))

      // Stop-Check
      if (analysis.score >= plan.scoreThreshold || iterationNumber >= plan.maxIterations) {
        await db.update(businessPlans).set({ status: 'completed' }).where(eq(businessPlans.id, planId))
        await WorkflowEngine.fire('business_plan.completed', { planId, score: analysis.score })
      } else {
        await BusinessPlanService.requeueNextIteration(planId)
      }
    } catch (e) {
      await markIterationFailed(iter.id, e)
      await db.update(businessPlans).set({ status: 'failed', error: String(e) }).where(eq(businessPlans.id, planId))
      await WorkflowEngine.fire('business_plan.failed', { planId, error: String(e) })
      throw e
    }
  },
}
```

- [ ] **Step 4: TaskQueue-Worker für `business_plan_iteration` registrieren**

In dem zentralen Worker-Dispatcher (analog wo `social_post_publish` registriert ist) Case ergänzen:

```ts
case 'business_plan_iteration': {
  const { IterationService } = await import('@/lib/services/business-plan/iteration.service')
  await IterationService.runIteration(task.payload.planId)
  break
}
```

- [ ] **Step 5: Tests für IterationService**

Mindestens: Stop bei Score >= Threshold, Stop bei Max-Iterations, Failed-State bei Mirofish-Error, Iteration-Counter inkrementiert.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/business-plan src/__tests__/unit/services/business-plan src/lib/utils/validation.ts
git commit -m "feat(business-plan): BusinessPlanService + IterationService mit Stop-Check und taskQueue-Worker"
```

---

## Task 8: Workflow-Trigger + Default-Workflow-Seed

**Files:**
- Modify: `src/lib/services/workflow/triggers.ts`
- Create: `src/lib/db/seeds/business-plan-workflow.seed.ts`
- Modify: `src/lib/db/seed-check.ts` (Aufruf des neuen Seeds)

- [ ] **Step 1: Trigger ergänzen**

```ts
// in WORKFLOW_TRIGGERS
{ key: 'business_plan.created', label: 'Businessplan angelegt', payloadSchema: { planId: 'uuid', title: 'string' } },
{ key: 'business_plan.iteration_completed', label: 'Iteration abgeschlossen', payloadSchema: { planId, iteration, score } },
{ key: 'business_plan.completed', label: 'Businessplan fertig', payloadSchema: { planId, finalScore } },
{ key: 'business_plan.failed', label: 'Businessplan fehlgeschlagen', payloadSchema: { planId, error } },
```

- [ ] **Step 2: Default-Workflow als Seed**

Optional/Bonus: Ein Beispiel-Workflow, der bei `business_plan.completed` eine `notify_admin`-Action feuert. Operator kann das später anpassen.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/workflow/triggers.ts src/lib/db/seeds/business-plan-workflow.seed.ts src/lib/db/seed-check.ts
git commit -m "feat(business-plan): 4 Workflow-Trigger + Default-Notify-Workflow"
```

---

## Task 9: API-Routes

**Files:**
- Create: `src/app/api/v1/business-plans/route.ts`
- Create: `src/app/api/v1/business-plans/[id]/route.ts`
- Create: `src/app/api/v1/business-plans/[id]/stop/route.ts`
- Create: `src/app/api/v1/business-plans/[id]/iterate/route.ts`

- [ ] **Step 1: POST /api/v1/business-plans**

```ts
export async function POST(request: NextRequest) {
  return withPermission(request, 'business_plans', 'create', async (session) => {
    const body = await request.json()
    const validation = validateAndParse(createBusinessPlanSchema, body)
    if (!validation.success) return apiValidationError(formatZodErrors(validation.errors))
    const plan = await BusinessPlanService.create(validation.data, session.userId)
    await BusinessPlanService.start(plan.id)
    return apiSuccess(plan)
  })
}
```

- [ ] **Step 2-4: GET-List, GET-Detail, POST-Stop, POST-Iterate, DELETE**

Standard-CRUD-Pattern analog `/api/v1/news/topics/`.

- [ ] **Step 5: Permission-Modul registrieren**

`business_plans` in der Permission-Tabelle ergänzen (Migration oder Seed, je nach bestehendem System).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/business-plans
git commit -m "feat(business-plan): API-Routes (POST/GET-list/GET-detail/STOP/ITERATE/DELETE)"
```

---

## Task 10: UI — Liste + Anlage-Modal

**Files:**
- Create: `src/app/intern/(dashboard)/business-plans/page.tsx`
- Create: `src/app/intern/(dashboard)/business-plans/_components/plan-card.tsx`
- Create: `src/app/intern/(dashboard)/business-plans/_components/create-plan-modal.tsx`
- Modify: Sidebar-Navigation (z.B. `src/components/layout/sidebar.tsx`) — neuer Punkt "Businessplan"

- [ ] **Step 1: Listenseite mit Karten**

State: `plans`, `loading`, `modalOpen`. Polling alle 10s wenn mindestens ein Plan `running` ist. Karte mit Score-Gauge (recharts oder eigenes SVG), Mode-Badge, Iterations-Bar, Status-Pill.

- [ ] **Step 2: Anlage-Modal**

Toggle Quick/Briefing, Mode-Select, Slider für Threshold, Stepper für Max-Iterations. Submit → POST → redirect zu `/intern/business-plans/<id>`.

- [ ] **Step 3: Sidebar-Eintrag**

```tsx
{ label: 'Businessplan', icon: ChartLine, href: '/intern/business-plans' }
```

- [ ] **Step 4: Commit**

```bash
git add 'src/app/intern/(dashboard)/business-plans' src/components/layout
git commit -m "feat(business-plan): Listenseite + Anlage-Modal + Sidebar-Eintrag"
```

---

## Task 11: UI — Detail mit Tabs

**Files:**
- Create: `src/app/intern/(dashboard)/business-plans/[id]/page.tsx`
- Create: `src/app/intern/(dashboard)/business-plans/[id]/_components/score-gauge.tsx`
- Create: `src/app/intern/(dashboard)/business-plans/[id]/_components/iteration-timeline.tsx`
- Create: `src/app/intern/(dashboard)/business-plans/[id]/_components/canvas-view.tsx`
- Create: `src/app/intern/(dashboard)/business-plans/[id]/_components/kfw-view.tsx`
- Create: `src/app/intern/(dashboard)/business-plans/[id]/_components/simulation-view.tsx`
- Create: `src/app/intern/(dashboard)/business-plans/[id]/_components/analysis-view.tsx`

- [ ] **Step 1: Detail-Page-Skelett mit Tabs**

```tsx
<Tabs defaultValue="plan">
  <TabsList>
    <TabsTrigger value="plan">Plan</TabsTrigger>
    <TabsTrigger value="iterations">Iterationen</TabsTrigger>
    <TabsTrigger value="simulation">Simulation</TabsTrigger>
    <TabsTrigger value="analysis">Analyse</TabsTrigger>
  </TabsList>
  <TabsContent value="plan">{plan.mode === 'canvas' || plan.mode === 'both' ? <CanvasView ... /> : null}{plan.mode === 'kfw' || plan.mode === 'both' ? <KfwView ... /> : null}</TabsContent>
  <TabsContent value="iterations"><IterationTimeline iterations={plan.iterations} /></TabsContent>
  <TabsContent value="simulation"><SimulationView ... /></TabsContent>
  <TabsContent value="analysis"><AnalysisView ... /></TabsContent>
</Tabs>
```

- [ ] **Step 2: ScoreGauge-Komponente (SVG-Donut 0-100)**
- [ ] **Step 3: IterationTimeline mit Score-Verlauf-Sparkline**
- [ ] **Step 4: CanvasView (9-Box-Grid mit Tailwind)**
- [ ] **Step 5: KfwView (Markdown-Render via `react-markdown` falls vorhanden, sonst plain)**
- [ ] **Step 6: SimulationView (Risk-Signals farbcodiert + Narrative-Pfad-Liste)**
- [ ] **Step 7: AnalysisView (Stärken/Schwächen/Improvements-Listen)**
- [ ] **Step 8: Polling alle 5s wenn Status `running`**
- [ ] **Step 9: Stop-Button, Re-iterate-Button (mit Modal für neue Kriterien)**

- [ ] **Step 10: Commit**

```bash
git add 'src/app/intern/(dashboard)/business-plans/[id]'
git commit -m "feat(business-plan): Detail-Seite mit 4 Tabs (Plan/Iterationen/Simulation/Analyse) + ScoreGauge + Polling"
```

---

## Task 12: Audit-Logging anschließen

**Files:**
- Modify: `src/lib/services/business-plan/business-plan.service.ts`
- Modify: `src/app/api/v1/business-plans/...` (alle ändernden Routes)

- [ ] **Step 1: AuditLogService.log() für create, start, stop, delete, iterate**

```ts
await AuditLogService.log({
  actorUserId: session.userId,
  action: 'business_plan.create',
  entityType: 'business_plans',
  entityId: plan.id,
  details: { title: plan.title, mode: plan.mode },
})
```

- [ ] **Step 2: Tests + Commit**

---

## Task 13: PDF-Export (optional, Phase 7)

**Files:**
- Create: `src/lib/services/business-plan/pdf-export.service.ts`
- Create: `src/app/api/v1/business-plans/[id]/export.pdf/route.ts`

- [ ] **Step 1: PDF-Renderer einrichten (z.B. `@react-pdf/renderer` oder Puppeteer falls bereits im Projekt)**
- [ ] **Step 2: Route generiert PDF aus aktueller Plan-Version, speichert als Artifact**
- [ ] **Step 3: UI-Button im Detail-Header verlinkt auf Export-Route**
- [ ] **Step 4: Commit**

---

## Task 14: Final-Check & Push

- [ ] **Step 1: TypeScript komplett sauber**
```bash
npx tsc --noEmit
```

- [ ] **Step 2: Alle Tests grün**
```bash
npx vitest run
```

- [ ] **Step 3: docker compose up mit Mirofish + Smoke-Test**

Lokal: einen Plan anlegen, eine Iteration durchlaufen lassen, im UI prüfen ob Score erscheint, Mirofish-Bericht sichtbar ist.

- [ ] **Step 4: Push**
```bash
git push origin main
```

Push triggert CI-Auto-Bump (1.5.x).

---

## Out of Scope (für diesen Plan)

- WebSocket/SSE-Live-Updates
- DOCX-Export
- Multi-Plan-Vergleich
- Pitch-Deck-Generierung mit Folien-Bildern
- Endkunden-Zugang außerhalb /intern
