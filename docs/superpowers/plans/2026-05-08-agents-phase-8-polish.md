# Agent-System Phase 8 — Approval-Flow + Goal-Templates + Notifications + Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optionale Polish-Phase, die das Agent-System produktionsreif macht. Vier Themen: (1) **Approval-Flow** (Goals mit `requirePlanApproval=true` warten nach `planning` auf User-Freigabe, bevor Steps queued werden), (2) **Goal-Templates** (User kann Goals aus vordefinierten Templates anlegen, ~3 Default-Templates per Migration), (3) **Notifications** (E-Mail an Admin bei `goal_complete`/`fail`, plus UI-Toast bei wichtigen Status-Wechseln), (4) **Performance-Polish** (Index auf `agent_cost_events`, kleine Memo's).

**Architecture:**
- **Approval-Flow**: Schema-Feld `requirePlanApproval` und Status `awaiting_approval` existieren seit Phase 1. `OrchestratorService.plan` bekommt eine Verzweigung: bei `goal.requirePlanApproval` setzt er Goal-Status auf `awaiting_approval`, schreibt `agent_steps` (zur Vorschau), aber queued KEINE `agent_step_run`-Tasks. Zwei neue API-Endpoints `POST /api/agents/goals/[id]/approve` (queued ready Steps) und `POST /api/agents/goals/[id]/reject` (cancelled Goal). Goal-Detail-View bekommt Plan-Vorschau-Card mit Freigeben/Ablehnen-Buttons wenn `status='awaiting_approval'`.
- **Goal-Templates**: Neue Tabelle `agent_goal_templates` mit `slug` (unique), `title`, `description`, `descriptionTemplate` (mit `{{var}}`-Platzhalter), `requiredVariables` (text[]), `defaultBudgetCents`, `defaultExecutionMode`, `defaultPriority`, `defaultRequirePlanApproval`, `metadata`, `isActive`. Migration 022 seedet 3 Default-Templates: `firma-recherchieren` (Variable: `firmenName`), `memo-schreiben` (Variable: `thema`), `newsletter-analysieren` (Variable: `quelleUrl`). API liefert Liste + neue Goal-Form bekommt "Aus Template" Toggle oben.
- **Notifications**: E-Mail-Versand via existierendem `EmailService.send` an `EmailService.resolveAdminRecipient()`. Trigger in `OrchestratorService.replan` bei finalem `action='goal_complete'`/`'fail'`. Mini-Wrapper `AgentNotificationService.notifyGoalTerminal({goalId, status, summary})` damit Tests einfach mocken koennen. Geschickte Aufrufe schluckt Fehler (loggt aber) damit Notification-Outage Goal-Done nicht blockiert. UI-Toast: bestehende `toast`-Calls in Manual-Triggers + neue Toasts in Run-Detail-View bei Status-Aenderung (Polling sieht Wechsel).
- **Performance-Polish**: Migration 023 mit `idx_agent_cost_events_occurred_desc` (BRIN reicht nicht — wir brauchen B-Tree fuer "last 7 days"-Queries). Plus `useMemo` um `computeDagLayout` in RunDagView (heute laeuft das jeden 5s-Tick neu).

**Tech Stack:** Bestehender `EmailService` (`src/lib/services/email.service.ts`), `AuditLogService`, Drizzle, Vitest. Keine neuen Dependencies.

**Spec-Referenz:** `docs/superpowers/specs/2026-05-08-agent-system-design.md` §6.1 (`awaiting_approval` Goal-Status), §7.3 (Approval-Flow), §8 (Optional Phase 8).

**Vorbedingungen:** Phasen 1-7 gemerged. Migrationen 020 + 021 ausgefuehrt. Branch dieser Phase: `feat/agents-polish`.

---

## File Structure

**Neue Module:**
- `src/lib/services/agents/notification.service.ts` — `AgentNotificationService` (Wrapper um EmailService)
- `src/lib/services/agents/template.service.ts` — `TemplateService` (list/get/createGoalFromTemplate)
- `src/lib/db/migrations/022_agent_goal_templates.sql` — Tabelle + 3 Default-Seeds
- `src/lib/db/migrations/023_agent_cost_events_index.sql` — Performance-Index

**Modifiziert:**
- `src/lib/db/schema.ts` — `agentGoalTemplates`-Tabelle + Re-Export
- `src/lib/db/migrations/index.ts` — Migration 022 + 023 anhaengen
- `src/lib/services/agents/orchestrator.service.ts` — `plan()` checkt `requirePlanApproval`, `replan()` ruft Notification bei terminalen Aktionen
- `src/lib/services/agents/goal.service.ts` — neue Methoden `approve(goalId)`, `reject(goalId)`
- `src/lib/services/agents/index.ts` — Re-Exports
- `src/components/agents/goals/goal-form.tsx` — Template-Picker oben + `requirePlanApproval`-Toggle (falls noch nicht da)
- `src/components/agents/goals/goal-detail-view.tsx` — Plan-Vorschau-Card + Freigeben/Ablehnen-Buttons bei `awaiting_approval`
- `src/components/agents/runs/run-dag-view.tsx` — `useMemo` um `computeDagLayout`

**Neue API-Routes:**
- `src/app/api/agents/goals/[id]/approve/route.ts` — `POST` queued alle ready Steps
- `src/app/api/agents/goals/[id]/reject/route.ts` — `POST` cancelled Goal
- `src/app/api/agents/templates/route.ts` — `GET` Liste aller aktiven Templates
- `src/app/api/agents/templates/[id]/create-goal/route.ts` — `POST` legt Goal aus Template + Variables an

**Neue Tests:**
- `src/__tests__/unit/services/agents/notification.service.test.ts`
- `src/__tests__/unit/services/agents/template.service.test.ts`
- `src/__tests__/unit/services/agents/orchestrator.approval-flow.test.ts`
- `src/__tests__/unit/services/agents/goal.service.approve-reject.test.ts`
- `src/__tests__/unit/api/agents/templates-route.test.ts`
- `src/__tests__/unit/api/agents/approve-reject-route.test.ts`

---

### Task 1: Schema + Migration 022 (Goal-Templates)

**Files:**
- Modify: `src/lib/db/schema.ts` — `agentGoalTemplates`-Tabelle ergaenzen
- Create: `src/lib/db/migrations/022_agent_goal_templates.sql`
- Modify: `src/lib/db/migrations/index.ts`

- [ ] **Step 1: Drizzle-Schema ergaenzen**

In `src/lib/db/schema.ts` nach dem `agentDefinitions`-Block (~Zeile 3980) einfuegen:

```ts
export const agentGoalTemplates = pgTable('agent_goal_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  /** Mustache-aehnliche Template-Strings, {{varname}}-Platzhalter */
  titleTemplate: text('title_template').notNull(),
  descriptionTemplate: text('description_template'),
  /** Liste der erforderlichen Variablen (z.B. ['firmenName']) */
  requiredVariables: text('required_variables').array().default(sql`ARRAY[]::text[]`).notNull(),
  defaultBudgetCents: integer('default_budget_cents'),
  defaultBudgetTokens: integer('default_budget_tokens'),
  defaultExecutionMode: varchar('default_execution_mode', { length: 20 }).default('cron').notNull(),
  defaultPriority: integer('default_priority').default(2).notNull(),
  defaultRequirePlanApproval: boolean('default_require_plan_approval').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_agent_goal_templates_slug_active').on(table.slug, table.isActive),
])

export type AgentGoalTemplate = typeof agentGoalTemplates.$inferSelect
export type NewAgentGoalTemplate = typeof agentGoalTemplates.$inferInsert
```

- [ ] **Step 2: Migration-SQL**

`src/lib/db/migrations/022_agent_goal_templates.sql`:

```sql
-- =============================================
-- 022: Agent-System Phase 8 — Goal-Templates
-- =============================================
-- Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §8 (Phase 8)

CREATE TABLE IF NOT EXISTS agent_goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  title_template TEXT NOT NULL,
  description_template TEXT,
  required_variables TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  default_budget_cents INTEGER,
  default_budget_tokens INTEGER,
  default_execution_mode VARCHAR(20) NOT NULL DEFAULT 'cron',
  default_priority INTEGER NOT NULL DEFAULT 2,
  default_require_plan_approval BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_goal_templates_slug_active ON agent_goal_templates (slug, is_active);

INSERT INTO agent_goal_templates (slug, name, description, title_template, description_template, required_variables, default_budget_cents, default_priority)
VALUES
  (
    'firma-recherchieren',
    'Firma recherchieren',
    'Recherchiert eine Firma und legt ein Memo unter Resources/firmen/<slug> ab.',
    'Recherche: {{firmenName}}',
    'Recherchiere die Firma "{{firmenName}}" — Branche, Mitarbeiterzahl, Umsatz, Schluesselpersonen, aktuelle News. Nutze service:lead-research und service:website-scraper. Speichere die Zusammenfassung als Memory unter Resources/firmen/{{firmenName}}.md.',
    ARRAY['firmenName'],
    500,
    2
  ),
  (
    'memo-schreiben',
    'Memo schreiben',
    'Schreibt ein kurzes Memo zu einem Thema basierend auf vorhandenem Memory.',
    'Memo: {{thema}}',
    'Schreibe ein praezises Memo (max 500 Worte) zum Thema "{{thema}}". Nutze memory:search um vorhandenes Material zu finden, agent:writer fuer den Fliesstext. Speichere als Memory unter Projects/memos/{{thema}}.md.',
    ARRAY['thema'],
    300,
    2
  ),
  (
    'newsletter-analysieren',
    'Newsletter-URL analysieren',
    'Scrapt eine Newsletter-Quelle und legt strukturierte Notizen ab.',
    'Newsletter-Analyse: {{quelleUrl}}',
    'Scrape die URL "{{quelleUrl}}" via service:website-scraper, extrahiere die wichtigsten 5 Punkte, speichere als Memory unter Resources/newsletter/<auto-slug>.md.',
    ARRAY['quelleUrl'],
    300,
    2
  )
ON CONFLICT (slug) DO NOTHING;
```

- [ ] **Step 3: Migration-Index erweitern**

In `src/lib/db/migrations/index.ts` vor der schliessenden `]` einfuegen:

```ts
  {
    name: '022_agent_goal_templates.sql',
    description: 'Agent-System Phase 8: agent_goal_templates + 3 Default-Seeds',
  },
```

- [ ] **Step 4: Migration triggern (lokal/dev)**

`pnpm dev` (auto-migration laeuft beim Boot). Optional `psql "$DATABASE_URL" -f src/lib/db/migrations/022_agent_goal_templates.sql`.

- [ ] **Step 5: Verify per SQL**

```sql
SELECT slug, name, required_variables FROM agent_goal_templates ORDER BY slug;
```
Erwartet: 3 Zeilen.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/migrations/022_agent_goal_templates.sql src/lib/db/migrations/index.ts
git commit -m "feat(agents): agent_goal_templates Tabelle + 3 Default-Templates (Migration 022)"
```

---

### Task 2: TemplateService

**Files:**
- Create: `src/lib/services/agents/template.service.ts`
- Test: `src/__tests__/unit/services/agents/template.service.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/template.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
vi.mock('@/lib/db', () => ({ db: { select: selectMock } }))
vi.mock('@/lib/db/schema', () => ({ agentGoalTemplates: { id: 'id', slug: 'slug', isActive: 'isActive' } }))

const goalCreateMock = vi.fn()
const goalStartMock = vi.fn()
vi.mock('@/lib/services/agents/goal.service', () => ({
  GoalService: { create: goalCreateMock, start: goalStartMock },
}))

describe('TemplateService.list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('liefert nur aktive Templates', async () => {
    const orderBy = vi.fn().mockResolvedValue([
      { id: 't1', slug: 'firma-recherchieren', name: 'Firma recherchieren', isActive: true },
    ])
    selectWhereMock.mockReturnValueOnce({ orderBy })
    const { TemplateService } = await import('@/lib/services/agents/template.service')
    const r = await TemplateService.list()
    expect(r).toHaveLength(1)
    expect(r[0].slug).toBe('firma-recherchieren')
  })
})

describe('TemplateService.createGoalFromTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rendert Title + Description, ruft GoalService.create + start', async () => {
    selectLimitMock.mockResolvedValueOnce([{
      id: 't1', slug: 'firma-recherchieren', name: 'Firma',
      titleTemplate: 'Recherche: {{firmenName}}',
      descriptionTemplate: 'Recherchiere {{firmenName}}',
      requiredVariables: ['firmenName'],
      defaultBudgetCents: 500, defaultBudgetTokens: null,
      defaultExecutionMode: 'cron', defaultPriority: 2,
      defaultRequirePlanApproval: false,
      isActive: true,
    }])
    goalCreateMock.mockResolvedValueOnce({ id: 'g1' })
    goalStartMock.mockResolvedValueOnce({ runId: 'r1' })

    const { TemplateService } = await import('@/lib/services/agents/template.service')
    const r = await TemplateService.createGoalFromTemplate('t1', { firmenName: 'Acme GmbH' })

    expect(goalCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Recherche: Acme GmbH',
      description: 'Recherchiere Acme GmbH',
      executionMode: 'cron',
      budgetCents: 500,
      priority: 2,
    }))
    expect(goalStartMock).toHaveBeenCalledWith('g1')
    expect(r.goalId).toBe('g1')
    expect(r.runId).toBe('r1')
  })

  it('wirft wenn requiredVariables fehlt', async () => {
    selectLimitMock.mockResolvedValueOnce([{
      id: 't1', slug: 'firma-recherchieren', titleTemplate: '{{firmenName}}',
      descriptionTemplate: '', requiredVariables: ['firmenName'],
      defaultBudgetCents: null, defaultBudgetTokens: null,
      defaultExecutionMode: 'cron', defaultPriority: 2,
      defaultRequirePlanApproval: false, isActive: true,
    }])
    const { TemplateService } = await import('@/lib/services/agents/template.service')
    await expect(TemplateService.createGoalFromTemplate('t1', {})).rejects.toThrow(/firmenName/)
  })

  it('wirft wenn Template nicht existiert', async () => {
    selectLimitMock.mockResolvedValueOnce([])
    const { TemplateService } = await import('@/lib/services/agents/template.service')
    await expect(TemplateService.createGoalFromTemplate('t-x', {})).rejects.toThrow(/nicht gefunden/)
  })
})
```

- [ ] **Step 2: Test laufen — FAIL**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/unit/services/agents/template.service.test.ts`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementation**

`src/lib/services/agents/template.service.ts`:

```ts
/**
 * TemplateService — verwaltet agent_goal_templates und legt Goals daraus an.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §8 (Phase 8)
 */

import type { AgentGoalTemplate } from '@/lib/db/schema'

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => variables[key] ?? '')
}

export const TemplateService = {
  async list(): Promise<AgentGoalTemplate[]> {
    const { db } = await import('@/lib/db')
    const { agentGoalTemplates } = await import('@/lib/db/schema')
    const { eq, asc } = await import('drizzle-orm')
    const rows = await db.select().from(agentGoalTemplates).where(eq(agentGoalTemplates.isActive, true)).orderBy(asc(agentGoalTemplates.name))
    return rows as AgentGoalTemplate[]
  },

  async getById(id: string): Promise<AgentGoalTemplate | null> {
    const { db } = await import('@/lib/db')
    const { agentGoalTemplates } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const [row] = await db.select().from(agentGoalTemplates).where(eq(agentGoalTemplates.id, id)).limit(1)
    return (row as AgentGoalTemplate) ?? null
  },

  async createGoalFromTemplate(
    templateId: string,
    variables: Record<string, string>,
  ): Promise<{ goalId: string; runId: string }> {
    const { db } = await import('@/lib/db')
    const { agentGoalTemplates } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [tmpl] = await db.select().from(agentGoalTemplates).where(eq(agentGoalTemplates.id, templateId)).limit(1)
    if (!tmpl) throw new Error(`Template ${templateId} nicht gefunden`)

    // Required-Variables-Check
    const missing = (tmpl.requiredVariables as string[]).filter((v) => !variables[v] || variables[v].trim().length === 0)
    if (missing.length > 0) throw new Error(`Erforderliche Variablen fehlen: ${missing.join(', ')}`)

    const title = renderTemplate(tmpl.titleTemplate, variables)
    const description = tmpl.descriptionTemplate ? renderTemplate(tmpl.descriptionTemplate, variables) : null

    const { GoalService } = await import('./goal.service')
    const { id: goalId } = await GoalService.create({
      title,
      description: description ?? undefined,
      executionMode: (tmpl.defaultExecutionMode === 'immediate' ? 'immediate' : 'cron'),
      budgetCents: tmpl.defaultBudgetCents ?? undefined,
      budgetTokens: tmpl.defaultBudgetTokens ?? undefined,
      priority: (tmpl.defaultPriority as 1 | 2 | 3) ?? 2,
      requirePlanApproval: tmpl.defaultRequirePlanApproval,
    })
    const startResult = await GoalService.start(goalId)
    return { goalId, runId: startResult.runId }
  },
}
```

- [ ] **Step 4: Test laufen — PASS**

Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/template.service.ts \
        src/__tests__/unit/services/agents/template.service.test.ts
git commit -m "feat(agents): TemplateService (list/getById/createGoalFromTemplate)"
```

---

### Task 3: API-Routes /api/agents/templates

**Files:**
- Create: `src/app/api/agents/templates/route.ts`
- Create: `src/app/api/agents/templates/[id]/create-goal/route.ts`
- Test: `src/__tests__/unit/api/agents/templates-route.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/api/agents/templates-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) }))
vi.mock('@/lib/services/agents/template.service', () => ({
  TemplateService: {
    list: vi.fn().mockResolvedValue([{ id: 't1', slug: 'firma-recherchieren', name: 'Firma' }]),
    createGoalFromTemplate: vi.fn(),
  },
}))

describe('GET /api/agents/templates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('liefert Liste', async () => {
    const { GET } = await import('@/app/api/agents/templates/route')
    const res = await GET(new Request('http://x'))
    const j = await res.json()
    expect(j.templates).toHaveLength(1)
  })

  it('ohne Session: 401', async () => {
    const { getSession } = await import('@/lib/auth/session')
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/agents/templates/route')
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/agents/templates/[id]/create-goal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('legt Goal aus Template + Variables an', async () => {
    const { TemplateService } = await import('@/lib/services/agents/template.service')
    ;(TemplateService.createGoalFromTemplate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ goalId: 'g1', runId: 'r1' })

    const { POST } = await import('@/app/api/agents/templates/[id]/create-goal/route')
    const res = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ variables: { firmenName: 'Acme' } }),
      headers: { 'content-type': 'application/json' },
    }), { params: Promise.resolve({ id: 't1' }) })

    const j = await res.json()
    expect(res.status).toBe(201)
    expect(j.goalId).toBe('g1')
  })

  it('400 bei fehlender Variable', async () => {
    const { TemplateService } = await import('@/lib/services/agents/template.service')
    ;(TemplateService.createGoalFromTemplate as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Erforderliche Variablen fehlen: firmenName'))

    const { POST } = await import('@/app/api/agents/templates/[id]/create-goal/route')
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ variables: {} }),
      headers: { 'content-type': 'application/json' },
    }), { params: Promise.resolve({ id: 't1' }) })

    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Implementation**

`src/app/api/agents/templates/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/utils/api-response'

export async function GET(_req: Request) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const { TemplateService } = await import('@/lib/services/agents/template.service')
  const templates = await TemplateService.list()
  return NextResponse.json({ templates })
}
```

`src/app/api/agents/templates/[id]/create-goal/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiError } from '@/lib/utils/api-response'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id: templateId } = await params

  let body: { variables?: Record<string, unknown> }
  try { body = await req.json() } catch { return apiError('BAD_REQUEST', 'Body nicht parseable', 400) }

  const variables: Record<string, string> = {}
  if (body.variables && typeof body.variables === 'object') {
    for (const [k, v] of Object.entries(body.variables)) {
      if (typeof v === 'string') variables[k] = v
    }
  }

  try {
    const { TemplateService } = await import('@/lib/services/agents/template.service')
    const r = await TemplateService.createGoalFromTemplate(templateId, variables)
    return NextResponse.json(r, { status: 201 })
  } catch (e) {
    return apiError('BAD_REQUEST', (e as Error).message, 400)
  }
}
```

- [ ] **Step 3: Test PASS**

Expected: 4 PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/agents/templates \
        src/__tests__/unit/api/agents/templates-route.test.ts
git commit -m "feat(agents): /api/agents/templates GET + create-goal POST"
```

---

### Task 4: Goal-Form Template-Picker + Approval-Toggle

**Files:**
- Modify: `src/components/agents/goals/goal-form.tsx`

- [ ] **Step 1: Existierende Form lesen**

Lies `src/components/agents/goals/goal-form.tsx` vollstaendig. Identifiziere:
- Wo das `Title`/`Description`/`Budget`-Feld ist
- Ob `requirePlanApproval`-Toggle bereits existiert (haengt von Phase-4-Implementation ab)

- [ ] **Step 2: Template-Picker-Block einfuegen**

Ganz oben im Form-Layout (vor Title-Feld) einen optionalen Template-Picker einbauen:

```tsx
'use client'

import { useEffect, useState } from 'react'
// ... existing imports ...

interface Template {
  id: string
  slug: string
  name: string
  description: string | null
  requiredVariables: string[]
}

export function GoalForm() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const [title, setTitle] = useState('')
  // ... existing state ...
  const [requirePlanApproval, setRequirePlanApproval] = useState(false)

  useEffect(() => {
    fetch('/api/agents/templates').then((r) => r.json()).then((j) => setTemplates(j.templates ?? []))
  }, [])

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  const submitFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch(`/api/agents/templates/${selectedTemplateId}/create-goal`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variables: templateVariables }),
      })
      if (!r.ok) throw new Error(await r.text())
      const j = await r.json()
      toast.success('Goal aus Template erstellt')
      router.push(`/intern/agents/goals/${j.goalId}`)
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  // ...

  return (
    <Card>
      <CardHeader><CardTitle>Neues Goal</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {templates.length > 0 && (
          <div className="space-y-3 border-b pb-6">
            <Label>Aus Template anlegen (optional)</Label>
            <select
              value={selectedTemplateId}
              onChange={(e) => { setSelectedTemplateId(e.target.value); setTemplateVariables({}) }}
              className="w-full border rounded p-2"
            >
              <option value="">— Kein Template, frei anlegen —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {selectedTemplate && (
              <form onSubmit={submitFromTemplate} className="space-y-3">
                {selectedTemplate.description && (
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                )}
                {selectedTemplate.requiredVariables.map((v) => (
                  <div key={v}>
                    <Label>{v}</Label>
                    <Input
                      value={templateVariables[v] ?? ''}
                      onChange={(e) => setTemplateVariables({ ...templateVariables, [v]: e.target.value })}
                      required
                    />
                  </div>
                ))}
                <Button type="submit" disabled={saving}>{saving ? 'Erstelle...' : 'Goal aus Template erstellen + starten'}</Button>
              </form>
            )}
          </div>
        )}

        {/* — bestehende freie Form unter dem Template-Block — */}
        <form onSubmit={submit} className="space-y-4">
          {/* ... bestehende Felder ... */}

          {/* NEUER TOGGLE — falls noch nicht im Form */}
          <div className="flex items-center gap-2">
            <input
              id="requirePlanApproval"
              type="checkbox"
              checked={requirePlanApproval}
              onChange={(e) => setRequirePlanApproval(e.target.checked)}
            />
            <Label htmlFor="requirePlanApproval">
              Plan vor Ausfuehrung freigeben (Goal wartet nach Planung auf Bestaetigung)
            </Label>
          </div>

          {/* submit verwendet jetzt requirePlanApproval im Body */}
        </form>
      </CardContent>
    </Card>
  )
}
```

WICHTIG: Beim bestehenden submit-Handler `requirePlanApproval` im Body mitgeben:

```ts
body: JSON.stringify({
  // ... existing fields ...
  requirePlanApproval,
})
```

- [ ] **Step 3: Pruefen ob /api/agents/goals POST `requirePlanApproval` schon akzeptiert**

`src/app/api/agents/goals/route.ts` lesen. Falls noch nicht: Body-Parsing erweitern um `requirePlanApproval: typeof body.requirePlanApproval === 'boolean' ? body.requirePlanApproval : undefined` und an `GoalService.create` weiterreichen.

- [ ] **Step 4: Commit**

```bash
git add src/components/agents/goals/goal-form.tsx src/app/api/agents/goals/route.ts
git commit -m "feat(agents): GoalForm Template-Picker + requirePlanApproval-Toggle"
```

---

### Task 5: OrchestratorService Approval-Pfad

**Files:**
- Modify: `src/lib/services/agents/orchestrator.service.ts`
- Test: `src/__tests__/unit/services/agents/orchestrator.approval-flow.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/orchestrator.approval-flow.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const aiCompleteMock = vi.fn()
vi.mock('@/lib/services/ai', () => ({ AIService: { complete: aiCompleteMock } }))
vi.mock('@/lib/services/agents/cost-tracker.service', () => ({
  CostTrackerService: {
    checkBudget: vi.fn().mockResolvedValue({ exceeded: false, spentCents: 0, budgetCents: null, spentTokens: 0, budgetTokens: null }),
    record: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('@/lib/services/agents/recovery/activity-log', () => ({ logAgentEvent: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/services/agents/tool-registry', () => ({ ToolRegistry: { listAll: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/lib/services/agents/tools/bootstrap', () => ({ initializeToolRegistry: vi.fn() }))

const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const insertReturningMock = vi.fn().mockResolvedValue([{ id: 'run-1' }])
const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }))
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
vi.mock('@/lib/db', () => ({ db: { select: selectMock, insert: insertMock, update: updateMock } }))
vi.mock('@/lib/db/schema', () => ({
  agentGoals: { id: 'id', title: 'title', description: 'description', status: 'status', requirePlanApproval: 'requirePlanApproval' },
  agentRuns: { id: 'id', goalId: 'goalId', status: 'status' },
  agentSteps: { id: 'id', runId: 'runId', stepKey: 'stepKey', dependsOnStepKeys: 'dependsOnStepKeys' },
  taskQueue: { id: 'id' },
}))

describe('OrchestratorService.plan() Approval-Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectLimitMock.mockReset()
    aiCompleteMock.mockReset()
    insertReturningMock.mockReset()
    insertReturningMock.mockResolvedValue([{ id: 'run-1' }])
  })

  it('requirePlanApproval=true → Goal-Status=awaiting_approval, KEIN Step-Task gequeued', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'T', description: '', requirePlanApproval: true }])
    aiCompleteMock.mockResolvedValueOnce({
      text: '{"reasoning":"r","steps":[{"stepKey":"s1","workerType":"memory:list","config":{},"contextRefs":[],"dependsOnStepKeys":[]}]}',
      provider: 'm', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    })
    insertReturningMock
      .mockResolvedValueOnce([{ id: 'run-1' }])
      .mockResolvedValueOnce([{ id: 'step-1', stepKey: 's1' }])

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await OrchestratorService.plan('g1')

    // Goal-Updates: status=planning, danach status=awaiting_approval (NICHT running)
    const updateCalls = updateSetMock.mock.calls.map((c) => c[0] as Record<string, unknown>)
    const lastGoalUpdate = updateCalls[updateCalls.length - 1]
    expect(lastGoalUpdate.status).toBe('awaiting_approval')

    // KEIN task_queue-Insert
    const taskQueueInserts = insertValuesMock.mock.calls.filter((c) => {
      const v = c[0] as Record<string, unknown>
      return v.type === 'agent_step_run'
    })
    expect(taskQueueInserts).toHaveLength(0)
  })

  it('requirePlanApproval=false → Goal-Status=running, Steps werden gequeued (default-Pfad)', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'T', description: '', requirePlanApproval: false }])
    aiCompleteMock.mockResolvedValueOnce({
      text: '{"reasoning":"r","steps":[{"stepKey":"s1","workerType":"memory:list","config":{},"contextRefs":[],"dependsOnStepKeys":[]}]}',
      provider: 'm', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    })
    insertReturningMock
      .mockResolvedValueOnce([{ id: 'run-1' }])
      .mockResolvedValueOnce([{ id: 'step-1', stepKey: 's1' }])
      .mockResolvedValueOnce([{ id: 't1' }])

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await OrchestratorService.plan('g1')

    const updateCalls = updateSetMock.mock.calls.map((c) => c[0] as Record<string, unknown>)
    const lastGoalUpdate = updateCalls[updateCalls.length - 1]
    expect(lastGoalUpdate.status).toBe('running')
  })
})
```

- [ ] **Step 2: Test laufen — FAIL**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/unit/services/agents/orchestrator.approval-flow.test.ts`
Expected: 1 FAIL (default-Test passt schon, awaiting_approval-Test scheitert)

- [ ] **Step 3: orchestrator.service.ts plan() anpassen**

In `OrchestratorService.plan(goalId)`:
- Beim Goal-Lookup zusaetzlich `requirePlanApproval` selecten
- Steps wie bisher in DB schreiben (User soll Vorschau sehen!)
- Run-Status weiter auf `'executing'`
- Goal-Status: wenn `requirePlanApproval=true` → `'awaiting_approval'` statt `'running'`
- Wenn approval erforderlich: KEIN `taskQueue.insert` machen

```ts
// Ersetze diese Zeilen am Ende von plan():
//
//   await db.update(agentGoals).set({ status: 'running', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
//
//   const stepKeyToId = ...
//   const readySteps = ...
//   for (const s of readySteps) { ... taskQueue.insert ... }
//
// durch:

if (goal.requirePlanApproval) {
  await db.update(agentGoals).set({ status: 'awaiting_approval', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
  // KEIN Step-Queue. Wartet auf approve()
} else {
  await db.update(agentGoals).set({ status: 'running', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
  const stepKeyToId = new Map(insertedSteps.map((s) => [s.stepKey, s.id]))
  const readySteps = plan.steps.filter((s) => s.dependsOnStepKeys.length === 0)
  for (const s of readySteps) {
    const stepId = stepKeyToId.get(s.stepKey)
    if (!stepId) continue
    await db.insert(taskQueue).values({
      type: 'agent_step_run',
      status: 'pending',
      priority: 2,
      payload: { stepId, runId: run.id, goalId },
      referenceType: 'agent_step',
      referenceId: stepId,
    }).returning({ id: taskQueue.id })
  }
}
```

WICHTIG: Goal-Lookup-SELECT erweitern um `requirePlanApproval: agentGoals.requirePlanApproval`.

- [ ] **Step 4: Test PASS**

Expected: 2 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/orchestrator.service.ts \
        src/__tests__/unit/services/agents/orchestrator.approval-flow.test.ts
git commit -m "feat(agents): OrchestratorService.plan haelt bei requirePlanApproval=true an (awaiting_approval)"
```

---

### Task 6: GoalService.approve + reject + API-Routes

**Files:**
- Modify: `src/lib/services/agents/goal.service.ts`
- Modify: `src/__tests__/unit/services/agents/goal.service.test.ts`
- Create: `src/app/api/agents/goals/[id]/approve/route.ts`
- Create: `src/app/api/agents/goals/[id]/reject/route.ts`
- Create: `src/__tests__/unit/api/agents/approve-reject-route.test.ts`

- [ ] **Step 1: GoalService-Methoden hinzufuegen**

Am Ende des `GoalService`-Objekts in `src/lib/services/agents/goal.service.ts`:

```ts
async approve(goalId: string): Promise<{ runId: string; queuedSteps: number }> {
  const { db } = await import('@/lib/db')
  const { agentGoals, agentRuns, agentSteps, taskQueue } = await import('@/lib/db/schema')
  const { eq, and, sql, desc } = await import('drizzle-orm')
  const { logAgentEvent } = await import('./recovery/activity-log')

  const [goal] = await db.select({ status: agentGoals.status }).from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
  if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
  if (goal.status !== 'awaiting_approval') {
    throw new Error(`approve() nur fuer awaiting_approval Goals (aktuell: ${goal.status})`)
  }

  // Letzten Run finden
  const [run] = await db
    .select({ id: agentRuns.id })
    .from(agentRuns)
    .where(eq(agentRuns.goalId, goalId))
    .orderBy(desc(agentRuns.createdAt))
    .limit(1)
  if (!run) throw new Error(`Kein Run fuer Goal ${goalId} gefunden`)

  // Ready Steps queuen (depends_on leer)
  const readySteps = await db
    .select({ id: agentSteps.id, dependsOnStepKeys: agentSteps.dependsOnStepKeys })
    .from(agentSteps)
    .where(and(eq(agentSteps.runId, run.id), eq(agentSteps.status, 'pending')))

  let queued = 0
  for (const s of readySteps) {
    const deps = (s.dependsOnStepKeys as string[]) ?? []
    if (deps.length > 0) continue
    await db.insert(taskQueue).values({
      type: 'agent_step_run',
      status: 'pending',
      priority: 2,
      payload: { stepId: s.id, runId: run.id, goalId },
      referenceType: 'agent_step',
      referenceId: s.id,
    })
    queued += 1
  }

  await db.update(agentGoals).set({ status: 'running', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
  await logAgentEvent({ action: 'agent.run.recovered', goalId, runId: run.id, detail: `Plan freigegeben, ${queued} Step(s) gequeued` })
  return { runId: run.id, queuedSteps: queued }
},

async reject(goalId: string): Promise<void> {
  const { db } = await import('@/lib/db')
  const { agentGoals } = await import('@/lib/db/schema')
  const { eq, sql } = await import('drizzle-orm')
  const { logAgentEvent } = await import('./recovery/activity-log')

  const [goal] = await db.select({ status: agentGoals.status }).from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
  if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
  if (goal.status !== 'awaiting_approval') {
    throw new Error(`reject() nur fuer awaiting_approval Goals (aktuell: ${goal.status})`)
  }

  await db.update(agentGoals).set({ status: 'cancelled', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
  await logAgentEvent({ action: 'agent.goal.cancel_cleanup', goalId, detail: 'Plan abgelehnt' })
},
```

- [ ] **Step 2: Tests in goal.service.test.ts ergaenzen**

Zwei neue Tests:

```ts
it('approve() queued ready Steps + Goal auf running', async () => {
  selectLimitMock
    .mockResolvedValueOnce([{ id: 'g1', status: 'awaiting_approval' }])  // goal
    .mockResolvedValueOnce([{ id: 'run-1' }])                              // latest run
  // 3. select: agentSteps.where(and(...)) — direkt awaited, keine .limit()
  selectWhereMock
    .mockReturnValueOnce({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) })  // goal-Lookup
    .mockReturnValueOnce({ orderBy: vi.fn().mockReturnValue({ limit: selectLimitMock }) })     // latestRun
    .mockResolvedValueOnce([{ id: 's1', dependsOnStepKeys: [] }] as never)                     // readySteps

  const { GoalService } = await import('@/lib/services/agents/goal.service')
  const r = await GoalService.approve('g1')
  expect(r.queuedSteps).toBe(1)
  expect(updateSetMock).toHaveBeenCalled()
  const lastUpdate = updateSetMock.mock.calls[updateSetMock.mock.calls.length - 1]?.[0] as Record<string, unknown>
  expect(lastUpdate.status).toBe('running')
})

it('reject() setzt Goal auf cancelled', async () => {
  selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'awaiting_approval' }])
  const { GoalService } = await import('@/lib/services/agents/goal.service')
  await GoalService.reject('g1')
  const args = updateSetMock.mock.calls[0]?.[0] as Record<string, unknown>
  expect(args.status).toBe('cancelled')
})

it('approve() wirft wenn Goal nicht awaiting_approval', async () => {
  selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'running' }])
  const { GoalService } = await import('@/lib/services/agents/goal.service')
  await expect(GoalService.approve('g1')).rejects.toThrow(/awaiting_approval/)
})
```

- [ ] **Step 3: API-Routes**

`src/app/api/agents/goals/[id]/approve/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiError } from '@/lib/utils/api-response'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id: goalId } = await params

  try {
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    const r = await GoalService.approve(goalId)
    return NextResponse.json(r)
  } catch (e) {
    return apiError('BAD_REQUEST', (e as Error).message, 400)
  }
}
```

`src/app/api/agents/goals/[id]/reject/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiError } from '@/lib/utils/api-response'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id: goalId } = await params

  try {
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    await GoalService.reject(goalId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError('BAD_REQUEST', (e as Error).message, 400)
  }
}
```

- [ ] **Step 4: API-Test**

`src/__tests__/unit/api/agents/approve-reject-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) }))
vi.mock('@/lib/services/agents/goal.service', () => ({
  GoalService: {
    approve: vi.fn().mockResolvedValue({ runId: 'r1', queuedSteps: 2 }),
    reject: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('POST /api/agents/goals/[id]/approve', () => {
  beforeEach(() => vi.clearAllMocks())

  it('200 + queuedSteps zurueck', async () => {
    const { POST } = await import('@/app/api/agents/goals/[id]/approve/route')
    const res = await POST(new Request('http://x'), { params: Promise.resolve({ id: 'g1' }) })
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.queuedSteps).toBe(2)
  })

  it('400 wenn Goal nicht awaiting_approval', async () => {
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    ;(GoalService.approve as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('awaiting_approval'))
    const { POST } = await import('@/app/api/agents/goals/[id]/approve/route')
    const res = await POST(new Request('http://x'), { params: Promise.resolve({ id: 'g1' }) })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/agents/goals/[id]/reject', () => {
  beforeEach(() => vi.clearAllMocks())

  it('200', async () => {
    const { POST } = await import('@/app/api/agents/goals/[id]/reject/route')
    const res = await POST(new Request('http://x'), { params: Promise.resolve({ id: 'g1' }) })
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 5: Tests laufen**

Expected: alle PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/agents/goal.service.ts \
        src/__tests__/unit/services/agents/goal.service.test.ts \
        src/app/api/agents/goals \
        src/__tests__/unit/api/agents/approve-reject-route.test.ts
git commit -m "feat(agents): GoalService.approve+reject + /api/agents/goals/[id]/approve|reject"
```

---

### Task 7: Goal-Detail-View Approval-UI

**Files:**
- Modify: `src/components/agents/goals/goal-detail-view.tsx`

- [ ] **Step 1: Card fuer awaiting_approval anzeigen**

In `goal-detail-view.tsx` direkt unter dem Status-Header (vor den Steps):

```tsx
{data.goal.status === 'awaiting_approval' && (
  <Card className="border-yellow-500">
    <CardHeader>
      <CardTitle>Plan-Freigabe erforderlich</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Der Plan wurde erstellt und wartet auf deine Freigabe. Pruefe die Steps unten und entscheide:
      </p>
      <div className="flex gap-2">
        <Button onClick={async () => {
          const r = await fetch(`/api/agents/goals/${data.goal.id}/approve`, { method: 'POST' })
          if (r.ok) { toast.success('Plan freigegeben'); window.location.reload() }
          else toast.error(`Fehler: ${await r.text()}`)
        }}>Plan freigeben</Button>
        <Button variant="destructive" onClick={async () => {
          if (!confirm('Plan wirklich ablehnen? Goal wird abgebrochen.')) return
          const r = await fetch(`/api/agents/goals/${data.goal.id}/reject`, { method: 'POST' })
          if (r.ok) { toast.success('Plan abgelehnt'); window.location.reload() }
          else toast.error(`Fehler: ${await r.text()}`)
        }}>Ablehnen</Button>
      </div>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/agents/goals/goal-detail-view.tsx
git commit -m "feat(agents): Goal-Detail Plan-Freigabe-Card bei awaiting_approval"
```

---

### Task 8: NotificationService + Integration in OrchestratorService.replan

**Files:**
- Create: `src/lib/services/agents/notification.service.ts`
- Test: `src/__tests__/unit/services/agents/notification.service.test.ts`
- Modify: `src/lib/services/agents/orchestrator.service.ts`

- [ ] **Step 1: NotificationService**

`src/lib/services/agents/notification.service.ts`:

```ts
/**
 * Mini-Wrapper um EmailService fuer Agent-Goal-Terminal-Notifications.
 * Gold rule: Notification-Fehler darf Goal-Done nicht blockieren — wir schlucken
 * Exceptions und loggen sie ueber den normalen Logger.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §8 (Phase 8)
 */

import { logger } from '@/lib/utils/logger'

export interface NotifyGoalTerminalInput {
  goalId: string
  goalTitle: string
  status: 'done' | 'failed'
  summary?: string
  runId?: string
}

export const AgentNotificationService = {
  async notifyGoalTerminal(input: NotifyGoalTerminalInput): Promise<{ sent: boolean; error?: string }> {
    try {
      const { EmailService } = await import('@/lib/services/email.service')
      const recipient = await EmailService.resolveAdminRecipient()
      if (!recipient) {
        logger.warn('AgentNotification: kein Admin-Empfaenger ermittelbar', { module: 'AgentNotification' })
        return { sent: false, error: 'no_admin_recipient' }
      }

      const subject = input.status === 'done'
        ? `Agent-Goal abgeschlossen: ${input.goalTitle}`
        : `Agent-Goal fehlgeschlagen: ${input.goalTitle}`
      const body = `Goal-ID: ${input.goalId}\nStatus: ${input.status}\n` +
        (input.runId ? `Run-ID: ${input.runId}\n` : '') +
        `\n${input.summary ?? '(keine Zusammenfassung)'}\n\n` +
        `Detail: /intern/agents/goals/${input.goalId}`

      const result = await EmailService.send({ to: recipient, subject, body })
      return { sent: result.success, error: result.error }
    } catch (e) {
      const msg = (e as Error).message
      logger.error(`AgentNotification fehlgeschlagen: ${msg}`, e, { module: 'AgentNotification' })
      return { sent: false, error: msg }
    }
  },
}
```

- [ ] **Step 2: Test**

`src/__tests__/unit/services/agents/notification.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMock = vi.fn()
const resolveAdminMock = vi.fn()
vi.mock('@/lib/services/email.service', () => ({
  EmailService: { send: sendMock, resolveAdminRecipient: resolveAdminMock },
}))

describe('AgentNotificationService.notifyGoalTerminal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sendet Email an Admin', async () => {
    resolveAdminMock.mockResolvedValueOnce('admin@example.com')
    sendMock.mockResolvedValueOnce({ success: true, messageId: 'msg-1' })
    const { AgentNotificationService } = await import('@/lib/services/agents/notification.service')
    const r = await AgentNotificationService.notifyGoalTerminal({
      goalId: 'g1', goalTitle: 'Test-Goal', status: 'done', summary: 'fertig',
    })
    expect(r.sent).toBe(true)
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'admin@example.com',
      subject: expect.stringContaining('Test-Goal'),
    }))
  })

  it('liefert sent=false wenn kein Admin-Recipient', async () => {
    resolveAdminMock.mockResolvedValueOnce(null)
    const { AgentNotificationService } = await import('@/lib/services/agents/notification.service')
    const r = await AgentNotificationService.notifyGoalTerminal({
      goalId: 'g1', goalTitle: 'T', status: 'failed',
    })
    expect(r.sent).toBe(false)
    expect(r.error).toBe('no_admin_recipient')
  })

  it('schluckt Exceptions im EmailService', async () => {
    resolveAdminMock.mockRejectedValueOnce(new Error('SMTP down'))
    const { AgentNotificationService } = await import('@/lib/services/agents/notification.service')
    const r = await AgentNotificationService.notifyGoalTerminal({
      goalId: 'g1', goalTitle: 'T', status: 'done',
    })
    expect(r.sent).toBe(false)
    expect(r.error).toMatch(/SMTP/)
  })
})
```

- [ ] **Step 3: orchestrator.service.ts replan() integriert Notification**

In `OrchestratorService.replan(runId)` an den zwei Stellen wo das Goal terminal wird (action='goal_complete' und action='fail'):

```ts
// Vor dem Return bei goal_complete:
const { AgentNotificationService } = await import('./notification.service')
void AgentNotificationService.notifyGoalTerminal({
  goalId: run.goalId,
  goalTitle: goal.title,
  status: 'done',
  summary: decision.reasoning,
  runId,
})
return { action: 'goal_complete', reason: decision.reasoning }

// Analog bei fail (vor dem fail-Return):
const { AgentNotificationService } = await import('./notification.service')
void AgentNotificationService.notifyGoalTerminal({
  goalId: run.goalId,
  goalTitle: goal.title,
  status: 'failed',
  summary: decision.reasoning,
  runId,
})
return { action: 'fail', reason: decision.reasoning }
```

`void` damit der Notification-Call den Return nicht blockiert (fire-and-forget). Notification-Service schluckt Fehler intern.

- [ ] **Step 4: Tests**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/unit/services/agents/notification.service.test.ts`
Expected: 3 PASS

Bestehende Orchestrator-Tests laufen lassen (kein Regress wegen `void`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/notification.service.ts \
        src/__tests__/unit/services/agents/notification.service.test.ts \
        src/lib/services/agents/orchestrator.service.ts
git commit -m "feat(agents): AgentNotificationService + Email-Send bei goal_complete/fail"
```

---

### Task 9: Performance-Polish (Index + useMemo)

**Files:**
- Create: `src/lib/db/migrations/023_agent_cost_events_index.sql`
- Modify: `src/lib/db/migrations/index.ts`
- Modify: `src/components/agents/runs/run-dag-view.tsx`

- [ ] **Step 1: Migration 023**

`src/lib/db/migrations/023_agent_cost_events_index.sql`:

```sql
-- =============================================
-- 023: Agent-System Phase 8 — Performance-Index
-- =============================================
-- B-Tree-Index auf occurred_at descending fuer "last 7/30 days"-Aggregat-Queries.

CREATE INDEX IF NOT EXISTS idx_agent_cost_events_occurred_desc
  ON agent_cost_events (occurred_at DESC);
```

- [ ] **Step 2: Migration-Index**

In `src/lib/db/migrations/index.ts` anhaengen:

```ts
  {
    name: '023_agent_cost_events_index.sql',
    description: 'Agent-System Phase 8: Performance-Index auf agent_cost_events.occurred_at DESC',
  },
```

- [ ] **Step 3: useMemo um computeDagLayout**

In `src/components/agents/runs/run-dag-view.tsx`, in der `RunDagView`-Component:

```tsx
import { useMemo } from 'react'
// ...
export function RunDagView({ steps }: { steps: DagStep[] }) {
  const layout = useMemo(() => computeDagLayout(steps), [steps])
  // ... rest unveraendert
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/migrations/023_agent_cost_events_index.sql \
        src/lib/db/migrations/index.ts \
        src/components/agents/runs/run-dag-view.tsx
git commit -m "perf(agents): Index auf agent_cost_events.occurred_at + useMemo um DAG-Layout"
```

---

### Task 10: Re-Exports

**Files:**
- Modify: `src/lib/services/agents/index.ts`

- [ ] **Step 1: Re-Exports ergaenzen**

```ts
export { TemplateService } from './template.service'
export { AgentNotificationService } from './notification.service'
export type { NotifyGoalTerminalInput } from './notification.service'
```

- [ ] **Step 2: Typecheck + Commit**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`

```bash
git add src/lib/services/agents/index.ts
git commit -m "feat(agents): Re-Exports fuer Phase-8 Services"
```

---

### Task 11: Final-Verification

- [ ] **Step 1: Type-Check**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`
Expected: 0 Fehler

- [ ] **Step 2: Volle Vitest-Suite**

Run: `node node_modules/vitest/vitest.mjs run`
Expected: alle PASS, neue Tests gruen

- [ ] **Step 3: DoD-Check**

| DoD aus Spec §7.3 / Phase 8 | Pruefung |
|---|---|
| `requirePlanApproval`-Toggle in UI | Task 4 ✅ |
| Approval-Pfad: planning → awaiting_approval → running (nach Approve) | Task 5 + 6 ✅ |
| Goal-Templates verwaltbar | Task 1 (Schema), Task 3 (API) ✅ |
| 3 Default-Templates geseedet | Task 1 ✅ |
| Notification bei Goal-Done/Failed | Task 8 ✅ |
| Performance-Tuning | Task 9 ✅ |

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/agents-polish
```

PR-Titel: `feat(agents): Phase 8 — Approval-Flow + Goal-Templates + Notifications + Polish`

---

## Self-Review

**1. Spec coverage:**
- §6.1 `awaiting_approval`-Status existierte bereits, wird jetzt in der Logik genutzt ✅
- §7.3 Approval-Flow komplett (UI + Service + API) ✅
- §8 Phase 8 Punkte (4): Approval ✅, Templates ✅, Notification ✅, Performance ✅

**2. Placeholder-Scan:** Keine TBD/TODO. Alle Tests + Code vollstaendig.

**3. Type-Konsistenz:**
- `agentGoalTemplates.$inferSelect` als `AgentGoalTemplate` exportiert + in template.service.ts verwendet ✅
- `NotifyGoalTerminalInput` interface in notification.service.ts + Re-Export ✅
- `GoalService.approve` Return-Type `{ runId: string; queuedSteps: number }` matched API-Response ✅

**Out-of-scope (nach Phase 8 — Folge-Improvements):**
- Pricing-Tabelle pro Provider/Modell (kommt mit echten cost-Daten)
- contextRefs Zod-Schema mit memory:// Regex
- Live-WebSocket-Events (Realtime-Layer)
- Approval-Token-Email (statt nur UI-Buttons)
- Template-Editor in UI (heute nur via SQL/Migration pflegbar)

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-08-agents-phase-8-polish.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Ein frischer Subagent pro Task, Reviews dazwischen, schnelle Iteration.

**2. Inline Execution** — Tasks in dieser Session per executing-plans, Batch-Execution mit Checkpoints.

**Welcher Ansatz?**
