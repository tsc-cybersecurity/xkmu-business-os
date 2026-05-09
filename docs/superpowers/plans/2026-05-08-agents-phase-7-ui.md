# Agent-System Phase 7 — UI-Komplettierung

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Komplette UI fuer das Agent-Subsystem unter `/intern/agents/...` so dass das Feature ohne SQL-Inserts bedienbar ist. Fuenf neue Pages (Dashboard, Run-Detail mit DAG, Memory-Editor, Definitions, Cost-Analytics), drei neue Komponenten (RunDagView, CostChart, MarkdownEditor), Manual-Trigger-Buttons (Step wiederholen / Re-Plan jetzt / Goal-jetzt-ausfuehren), Cost-Analytics mit Recharts. Polling-Strategie ueberall (kein Realtime-Layer noetig).

**Architecture:**
- **Routen:** `/intern/agents` (Dashboard mit aktiven Goals + 5-min-Cost-Trend), `/intern/agents/runs/[id]` (DAG-Visualisierung + Step-Cards + Cost-Breakdown), erweiterung auf `/intern/agents/memory/[scope]/edit` (Markdown-Editor), `/intern/agents/definitions` (Smart-Worker-Definitions verwalten), `/intern/agents/cost` (Recharts-Analytics).
- **DAG-Visualisierung:** SVG-Render aus `agentSteps` mit `dependsOnStepKeys` als Kanten — keine externe Lib (zu schwer fuer 1-15 Steps), eigener layered-graph-layouter (depth-Berechnung via topo-sort, dann pro Layer horizontal verteilen). Status-Farben pro Step.
- **Cost-Analytics:** Recharts (schon installiert). Drei Charts: Cost-pro-Tag (Bar), Cost-pro-Goal (Bar), Cost-pro-Modell (Pie). API liefert pre-aggregierte Daten — kein Roh-Event-Transfer.
- **Manual-Trigger-Buttons:** drei neue API-Endpoints `/api/agents/runs/[id]/replan-now`, `/api/agents/steps/[id]/retry`, `/api/agents/goals/[id]/run-immediate`. Alle inserten passenden Task-Queue-Eintrag mit `priority=1`.
- **Markdown-Editor:** Plain `<textarea>` + Live-Preview via existing `react-markdown` (in elearning verwendet). Kein TipTap (waere overkill fuer Memory-Files). Save via `PATCH /api/agents/memory?scope=...`.
- **Polling:** Goal-Detail bereits 5s-Polling (Phase 4). Run-Detail-Page erbt das, Dashboard nutzt 30s-Polling. Cost-Analytics laed einmalig (kein Auto-Refresh).

**Tech Stack:** Next.js 16 App Router, React 19, shadcn/ui (Card/Badge/Button bereits etabliert), Recharts 3.7 (installed), react-markdown 10.1 (installed). Keine neuen Dependencies.

**Spec-Referenz:** `docs/superpowers/specs/2026-05-08-agent-system-design.md` §7 (UI / User-Touchpoints) + §7.4 (Manual-Trigger-Hooks).

**Vorbedingungen:** Phasen 1-6 gemerged. Migrationen 020 + 021 ausgefuehrt. Recovery-Loop laeuft. Goals + Memory APIs sind bereits da. Branch dieser Phase: `feat/agents-ui`.

---

## File Structure

**Neue Pages unter `src/app/intern/(dashboard)/agents/`:**
- `page.tsx` — Dashboard (Server-Component)
- `runs/[id]/page.tsx` — Run-Detail (Server-Component, gibt runId an Client-View)
- `definitions/page.tsx` — Definitions-Liste
- `definitions/[id]/page.tsx` — Definition-Detail (Edit/View)
- `definitions/new/page.tsx` — neue Definition anlegen
- `cost/page.tsx` — Cost-Analytics
- `memory/[scope]/edit/page.tsx` — Memory-Edit-Page

**Neue Components unter `src/components/agents/`:**
- `dashboard/dashboard-view.tsx` — aktive Goals + Cost-Sparkline
- `runs/run-detail-view.tsx` — Wrap-Component mit Polling
- `runs/run-dag-view.tsx` — SVG-DAG
- `runs/run-cost-breakdown.tsx` — Cost pro Step + LLM-Call
- `runs/manual-triggers.tsx` — Buttons fuer replan-now/retry/run-immediate
- `definitions/definitions-list.tsx`
- `definitions/definition-form.tsx` — System-Prompt-Editor + allowedTools-Picker
- `cost/cost-charts.tsx` — Recharts-Wrapper
- `memory/markdown-editor.tsx` — Textarea + Live-Preview

**Modifiziert:**
- `src/components/agents/goals/goal-detail-view.tsx` — Link auf `/intern/agents/runs/[id]` einfuegen + ManualTriggers-Buttons
- `src/components/agents/memory/memory-entry-card.tsx` — Link auf `/intern/agents/memory/[scope]/edit` einfuegen wenn `MemoryService.write` erlaubt ist
- `src/lib/services/agents/index.ts` — keine Aenderung noetig (alle benoetigten Services sind schon exportiert)

**Neue API-Routes unter `src/app/api/agents/`:**
- `runs/[id]/route.ts` — `GET` Run-Detail (run + steps + cost-events) + Polling-Cache-Headers
- `runs/[id]/replan-now/route.ts` — `POST` queued sofortiges agent_replan
- `steps/[id]/retry/route.ts` — `POST` setzt Step auf pending + queued agent_step_run
- `goals/[id]/run-immediate/route.ts` — `POST` setzt executionMode=immediate + queued sofortiges agent_replan
- `definitions/route.ts` — `GET` (list) + `POST` (create)
- `definitions/[id]/route.ts` — `GET` + `PATCH` + `DELETE` (soft via isActive=false)
- `cost/route.ts` — `GET` aggregierte Cost-Daten (groupBy=day|goal|model, range=7d|30d)
- `memory/route.ts` — `PATCH` mit `?scope=...` (Memory-Edit) — falls noch nicht da, sonst erweitern

**Neue Tests:**
- Reine UI-Smoke-Tests (Render-Tests via React Testing Library, Mocks fuer fetch)
- API-Routes mit kleinen Integration-Tests pro Endpoint
- Konkret:
  - `src/__tests__/unit/components/agents/runs/run-dag-view.test.tsx` (Layered-Graph-Layout)
  - `src/__tests__/unit/services/agents/cost-aggregation.test.ts` (Aggregat-Helper)
  - `src/__tests__/unit/api/agents/runs-replan-now.test.ts`
  - `src/__tests__/unit/api/agents/steps-retry.test.ts`
  - `src/__tests__/unit/api/agents/cost-route.test.ts`
  - `src/__tests__/unit/api/agents/definitions-route.test.ts`

---

### Task 1: Service-Helper Cost-Aggregation

Vor der UI: ein kleiner Service-Helper aggregiert `agent_cost_events` so dass die Cost-Page nur fertige Daten holt. Spart UI-seitiges Aggregieren und macht den API-Endpoint testbar.

**Files:**
- Create: `src/lib/services/agents/cost-aggregation.service.ts`
- Test: `src/__tests__/unit/services/agents/cost-aggregation.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/cost-aggregation.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const dbExecuteMock = vi.fn()
vi.mock('@/lib/db', () => ({ db: { execute: dbExecuteMock } }))

describe('CostAggregation.byDay', () => {
  beforeEach(() => vi.clearAllMocks())

  it('liefert Tages-Buckets mit gesamt + tokens + cents', async () => {
    dbExecuteMock.mockResolvedValueOnce([
      { day: '2026-05-01', totalCents: 50, totalTokens: '1234', callCount: '5' },
      { day: '2026-05-02', totalCents: 80, totalTokens: '2000', callCount: '8' },
    ])
    const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
    const r = await CostAggregation.byDay({ rangeDays: 7 })
    expect(r).toEqual([
      { day: '2026-05-01', totalCents: 50, totalTokens: 1234, callCount: 5 },
      { day: '2026-05-02', totalCents: 80, totalTokens: 2000, callCount: 8 },
    ])
  })

  it('range=7 default', async () => {
    dbExecuteMock.mockResolvedValueOnce([])
    const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
    await CostAggregation.byDay()
    // Pruefen, dass eine SQL-Query abgesetzt wurde (range=7 default)
    expect(dbExecuteMock).toHaveBeenCalled()
  })
})

describe('CostAggregation.byGoal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('liefert Goals nach Cost sortiert', async () => {
    dbExecuteMock.mockResolvedValueOnce([
      { goalId: 'g1', goalTitle: 'A', totalCents: 100, totalTokens: '5000' },
      { goalId: 'g2', goalTitle: 'B', totalCents: 30, totalTokens: '1000' },
    ])
    const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
    const r = await CostAggregation.byGoal({ limit: 10 })
    expect(r[0].goalId).toBe('g1')
    expect(r[0].totalTokens).toBe(5000)
  })
})

describe('CostAggregation.byModel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Gruppiert nach Provider+Modell', async () => {
    dbExecuteMock.mockResolvedValueOnce([
      { provider: 'gemini', model: 'gemini-2.5-flash', totalCents: 60, totalTokens: '3000', callCount: '20' },
    ])
    const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
    const r = await CostAggregation.byModel()
    expect(r[0].provider).toBe('gemini')
    expect(r[0].callCount).toBe(20)
  })
})
```

- [ ] **Step 2: Test laufen — FAIL**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/unit/services/agents/cost-aggregation.test.ts`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementation**

`src/lib/services/agents/cost-aggregation.service.ts`:

```ts
/**
 * Aggregiert agent_cost_events fuer die Cost-Analytics-UI.
 * Liefert pre-aggregierte Buckets (Tag/Goal/Modell), nicht Roh-Events.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §7.1 (cost page)
 */

export interface CostByDayRow {
  day: string
  totalCents: number
  totalTokens: number
  callCount: number
}

export interface CostByGoalRow {
  goalId: string
  goalTitle: string
  totalCents: number
  totalTokens: number
}

export interface CostByModelRow {
  provider: string
  model: string
  totalCents: number
  totalTokens: number
  callCount: number
}

export const CostAggregation = {
  async byDay(opts: { rangeDays?: number } = {}): Promise<CostByDayRow[]> {
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')
    const range = opts.rangeDays ?? 7
    const rows = (await db.execute(sql`
      SELECT
        TO_CHAR(date_trunc('day', occurred_at), 'YYYY-MM-DD') AS "day",
        COALESCE(SUM(cost_cents), 0)::int AS "totalCents",
        COALESCE(SUM(input_tokens + output_tokens), 0)::text AS "totalTokens",
        COUNT(*)::text AS "callCount"
      FROM agent_cost_events
      WHERE occurred_at >= NOW() - (${range}::int * INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1 ASC
    `)) as unknown as Array<{ day: string; totalCents: number; totalTokens: string; callCount: string }>
    return rows.map((r) => ({
      day: r.day,
      totalCents: Number(r.totalCents),
      totalTokens: Number(r.totalTokens),
      callCount: Number(r.callCount),
    }))
  },

  async byGoal(opts: { limit?: number; rangeDays?: number } = {}): Promise<CostByGoalRow[]> {
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')
    const limit = opts.limit ?? 10
    const range = opts.rangeDays ?? 30
    const rows = (await db.execute(sql`
      SELECT
        c.goal_id AS "goalId",
        g.title AS "goalTitle",
        COALESCE(SUM(c.cost_cents), 0)::int AS "totalCents",
        COALESCE(SUM(c.input_tokens + c.output_tokens), 0)::text AS "totalTokens"
      FROM agent_cost_events c
      LEFT JOIN agent_goals g ON g.id = c.goal_id
      WHERE c.occurred_at >= NOW() - (${range}::int * INTERVAL '1 day')
        AND c.goal_id IS NOT NULL
      GROUP BY c.goal_id, g.title
      ORDER BY "totalCents" DESC
      LIMIT ${limit}
    `)) as unknown as Array<{ goalId: string; goalTitle: string | null; totalCents: number; totalTokens: string }>
    return rows.map((r) => ({
      goalId: r.goalId,
      goalTitle: r.goalTitle ?? '(geloescht)',
      totalCents: Number(r.totalCents),
      totalTokens: Number(r.totalTokens),
    }))
  },

  async byModel(opts: { rangeDays?: number } = {}): Promise<CostByModelRow[]> {
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')
    const range = opts.rangeDays ?? 30
    const rows = (await db.execute(sql`
      SELECT
        provider, model,
        COALESCE(SUM(cost_cents), 0)::int AS "totalCents",
        COALESCE(SUM(input_tokens + output_tokens), 0)::text AS "totalTokens",
        COUNT(*)::text AS "callCount"
      FROM agent_cost_events
      WHERE occurred_at >= NOW() - (${range}::int * INTERVAL '1 day')
      GROUP BY provider, model
      ORDER BY "totalCents" DESC
    `)) as unknown as Array<{ provider: string; model: string; totalCents: number; totalTokens: string; callCount: string }>
    return rows.map((r) => ({
      provider: r.provider,
      model: r.model,
      totalCents: Number(r.totalCents),
      totalTokens: Number(r.totalTokens),
      callCount: Number(r.callCount),
    }))
  },
}
```

- [ ] **Step 4: Test laufen — PASS**

Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/cost-aggregation.service.ts \
        src/__tests__/unit/services/agents/cost-aggregation.test.ts
git commit -m "feat(agents): CostAggregation-Service (byDay/byGoal/byModel)"
```

---

### Task 2: API-Route /api/agents/cost

**Files:**
- Create: `src/app/api/agents/cost/route.ts`
- Test: `src/__tests__/unit/api/agents/cost-route.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/api/agents/cost-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'admin' } }),
}))
vi.mock('@/lib/services/agents/cost-aggregation.service', () => ({
  CostAggregation: {
    byDay: vi.fn().mockResolvedValue([{ day: '2026-05-09', totalCents: 50, totalTokens: 1000, callCount: 5 }]),
    byGoal: vi.fn().mockResolvedValue([]),
    byModel: vi.fn().mockResolvedValue([]),
  },
}))

describe('GET /api/agents/cost', () => {
  beforeEach(() => vi.clearAllMocks())

  it('default: liefert byDay+byGoal+byModel', async () => {
    const { GET } = await import('@/app/api/agents/cost/route')
    const req = new Request('http://x/api/agents/cost')
    const res = await GET(req as unknown as import('next/server').NextRequest)
    const data = await res.json()
    expect(data.byDay).toHaveLength(1)
    expect(data.byGoal).toEqual([])
    expect(data.byModel).toEqual([])
  })

  it('range-Param wird an Aggregation weitergereicht', async () => {
    const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
    const { GET } = await import('@/app/api/agents/cost/route')
    const req = new Request('http://x/api/agents/cost?range=30')
    await GET(req as unknown as import('next/server').NextRequest)
    expect(CostAggregation.byDay).toHaveBeenCalledWith({ rangeDays: 30 })
    expect(CostAggregation.byGoal).toHaveBeenCalledWith({ rangeDays: 30, limit: 10 })
    expect(CostAggregation.byModel).toHaveBeenCalledWith({ rangeDays: 30 })
  })

  it('ohne Session: 401', async () => {
    const { getSession } = await import('@/lib/auth/session')
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/agents/cost/route')
    const req = new Request('http://x/api/agents/cost')
    const res = await GET(req as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Implementation**

`src/app/api/agents/cost/route.ts`:

```ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/api/error-responses'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const url = new URL(req.url)
  const rangeRaw = Number(url.searchParams.get('range') ?? '7')
  const rangeDays = Number.isFinite(rangeRaw) ? Math.max(1, Math.min(90, Math.trunc(rangeRaw))) : 7

  const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
  const [byDay, byGoal, byModel] = await Promise.all([
    CostAggregation.byDay({ rangeDays }),
    CostAggregation.byGoal({ rangeDays, limit: 10 }),
    CostAggregation.byModel({ rangeDays }),
  ])

  return NextResponse.json({ byDay, byGoal, byModel, rangeDays })
}
```

- [ ] **Step 3: Test laufen — PASS**

- [ ] **Step 4: Commit**

```bash
git add src/app/api/agents/cost/route.ts \
        src/__tests__/unit/api/agents/cost-route.test.ts
git commit -m "feat(agents): GET /api/agents/cost mit Aggregation"
```

---

### Task 3: Cost-Charts-Component + Cost-Page

**Files:**
- Create: `src/components/agents/cost/cost-charts.tsx`
- Create: `src/app/intern/(dashboard)/agents/cost/page.tsx`

- [ ] **Step 1: Component**

`src/components/agents/cost/cost-charts.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CostData {
  byDay: Array<{ day: string; totalCents: number; totalTokens: number; callCount: number }>
  byGoal: Array<{ goalId: string; goalTitle: string; totalCents: number; totalTokens: number }>
  byModel: Array<{ provider: string; model: string; totalCents: number; totalTokens: number; callCount: number }>
  rangeDays: number
}

const PIE_COLORS = ['#0ea5e9', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#6366f1']

export function CostCharts() {
  const [data, setData] = useState<CostData | null>(null)
  const [range, setRange] = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/agents/cost?range=${range}`)
      .then((r) => r.json())
      .then((j) => { if (alive) { setData(j); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [range])

  if (loading) return <div className="text-sm text-muted-foreground">Lade Kosten-Daten...</div>
  if (!data) return <div className="text-sm text-destructive">Keine Daten</div>

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[7, 30, 90].map((r) => (
          <Button key={r} size="sm" variant={range === r ? 'default' : 'outline'} onClick={() => setRange(r)}>
            Letzte {r} Tage
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Kosten pro Tag (Cent)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalCents" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top-10 Goals nach Kosten</CardTitle></CardHeader>
        <CardContent>
          {data.byGoal.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine Cost-Events im Zeitraum</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, data.byGoal.length * 40)}>
              <BarChart data={data.byGoal} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="goalTitle" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="totalCents" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Modell-Verteilung</CardTitle></CardHeader>
        <CardContent>
          {data.byModel.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine Calls im Zeitraum</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.byModel}
                  dataKey="callCount"
                  nameKey="model"
                  outerRadius={100}
                  label={(entry) => `${entry.model} (${entry.callCount})`}
                >
                  {data.byModel.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Page**

`src/app/intern/(dashboard)/agents/cost/page.tsx`:

```tsx
import { CostCharts } from '@/components/agents/cost/cost-charts'

export const dynamic = 'force-dynamic'

export default function CostPage() {
  return (
    <div className="container py-6 space-y-4">
      <h1 className="text-2xl font-bold">Agent-Kosten</h1>
      <p className="text-muted-foreground">Cost-Analytics ueber alle Agent-Runs.</p>
      <CostCharts />
    </div>
  )
}
```

- [ ] **Step 3: Manueller Browser-Test**

Run: `pnpm dev`, navigieren zu `http://localhost:3000/intern/agents/cost`. Erwartet: drei Charts (auch wenn leer), Range-Toggle 7/30/90 funktioniert.

- [ ] **Step 4: Commit**

```bash
git add src/components/agents/cost/cost-charts.tsx \
        src/app/intern/\(dashboard\)/agents/cost/page.tsx
git commit -m "feat(agents): /intern/agents/cost mit Recharts (3 Charts + Range-Toggle)"
```

---

### Task 4: API /api/agents/runs/[id]

**Files:**
- Create: `src/app/api/agents/runs/[id]/route.ts`
- Test: `src/__tests__/unit/api/agents/runs-detail-route.test.ts`

- [ ] **Step 1: Test**

`src/__tests__/unit/api/agents/runs-detail-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) }))

const dbExecuteMock = vi.fn()
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
vi.mock('@/lib/db', () => ({ db: { execute: dbExecuteMock, select: selectMock } }))
vi.mock('@/lib/db/schema', () => ({
  agentRuns: { id: 'id' },
  agentSteps: { runId: 'runId', createdAt: 'createdAt' },
  agentCostEvents: { runId: 'runId' },
}))

describe('GET /api/agents/runs/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('liefert run + steps + costEvents fuer existierenden Run', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'executing' }])
    // selectWhereMock direkt awaited fuer Steps + CostEvents
    selectWhereMock
      .mockReturnValueOnce({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }) // run-Lookup
      .mockReturnValueOnce({ orderBy: vi.fn().mockResolvedValue([{ id: 's1', stepKey: 'a', status: 'succeeded' }]) }) // steps
      .mockReturnValueOnce({ orderBy: vi.fn().mockResolvedValue([{ id: 'c1', model: 'gemini-flash', costCents: 5 }]) }) // costEvents

    const { GET } = await import('@/app/api/agents/runs/[id]/route')
    const res = await GET(new Request('http://x/api/agents/runs/r1'), { params: Promise.resolve({ id: 'r1' }) })
    const j = await res.json()
    expect(j.run.id).toBe('r1')
    expect(j.steps).toHaveLength(1)
    expect(j.costEvents).toHaveLength(1)
  })

  it('404 wenn Run nicht existiert', async () => {
    selectLimitMock.mockResolvedValueOnce([])
    const { GET } = await import('@/app/api/agents/runs/[id]/route')
    const res = await GET(new Request('http://x/api/agents/runs/rX'), { params: Promise.resolve({ id: 'rX' }) })
    expect(res.status).toBe(404)
  })

  it('ohne Session 401', async () => {
    const { getSession } = await import('@/lib/auth/session')
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/agents/runs/[id]/route')
    const res = await GET(new Request('http://x/api/agents/runs/r1'), { params: Promise.resolve({ id: 'r1' }) })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Implementation**

`src/app/api/agents/runs/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiNotFound } from '@/lib/api/error-responses'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const { id: runId } = await params

  const { db } = await import('@/lib/db')
  const { agentRuns, agentSteps, agentCostEvents } = await import('@/lib/db/schema')
  const { eq, asc } = await import('drizzle-orm')

  const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, runId)).limit(1)
  if (!run) return apiNotFound('Run nicht gefunden')

  const steps = await db.select().from(agentSteps).where(eq(agentSteps.runId, runId)).orderBy(asc(agentSteps.createdAt))
  const costEvents = await db.select().from(agentCostEvents).where(eq(agentCostEvents.runId, runId)).orderBy(asc(agentCostEvents.occurredAt))

  return NextResponse.json({ run, steps, costEvents })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/agents/runs/[id]/route.ts \
        src/__tests__/unit/api/agents/runs-detail-route.test.ts
git commit -m "feat(agents): GET /api/agents/runs/[id] mit Steps + Cost-Events"
```

---

### Task 5: RunDagView (SVG-Layout)

**Files:**
- Create: `src/components/agents/runs/run-dag-view.tsx`
- Test: `src/__tests__/unit/components/agents/runs/run-dag-view.test.tsx`

- [ ] **Step 1: Test fuer Layered-Layout-Logic**

Wir testen die reine Layout-Logik (Topo-Sort + Depth-Berechnung) als pure Function, damit wir kein DOM brauchen.

`src/components/agents/runs/run-dag-view.tsx` exportiert eine pure helper-function `computeDagLayout`. Test-Datei:

`src/__tests__/unit/components/agents/runs/run-dag-view.test.tsx`:

```ts
import { describe, it, expect } from 'vitest'
import { computeDagLayout } from '@/components/agents/runs/run-dag-view'

describe('computeDagLayout', () => {
  it('einzelner Step ohne Deps -> Layer 0', () => {
    const r = computeDagLayout([{ id: 's1', stepKey: 'a', dependsOnStepKeys: [] }])
    expect(r['s1']).toEqual({ layer: 0, indexInLayer: 0 })
  })

  it('zwei parallele Steps -> Layer 0, indexInLayer 0+1', () => {
    const r = computeDagLayout([
      { id: 's1', stepKey: 'a', dependsOnStepKeys: [] },
      { id: 's2', stepKey: 'b', dependsOnStepKeys: [] },
    ])
    expect(r['s1'].layer).toBe(0)
    expect(r['s2'].layer).toBe(0)
    expect([r['s1'].indexInLayer, r['s2'].indexInLayer].sort()).toEqual([0, 1])
  })

  it('linearer Plan a->b->c -> Layer 0,1,2', () => {
    const r = computeDagLayout([
      { id: 's1', stepKey: 'a', dependsOnStepKeys: [] },
      { id: 's2', stepKey: 'b', dependsOnStepKeys: ['a'] },
      { id: 's3', stepKey: 'c', dependsOnStepKeys: ['b'] },
    ])
    expect(r['s1'].layer).toBe(0)
    expect(r['s2'].layer).toBe(1)
    expect(r['s3'].layer).toBe(2)
  })

  it('diamond a->b,a->c,b+c->d -> Layer 0,1,1,2', () => {
    const r = computeDagLayout([
      { id: 'sa', stepKey: 'a', dependsOnStepKeys: [] },
      { id: 'sb', stepKey: 'b', dependsOnStepKeys: ['a'] },
      { id: 'sc', stepKey: 'c', dependsOnStepKeys: ['a'] },
      { id: 'sd', stepKey: 'd', dependsOnStepKeys: ['b', 'c'] },
    ])
    expect(r['sa'].layer).toBe(0)
    expect(r['sb'].layer).toBe(1)
    expect(r['sc'].layer).toBe(1)
    expect(r['sd'].layer).toBe(2)
  })

  it('toleriert unbekannte deps (legt Step trotzdem ab)', () => {
    const r = computeDagLayout([
      { id: 's1', stepKey: 'a', dependsOnStepKeys: ['ghost'] },
    ])
    expect(r['s1'].layer).toBe(0) // unbekannte Deps werden als 0 gewertet
  })
})
```

- [ ] **Step 2: Implementation**

`src/components/agents/runs/run-dag-view.tsx`:

```tsx
'use client'

interface DagStep {
  id: string
  stepKey: string
  workerType?: string
  status?: string
  dependsOnStepKeys: string[]
  resultSummary?: string | null
}

export interface DagLayout {
  layer: number
  indexInLayer: number
}

/**
 * Berechnet pro Step Layer (depth) + indexInLayer fuer eine deterministische
 * Layered-Graph-Visualisierung. Zyklen werden defensiv geclamped (max 100 Iterationen).
 */
export function computeDagLayout(steps: DagStep[]): Record<string, DagLayout> {
  const keyToId: Record<string, string> = {}
  for (const s of steps) keyToId[s.stepKey] = s.id

  const layer: Record<string, number> = {}
  // Initial: Steps ohne Deps oder mit nur unbekannten Deps -> 0
  for (const s of steps) layer[s.id] = 0

  // Iterative Tiefen-Update (Bellman-aehnlich) bis Stabilitaet
  for (let iter = 0; iter < 100; iter++) {
    let changed = false
    for (const s of steps) {
      let max = 0
      for (const dep of s.dependsOnStepKeys) {
        const depId = keyToId[dep]
        if (!depId) continue
        if ((layer[depId] ?? 0) + 1 > max) max = (layer[depId] ?? 0) + 1
      }
      if (max !== layer[s.id]) {
        layer[s.id] = max
        changed = true
      }
    }
    if (!changed) break
  }

  // indexInLayer: stable durch stepKey-Ordnung pro Layer
  const result: Record<string, DagLayout> = {}
  const layers: Record<number, DagStep[]> = {}
  for (const s of steps) {
    const l = layer[s.id]
    if (!layers[l]) layers[l] = []
    layers[l].push(s)
  }
  for (const lStr of Object.keys(layers)) {
    const l = Number(lStr)
    layers[l].sort((a, b) => a.stepKey.localeCompare(b.stepKey))
    layers[l].forEach((s, i) => { result[s.id] = { layer: l, indexInLayer: i } })
  }
  return result
}

const STATUS_FILL: Record<string, string> = {
  pending: '#94a3b8',
  running: '#0ea5e9',
  succeeded: '#22c55e',
  failed: '#ef4444',
  skipped: '#71717a',
}

const NODE_W = 160
const NODE_H = 56
const X_GAP = 40
const Y_GAP = 24

export function RunDagView({ steps }: { steps: DagStep[] }) {
  if (steps.length === 0) {
    return <div className="text-sm text-muted-foreground">Keine Steps</div>
  }
  const layout = computeDagLayout(steps)
  const maxLayer = Math.max(...Object.values(layout).map((l) => l.layer))
  const stepsPerLayer: Record<number, number> = {}
  for (const l of Object.values(layout)) stepsPerLayer[l.layer] = (stepsPerLayer[l.layer] ?? 0) + 1
  const maxRows = Math.max(...Object.values(stepsPerLayer))

  const width = (maxLayer + 1) * (NODE_W + X_GAP) + X_GAP
  const height = maxRows * (NODE_H + Y_GAP) + Y_GAP

  // Node-Position
  const positions: Record<string, { x: number; y: number }> = {}
  for (const s of steps) {
    const { layer, indexInLayer } = layout[s.id]
    positions[s.id] = {
      x: X_GAP + layer * (NODE_W + X_GAP),
      y: Y_GAP + indexInLayer * (NODE_H + Y_GAP),
    }
  }

  // Edges
  const keyToId: Record<string, string> = {}
  for (const s of steps) keyToId[s.stepKey] = s.id
  const edges: Array<{ from: string; to: string }> = []
  for (const s of steps) {
    for (const dep of s.dependsOnStepKeys) {
      const fromId = keyToId[dep]
      if (fromId) edges.push({ from: fromId, to: s.id })
    }
  }

  return (
    <svg width={width} height={height} className="border rounded-md bg-background">
      {edges.map((e, i) => {
        const f = positions[e.from], t = positions[e.to]
        return (
          <line
            key={i}
            x1={f.x + NODE_W} y1={f.y + NODE_H / 2}
            x2={t.x} y2={t.y + NODE_H / 2}
            stroke="#cbd5e1" strokeWidth={1.5}
            markerEnd="url(#arrowhead)"
          />
        )
      })}
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 9 3, 0 6" fill="#cbd5e1" />
        </marker>
      </defs>
      {steps.map((s) => {
        const p = positions[s.id]
        const fill = STATUS_FILL[s.status ?? 'pending'] ?? '#cbd5e1'
        return (
          <g key={s.id}>
            <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={6} fill={fill} fillOpacity={0.15} stroke={fill} strokeWidth={2} />
            <text x={p.x + 8} y={p.y + 18} fontSize="12" fontWeight="bold">{s.stepKey}</text>
            <text x={p.x + 8} y={p.y + 36} fontSize="10" fill="#64748b">{s.workerType}</text>
            <text x={p.x + 8} y={p.y + 50} fontSize="10" fill="#64748b">{s.status}</text>
          </g>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 3: Tests laufen — PASS**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/unit/components/agents/runs/run-dag-view.test.tsx`
Expected: PASS (5/5)

- [ ] **Step 4: Commit**

```bash
git add src/components/agents/runs/run-dag-view.tsx \
        src/__tests__/unit/components/agents/runs/run-dag-view.test.tsx
git commit -m "feat(agents): RunDagView mit Layered-Graph-Layout (SVG)"
```

---

### Task 6: Run-Detail-Page mit DAG + Cost-Breakdown

**Files:**
- Create: `src/components/agents/runs/run-detail-view.tsx`
- Create: `src/components/agents/runs/run-cost-breakdown.tsx`
- Create: `src/app/intern/(dashboard)/agents/runs/[id]/page.tsx`

- [ ] **Step 1: Cost-Breakdown-Component**

`src/components/agents/runs/run-cost-breakdown.tsx`:

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CostEvent {
  id: string
  callRole: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  costCents: number
  occurredAt: string
}

export function RunCostBreakdown({ events }: { events: CostEvent[] }) {
  const totalCents = events.reduce((s, e) => s + e.costCents, 0)
  const totalTokens = events.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kosten-Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-2">
          Gesamt: <strong>{totalCents} Cent</strong> · {totalTokens.toLocaleString('de-DE')} Tokens · {events.length} Calls
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left">
              <tr className="border-b">
                <th className="py-1 pr-3">Role</th>
                <th className="py-1 pr-3">Modell</th>
                <th className="py-1 pr-3">Input</th>
                <th className="py-1 pr-3">Output</th>
                <th className="py-1 pr-3">Cent</th>
                <th className="py-1">Wann</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="py-1 pr-3">{e.callRole}</td>
                  <td className="py-1 pr-3">{e.provider}/{e.model}</td>
                  <td className="py-1 pr-3">{e.inputTokens.toLocaleString('de-DE')}</td>
                  <td className="py-1 pr-3">{e.outputTokens.toLocaleString('de-DE')}</td>
                  <td className="py-1 pr-3">{e.costCents}</td>
                  <td className="py-1 text-muted-foreground">{new Date(e.occurredAt).toLocaleString('de-DE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Run-Detail-View**

`src/components/agents/runs/run-detail-view.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RunDagView } from './run-dag-view'
import { RunCostBreakdown } from './run-cost-breakdown'

interface RunDetail {
  run: {
    id: string
    goalId: string
    status: string
    startedAt: string
    finishedAt: string | null
    lastError: string | null
    costCents: number
    inputTokens: number
    outputTokens: number
    attempt: number
  }
  steps: Array<{
    id: string
    stepKey: string
    workerType: string
    status: string
    dependsOnStepKeys: string[]
    resultSummary: string | null
    error: string | null
  }>
  costEvents: Array<{
    id: string
    callRole: string
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    costCents: number
    occurredAt: string
  }>
}

export function RunDetailView({ runId }: { runId: string }) {
  const [data, setData] = useState<RunDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    const tick = async () => {
      try {
        const r = await fetch(`/api/agents/runs/${runId}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json()
        if (!alive) return
        setData(j)
        setError(null)
        const isTerminal = ['succeeded', 'failed', 'cancelled'].includes(j.run.status)
        if (!isTerminal && alive) timer = setTimeout(tick, 5000)
      } catch (e) {
        if (alive) setError((e as Error).message)
      }
    }
    void tick()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [runId])

  if (error) return <div className="text-destructive">Fehler: {error}</div>
  if (!data) return <div className="text-muted-foreground">Lade Run...</div>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Run {data.run.id.slice(0, 8)} · Attempt {data.run.attempt}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>Status: <Badge>{data.run.status}</Badge></div>
          <div>Started: {new Date(data.run.startedAt).toLocaleString('de-DE')}</div>
          {data.run.finishedAt && <div>Finished: {new Date(data.run.finishedAt).toLocaleString('de-DE')}</div>}
          <div>Cost: {data.run.costCents} Cent · {(data.run.inputTokens + data.run.outputTokens).toLocaleString('de-DE')} Tokens</div>
          {data.run.lastError && (
            <div className="text-destructive">Fehler: {data.run.lastError}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Plan-DAG</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <RunDagView steps={data.steps} />
        </CardContent>
      </Card>

      <RunCostBreakdown events={data.costEvents} />

      <Card>
        <CardHeader><CardTitle>Steps</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.steps.map((s) => (
              <div key={s.id} className="border rounded p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge>{s.status}</Badge>
                  <strong>{s.stepKey}</strong>
                  <span className="text-muted-foreground">({s.workerType})</span>
                </div>
                {s.resultSummary && <div className="text-muted-foreground">{s.resultSummary}</div>}
                {s.error && <div className="text-destructive mt-1">{s.error}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Page**

`src/app/intern/(dashboard)/agents/runs/[id]/page.tsx`:

```tsx
import { RunDetailView } from '@/components/agents/runs/run-detail-view'

export const dynamic = 'force-dynamic'

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="container py-6">
      <RunDetailView runId={id} />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/agents/runs/run-detail-view.tsx \
        src/components/agents/runs/run-cost-breakdown.tsx \
        src/app/intern/\(dashboard\)/agents/runs/\[id\]/page.tsx
git commit -m "feat(agents): /intern/agents/runs/[id] mit DAG + Cost-Breakdown + Step-Liste"
```

---

### Task 7: Manual-Trigger-Endpoints + UI-Buttons

**Files:**
- Create: `src/app/api/agents/runs/[id]/replan-now/route.ts`
- Create: `src/app/api/agents/steps/[id]/retry/route.ts`
- Create: `src/app/api/agents/goals/[id]/run-immediate/route.ts`
- Create: `src/components/agents/runs/manual-triggers.tsx`
- Modify: `src/components/agents/runs/run-detail-view.tsx` — ManualTriggers einbauen

- [ ] **Step 1: replan-now-Route**

`src/app/api/agents/runs/[id]/replan-now/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/api/error-responses'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id: runId } = await params

  const { db } = await import('@/lib/db')
  const { sql } = await import('drizzle-orm')

  await db.execute(sql`
    INSERT INTO task_queue (type, status, priority, payload, reference_type, reference_id)
    VALUES ('agent_replan','pending',1,${JSON.stringify({ runId })}::jsonb,'agent_run',${runId})
  `)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: steps/retry-Route**

`src/app/api/agents/steps/[id]/retry/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiNotFound } from '@/lib/api/error-responses'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id: stepId } = await params

  const { db } = await import('@/lib/db')
  const { agentSteps } = await import('@/lib/db/schema')
  const { eq, sql } = await import('drizzle-orm')

  const [step] = await db.select().from(agentSteps).where(eq(agentSteps.id, stepId)).limit(1)
  if (!step) return apiNotFound('Step nicht gefunden')

  await db
    .update(agentSteps)
    .set({ status: 'pending', error: null, finishedAt: null, startedAt: null, updatedAt: sql`now()` })
    .where(eq(agentSteps.id, stepId))

  await db.execute(sql`
    INSERT INTO task_queue (type, status, priority, payload, reference_type, reference_id)
    VALUES ('agent_step_run','pending',1,${JSON.stringify({ stepId, runId: step.runId, goalId: step.goalId })}::jsonb,'agent_step',${stepId})
  `)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: run-immediate-Route**

`src/app/api/agents/goals/[id]/run-immediate/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiNotFound, apiBadRequest } from '@/lib/api/error-responses'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id: goalId } = await params

  const { db } = await import('@/lib/db')
  const { agentGoals, agentRuns } = await import('@/lib/db/schema')
  const { eq, and, desc, sql } = await import('drizzle-orm')

  const [goal] = await db.select().from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
  if (!goal) return apiNotFound('Goal nicht gefunden')
  if (['done', 'failed', 'cancelled'].includes(goal.status)) {
    return apiBadRequest(`Goal ist terminal (status=${goal.status})`)
  }

  // executionMode auf immediate setzen (auch wenn vorher cron)
  await db.update(agentGoals).set({ executionMode: 'immediate', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))

  // Letzten Run finden + replan-Task queuen
  const [latestRun] = await db.select({ id: agentRuns.id }).from(agentRuns).where(eq(agentRuns.goalId, goalId)).orderBy(desc(agentRuns.createdAt)).limit(1)
  if (latestRun) {
    await db.execute(sql`
      INSERT INTO task_queue (type, status, priority, payload, reference_type, reference_id)
      VALUES ('agent_replan','pending',1,${JSON.stringify({ runId: latestRun.id })}::jsonb,'agent_run',${latestRun.id})
    `)
  }

  return NextResponse.json({ ok: true, runId: latestRun?.id ?? null })
}
```

- [ ] **Step 4: Manual-Triggers Component**

`src/components/agents/runs/manual-triggers.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  runId?: string
  goalId?: string
  failedStepIds?: string[]
}

async function postJson(url: string): Promise<void> {
  const r = await fetch(url, { method: 'POST' })
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
}

export function ManualTriggers({ runId, goalId, failedStepIds = [] }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  const replanNow = async () => {
    if (!runId) return
    setLoading('replan')
    try {
      await postJson(`/api/agents/runs/${runId}/replan-now`)
      toast.success('Replan-Task gequeued')
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setLoading(null)
    }
  }

  const runImmediate = async () => {
    if (!goalId) return
    setLoading('immediate')
    try {
      await postJson(`/api/agents/goals/${goalId}/run-immediate`)
      toast.success('Goal auf executionMode=immediate gesetzt + Replan gequeued')
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setLoading(null)
    }
  }

  const retryStep = async (stepId: string) => {
    setLoading(`retry-${stepId}`)
    try {
      await postJson(`/api/agents/steps/${stepId}/retry`)
      toast.success(`Step ${stepId.slice(0, 8)} wieder gequeued`)
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {runId && (
        <Button size="sm" variant="outline" onClick={replanNow} disabled={loading !== null}>
          {loading === 'replan' ? '...' : 'Re-Plan jetzt'}
        </Button>
      )}
      {goalId && (
        <Button size="sm" variant="outline" onClick={runImmediate} disabled={loading !== null}>
          {loading === 'immediate' ? '...' : 'Goal jetzt ausfuehren'}
        </Button>
      )}
      {failedStepIds.map((sid) => (
        <Button key={sid} size="sm" variant="outline" onClick={() => retryStep(sid)} disabled={loading !== null}>
          {loading === `retry-${sid}` ? '...' : `Step ${sid.slice(0, 6)} retry`}
        </Button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: RunDetailView erweitern**

In `src/components/agents/runs/run-detail-view.tsx` im Header-Card-CardContent unten anhaengen:

```tsx
import { ManualTriggers } from './manual-triggers'
// ... in der Render-Funktion, nach dem Run-Header-Card:
const failedStepIds = data.steps.filter((s) => s.status === 'failed').map((s) => s.id)

// nach dem Run-Header-Card oder als eigene Card:
<Card>
  <CardHeader><CardTitle>Aktionen</CardTitle></CardHeader>
  <CardContent>
    <ManualTriggers runId={data.run.id} goalId={data.run.goalId} failedStepIds={failedStepIds} />
  </CardContent>
</Card>
```

- [ ] **Step 6: API-Tests laufen**

Teste die neuen Endpoints (eigene Tests anlegen oder im Smoke-Test ausprobieren). Plan-Vorgabe: mindestens je 1 Test pro Endpoint, Pattern wie `cost-route.test.ts`.

`src/__tests__/unit/api/agents/manual-triggers.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) }))

const dbExecuteMock = vi.fn().mockResolvedValue([])
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
vi.mock('@/lib/db', () => ({ db: { execute: dbExecuteMock, select: selectMock, update: updateMock } }))
vi.mock('@/lib/db/schema', () => ({
  agentGoals: { id: 'id', status: 'status', executionMode: 'executionMode', updatedAt: 'updatedAt' },
  agentRuns: { id: 'id', goalId: 'goalId', createdAt: 'createdAt' },
  agentSteps: { id: 'id', runId: 'runId', goalId: 'goalId' },
}))

describe('Manual Triggers', () => {
  beforeEach(() => { vi.clearAllMocks(); selectLimitMock.mockReset() })

  it('POST /runs/[id]/replan-now: queued task', async () => {
    const { POST } = await import('@/app/api/agents/runs/[id]/replan-now/route')
    const res = await POST(new Request('http://x'), { params: Promise.resolve({ id: 'r1' }) })
    expect(res.status).toBe(200)
    expect(dbExecuteMock).toHaveBeenCalled()
  })

  it('POST /steps/[id]/retry: 404 wenn Step nicht existiert', async () => {
    selectLimitMock.mockResolvedValueOnce([])
    const { POST } = await import('@/app/api/agents/steps/[id]/retry/route')
    const res = await POST(new Request('http://x'), { params: Promise.resolve({ id: 'sX' }) })
    expect(res.status).toBe(404)
  })

  it('POST /steps/[id]/retry: ok wenn Step existiert', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 's1', runId: 'r1', goalId: 'g1', status: 'failed' }])
    const { POST } = await import('@/app/api/agents/steps/[id]/retry/route')
    const res = await POST(new Request('http://x'), { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
    expect(updateMock).toHaveBeenCalled()
    expect(dbExecuteMock).toHaveBeenCalled()
  })

  it('POST /goals/[id]/run-immediate: setzt executionMode + queued replan wenn Run existiert', async () => {
    selectLimitMock
      .mockResolvedValueOnce([{ id: 'g1', status: 'running' }])
      .mockResolvedValueOnce([{ id: 'r1' }])
    selectWhereMock
      .mockReturnValueOnce({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ orderBy: vi.fn().mockReturnValue({ limit: selectLimitMock }) })
    const { POST } = await import('@/app/api/agents/goals/[id]/run-immediate/route')
    const res = await POST(new Request('http://x'), { params: Promise.resolve({ id: 'g1' }) })
    expect(res.status).toBe(200)
    expect(updateMock).toHaveBeenCalled()
  })
})
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/agents/runs/\[id\]/replan-now/route.ts \
        src/app/api/agents/steps/\[id\]/retry/route.ts \
        src/app/api/agents/goals/\[id\]/run-immediate/route.ts \
        src/components/agents/runs/manual-triggers.tsx \
        src/components/agents/runs/run-detail-view.tsx \
        src/__tests__/unit/api/agents/manual-triggers.test.ts
git commit -m "feat(agents): Manual-Trigger-Endpoints + UI-Buttons (replan-now/retry/run-immediate)"
```

---

### Task 8: Definitions-API + UI

`agent_definitions` ist heute nur via SQL pflegbar. Wir geben dem User CRUD via UI.

**Files:**
- Create: `src/app/api/agents/definitions/route.ts`
- Create: `src/app/api/agents/definitions/[id]/route.ts`
- Create: `src/components/agents/definitions/definitions-list.tsx`
- Create: `src/components/agents/definitions/definition-form.tsx`
- Create: `src/app/intern/(dashboard)/agents/definitions/page.tsx`
- Create: `src/app/intern/(dashboard)/agents/definitions/new/page.tsx`
- Create: `src/app/intern/(dashboard)/agents/definitions/[id]/page.tsx`
- Test: `src/__tests__/unit/api/agents/definitions-route.test.ts`

- [ ] **Step 1: Test fuer Definitions-API**

`src/__tests__/unit/api/agents/definitions-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) }))

const insertReturningMock = vi.fn()
const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }))
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const selectFromMock = vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([{ id: 'd1', slug: 'writer', isActive: true }]) }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
vi.mock('@/lib/db', () => ({ db: { select: selectMock, insert: insertMock } }))
vi.mock('@/lib/db/schema', () => ({
  agentDefinitions: { id: 'id', slug: 'slug', isActive: 'isActive', createdAt: 'createdAt' },
}))

describe('GET /api/agents/definitions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('liefert Liste', async () => {
    const { GET } = await import('@/app/api/agents/definitions/route')
    const res = await GET(new Request('http://x'))
    const j = await res.json()
    expect(j.definitions).toHaveLength(1)
  })
})

describe('POST /api/agents/definitions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('erfordert slug+systemPrompt+role', async () => {
    const { POST } = await import('@/app/api/agents/definitions/route')
    const res = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ slug: 'x' }),
      headers: { 'content-type': 'application/json' },
    }))
    expect(res.status).toBe(400)
  })

  it('legt Definition an', async () => {
    insertReturningMock.mockResolvedValueOnce([{ id: 'd1' }])
    const { POST } = await import('@/app/api/agents/definitions/route')
    const res = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ slug: 'tester', role: 'worker', systemPrompt: 'p', allowedTools: ['memory:*'] }),
      headers: { 'content-type': 'application/json' },
    }))
    expect(res.status).toBe(201)
    expect(insertValuesMock).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: API-Routes**

`src/app/api/agents/definitions/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiBadRequest } from '@/lib/api/error-responses'

export async function GET(_req: Request) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')
  const { desc } = await import('drizzle-orm')

  const definitions = await db.select().from(agentDefinitions).orderBy(desc(agentDefinitions.createdAt))
  return NextResponse.json({ definitions })
}

interface CreateInput {
  slug?: unknown
  role?: unknown
  name?: unknown
  systemPrompt?: unknown
  allowedTools?: unknown
  modelHint?: unknown
  maxTokensPerCall?: unknown
  maxIterations?: unknown
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  let body: CreateInput
  try { body = await req.json() } catch { return apiBadRequest('Body nicht parseable') }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  const role = typeof body.role === 'string' ? body.role.trim() : ''
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : ''
  if (!slug || !role || !systemPrompt) return apiBadRequest('slug + role + systemPrompt erforderlich')

  const allowedTools = Array.isArray(body.allowedTools) ? body.allowedTools.filter((t): t is string => typeof t === 'string') : []
  const name = typeof body.name === 'string' ? body.name : null
  const modelHint = typeof body.modelHint === 'string' ? body.modelHint : null
  const maxTokensPerCall = typeof body.maxTokensPerCall === 'number' ? body.maxTokensPerCall : 4096
  const maxIterations = typeof body.maxIterations === 'number' ? body.maxIterations : 8

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')

  const [row] = await db
    .insert(agentDefinitions)
    .values({ slug, role, name, systemPrompt, allowedTools, modelHint, maxTokensPerCall, maxIterations })
    .returning({ id: agentDefinitions.id })

  return NextResponse.json({ id: row.id }, { status: 201 })
}
```

`src/app/api/agents/definitions/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiNotFound, apiBadRequest } from '@/lib/api/error-responses'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const [row] = await db.select().from(agentDefinitions).where(eq(agentDefinitions.id, id)).limit(1)
  if (!row) return apiNotFound('Definition nicht gefunden')
  return NextResponse.json(row)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiBadRequest('Body nicht parseable') }

  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string') update.name = body.name
  if (typeof body.systemPrompt === 'string') update.systemPrompt = body.systemPrompt
  if (Array.isArray(body.allowedTools)) update.allowedTools = body.allowedTools.filter((t) => typeof t === 'string')
  if (typeof body.modelHint === 'string') update.modelHint = body.modelHint
  if (typeof body.maxTokensPerCall === 'number') update.maxTokensPerCall = body.maxTokensPerCall
  if (typeof body.maxIterations === 'number') update.maxIterations = body.maxIterations
  if (typeof body.isActive === 'boolean') update.isActive = body.isActive

  if (Object.keys(update).length === 0) return apiBadRequest('Kein Update-Feld')

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')
  const { eq, sql } = await import('drizzle-orm')

  await db.update(agentDefinitions).set({ ...update, updatedAt: sql`now()` }).where(eq(agentDefinitions.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')
  const { eq, sql } = await import('drizzle-orm')

  // Soft-Delete via isActive=false (nicht hart loeschen — historische Step-Refs zeigen darauf)
  await db.update(agentDefinitions).set({ isActive: false, updatedAt: sql`now()` }).where(eq(agentDefinitions.id, id))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: UI Components + Pages**

`src/components/agents/definitions/definitions-list.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Def {
  id: string
  slug: string
  role: string
  name: string | null
  modelHint: string | null
  maxIterations: number
  isActive: boolean
}

export function DefinitionsList() {
  const [defs, setDefs] = useState<Def[] | null>(null)
  useEffect(() => {
    fetch('/api/agents/definitions').then((r) => r.json()).then((j) => setDefs(j.definitions))
  }, [])
  if (!defs) return <div>Lade Definitions...</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Smart-Worker-Definitions</h1>
        <Link href="/intern/agents/definitions/new"><Button>Neue Definition</Button></Link>
      </div>
      <div className="grid gap-3">
        {defs.map((d) => (
          <Link key={d.id} href={`/intern/agents/definitions/${d.id}`}>
            <Card className="hover:bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{d.name ?? d.slug}</span>
                  <Badge>{d.role}</Badge>
                  {!d.isActive && <Badge variant="outline">inaktiv</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                slug=<code>{d.slug}</code> · model={d.modelHint ?? 'default'} · maxIter={d.maxIterations}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

`src/components/agents/definitions/definition-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Initial {
  id?: string
  slug?: string
  role?: string
  name?: string | null
  systemPrompt?: string
  allowedTools?: string[]
  modelHint?: string | null
  maxTokensPerCall?: number
  maxIterations?: number
  isActive?: boolean
}

export function DefinitionForm({ initial }: { initial?: Initial }) {
  const router = useRouter()
  const isEdit = Boolean(initial?.id)
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [role, setRole] = useState(initial?.role ?? 'worker')
  const [name, setName] = useState(initial?.name ?? '')
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? '')
  const [allowedTools, setAllowedTools] = useState((initial?.allowedTools ?? ['memory:*']).join('\n'))
  const [modelHint, setModelHint] = useState(initial?.modelHint ?? '')
  const [maxTokensPerCall, setMaxTokensPerCall] = useState(initial?.maxTokensPerCall ?? 2048)
  const [maxIterations, setMaxIterations] = useState(initial?.maxIterations ?? 6)
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        slug, role, name: name || null, systemPrompt,
        allowedTools: allowedTools.split('\n').map((s) => s.trim()).filter(Boolean),
        modelHint: modelHint || null,
        maxTokensPerCall: Number(maxTokensPerCall),
        maxIterations: Number(maxIterations),
      }
      const url = isEdit ? `/api/agents/definitions/${initial!.id}` : '/api/agents/definitions'
      const method = isEdit ? 'PATCH' : 'POST'
      const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) throw new Error(await r.text())
      const j = await r.json()
      toast.success(isEdit ? 'Definition aktualisiert' : 'Definition angelegt')
      router.push(isEdit ? '/intern/agents/definitions' : `/intern/agents/definitions/${j.id}`)
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Definition bearbeiten' : 'Neue Smart-Worker-Definition'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Slug (eindeutig)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isEdit} placeholder="z.B. tester" required />
          </div>
          <div>
            <Label>Role</Label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border rounded p-2" disabled={isEdit}>
              <option value="worker">worker</option>
              <option value="orchestrator">orchestrator</option>
            </select>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>System-Prompt</Label>
            <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={8} required />
          </div>
          <div>
            <Label>Erlaubte Tools (1 pro Zeile, Wildcards wie <code>memory:*</code>)</Label>
            <Textarea value={allowedTools} onChange={(e) => setAllowedTools(e.target.value)} rows={6} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Model Hint</Label>
              <Input value={modelHint} onChange={(e) => setModelHint(e.target.value)} placeholder="gemini-2.5-flash-lite" />
            </div>
            <div>
              <Label>Max Tokens / Call</Label>
              <Input type="number" value={maxTokensPerCall} onChange={(e) => setMaxTokensPerCall(Number(e.target.value))} />
            </div>
            <div>
              <Label>Max Iterations</Label>
              <Input type="number" value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))} />
            </div>
          </div>
          <Button type="submit" disabled={saving}>{saving ? 'Speichere...' : 'Speichern'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

`src/app/intern/(dashboard)/agents/definitions/page.tsx`:

```tsx
import { DefinitionsList } from '@/components/agents/definitions/definitions-list'

export const dynamic = 'force-dynamic'

export default function DefinitionsPage() {
  return <div className="container py-6"><DefinitionsList /></div>
}
```

`src/app/intern/(dashboard)/agents/definitions/new/page.tsx`:

```tsx
import { DefinitionForm } from '@/components/agents/definitions/definition-form'

export default function NewDefinitionPage() {
  return <div className="container py-6"><DefinitionForm /></div>
}
```

`src/app/intern/(dashboard)/agents/definitions/[id]/page.tsx`:

```tsx
import { db } from '@/lib/db'
import { agentDefinitions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { DefinitionForm } from '@/components/agents/definitions/definition-form'

export const dynamic = 'force-dynamic'

export default async function DefinitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [def] = await db.select().from(agentDefinitions).where(eq(agentDefinitions.id, id)).limit(1)
  if (!def) notFound()
  return (
    <div className="container py-6">
      <DefinitionForm
        initial={{
          id: def.id, slug: def.slug, role: def.role, name: def.name, systemPrompt: def.systemPrompt,
          allowedTools: def.allowedTools, modelHint: def.modelHint,
          maxTokensPerCall: def.maxTokensPerCall, maxIterations: def.maxIterations, isActive: def.isActive,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Tests laufen — PASS**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/unit/api/agents/definitions-route.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/agents/definitions \
        src/components/agents/definitions \
        src/app/intern/\(dashboard\)/agents/definitions \
        src/__tests__/unit/api/agents/definitions-route.test.ts
git commit -m "feat(agents): /intern/agents/definitions CRUD UI + API"
```

---

### Task 9: Memory-Markdown-Editor

**Files:**
- Create: `src/components/agents/memory/markdown-editor.tsx`
- Create: `src/app/intern/(dashboard)/agents/memory/[scope]/edit/page.tsx`
- Modify: `src/app/api/agents/memory/route.ts` — wenn noch keine `PATCH`-Methode existiert, anlegen

- [ ] **Step 1: PATCH-Methode in Memory-API pruefen**

Lies `src/app/api/agents/memory/route.ts`. Wenn dort kein `PATCH`-Handler ist:

```ts
export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const url = new URL(req.url)
  const scope = url.searchParams.get('scope')
  if (!scope) return apiBadRequest('?scope=... erforderlich')

  let body: { body?: unknown; title?: unknown }
  try { body = await req.json() } catch { return apiBadRequest('Body nicht parseable') }
  if (typeof body.body !== 'string') return apiBadRequest('body (string) erforderlich')

  const { MemoryService } = await import('@/lib/services/agents')
  await MemoryService.write(scope, body.body, { title: typeof body.title === 'string' ? body.title : undefined })

  return NextResponse.json({ ok: true })
}
```

(Falls bereits vorhanden — Step ueberspringen.)

- [ ] **Step 2: Markdown-Editor-Component**

`src/components/agents/memory/markdown-editor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props {
  scope: string
  initialBody: string
  initialTitle: string
}

export function MarkdownEditor({ scope, initialBody, initialTitle }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch(`/api/agents/memory?scope=${encodeURIComponent(scope)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, title }),
      })
      if (!r.ok) throw new Error(await r.text())
      toast.success('Memory gespeichert')
      router.push(`/intern/agents/memory/${encodeURIComponent(scope)}`)
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Memory bearbeiten: <code>{scope}</code></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Markdown</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={20} className="font-mono text-sm" />
            </div>
            <div>
              <Label>Vorschau</Label>
              <div className="prose prose-sm border rounded p-3 max-h-[500px] overflow-y-auto">
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? 'Speichere...' : 'Speichern'}</Button>
            <Button variant="outline" onClick={() => router.push(`/intern/agents/memory/${encodeURIComponent(scope)}`)}>
              Abbrechen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Edit-Page**

`src/app/intern/(dashboard)/agents/memory/[scope]/edit/page.tsx`:

```tsx
import { MemoryService } from '@/lib/services/agents'
import { MarkdownEditor } from '@/components/agents/memory/markdown-editor'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MemoryEditPage({ params }: { params: Promise<{ scope: string }> }) {
  const { scope: rawScope } = await params
  const scope = decodeURIComponent(rawScope)
  let entry: Awaited<ReturnType<typeof MemoryService.read>> | null = null
  try {
    entry = await MemoryService.read(scope)
  } catch (e) {
    if ((e as Error).message.includes('nicht gefunden')) notFound()
    throw e
  }
  return (
    <div className="container py-6">
      <MarkdownEditor scope={scope} initialBody={entry.body ?? ''} initialTitle={entry.frontmatter?.title ?? ''} />
    </div>
  )
}
```

- [ ] **Step 4: Edit-Link in MemoryEntryCard**

In `src/components/agents/memory/memory-entry-card.tsx` einen "Bearbeiten"-Button hinzufuegen, der zu `/intern/agents/memory/[scope]/edit` linkt.

- [ ] **Step 5: Manueller Browser-Test**

`pnpm dev`, `/intern/agents/memory` → Eintrag klicken → "Bearbeiten" → Markdown editieren → Speichern → ausgehende Navigation zurueck zu `/memory/[scope]`.

- [ ] **Step 6: Commit**

```bash
git add src/components/agents/memory/markdown-editor.tsx \
        src/app/intern/\(dashboard\)/agents/memory/\[scope\]/edit/page.tsx \
        src/app/api/agents/memory/route.ts \
        src/components/agents/memory/memory-entry-card.tsx
git commit -m "feat(agents): Memory-Markdown-Editor mit Live-Preview"
```

---

### Task 10: Dashboard-Page

**Files:**
- Create: `src/components/agents/dashboard/dashboard-view.tsx`
- Create: `src/app/intern/(dashboard)/agents/page.tsx`

- [ ] **Step 1: Dashboard-Component**

`src/components/agents/dashboard/dashboard-view.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface DashboardData {
  goals: Array<{ id: string; title: string; status: string; spentCents: number; createdAt: string }>
  recentRuns: Array<{ id: string; goalId: string; status: string; startedAt: string; costCents: number }>
  costSparkline: Array<{ day: string; totalCents: number }>
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'failed' ? 'destructive' : status === 'done' ? 'default' : 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const [goalsR, costR] = await Promise.all([
          fetch('/api/agents/goals?limit=10').then((r) => r.json()),
          fetch('/api/agents/cost?range=7').then((r) => r.json()),
        ])
        if (!alive) return
        // recentRuns: aus jedem Goal die Detail-Daten holen ist teuer; hier nur die top-5 active goals zeigen
        setData({
          goals: goalsR.goals ?? goalsR ?? [],
          recentRuns: [],
          costSparkline: costR.byDay ?? [],
        })
      } catch { /* noop */ }
    }
    void tick()
    const handle = setInterval(tick, 30_000)
    return () => { alive = false; clearInterval(handle) }
  }, [])

  if (!data) return <div>Lade Dashboard...</div>

  const active = data.goals.filter((g) => ['running', 'planning', 'paused', 'awaiting_approval'].includes(g.status))
  const recent = data.goals.slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Agent-Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/intern/agents/goals/new"><Button>Neues Goal</Button></Link>
          <Link href="/intern/agents/cost"><Button variant="outline">Kosten</Button></Link>
          <Link href="/intern/agents/definitions"><Button variant="outline">Definitions</Button></Link>
          <Link href="/intern/agents/memory"><Button variant="outline">Memory</Button></Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Aktive Goals ({active.length})</CardTitle></CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <div className="text-muted-foreground text-sm">Keine aktiven Goals</div>
          ) : (
            <div className="space-y-2">
              {active.map((g) => (
                <Link key={g.id} href={`/intern/agents/goals/${g.id}`}>
                  <div className="flex items-center justify-between border rounded p-2 hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={g.status} />
                      <span>{g.title}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{g.spentCents} Cent</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Kosten letzte 7 Tage (Cent)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data.costSparkline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalCents" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Letzte Goals</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recent.map((g) => (
              <Link key={g.id} href={`/intern/agents/goals/${g.id}`} className="flex items-center justify-between text-sm border-b py-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={g.status} />
                  <span>{g.title}</span>
                </div>
                <span className="text-muted-foreground">{new Date(g.createdAt).toLocaleString('de-DE')}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Page**

`src/app/intern/(dashboard)/agents/page.tsx`:

```tsx
import { DashboardView } from '@/components/agents/dashboard/dashboard-view'

export const dynamic = 'force-dynamic'

export default function AgentDashboardPage() {
  return <div className="container py-6"><DashboardView /></div>
}
```

- [ ] **Step 3: Manueller Browser-Test**

`/intern/agents` → Dashboard mit aktiven Goals + Sparkline + Navi-Buttons

- [ ] **Step 4: Commit**

```bash
git add src/components/agents/dashboard/dashboard-view.tsx \
        src/app/intern/\(dashboard\)/agents/page.tsx
git commit -m "feat(agents): /intern/agents Dashboard (Aktive Goals + Cost-Sparkline + Navi)"
```

---

### Task 11a: Sidebar-Eintrag `Agents`

Bisher sind alle Agent-Pages nur via direkter URL erreichbar — kein Eintrag in `src/components/layout/sidebar.tsx`. Wir fuegen einen Top-Level-Eintrag mit Subitems analog zu `Intelligence`/`CRM`/`CMS` hinzu, ohne `requiredModule`-Gate (alle berechtigten User sehen es sofort).

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Lies sidebar.tsx (Zeilen 1-130 reichen)**

Identifiziere zwei Stellen:
- Lucide-Icon-Imports am Anfang
- `navigation: NavItem[]`-Array — neuer Eintrag nach dem `Intelligence`-Block (~Zeile 117)

- [ ] **Step 2: Icon-Import**

Im Lucide-Import-Block (~Zeile 6-28) `Bot` ergaenzen. Beispiel:

```ts
import { LayoutDashboard,
  Building2,
  Settings,
  Shield,
  Globe,
  ChevronLeft,
  ChevronRight,
  Brain,
  Bot,                          // NEU
  Monitor,
  ...
```

- [ ] **Step 3: Navigation-Item**

Nach dem `Intelligence`-Block neuen Eintrag einfuegen:

```ts
  // ── Agents ──
  {
    name: 'Agents',
    href: '/intern/agents',
    icon: Bot,
    children: [
      { name: 'Dashboard', href: '/intern/agents' },
      { name: 'Goals', href: '/intern/agents/goals' },
      { name: 'Memory', href: '/intern/agents/memory' },
      { name: 'Definitions', href: '/intern/agents/definitions' },
      { name: 'Kosten', href: '/intern/agents/cost' },
    ],
  },
```

KEIN `requiredModule` — Sichtbarkeit ist hartkodiert. Spaetere Modul-Gates per separater Migration.

- [ ] **Step 4: Manueller Browser-Check**

`/intern/dashboard` aufrufen → in Sidebar `Agents` mit Bot-Icon zwischen `Intelligence` und `Cybersecurity` sichtbar, expandiert die 5 Subitems.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(agents): Sidebar-Eintrag Agents mit 5 Subitems"
```

---

### Task 11: Goal-Detail-View Link auf Run-Detail

Die existierende `/intern/agents/goals/[id]`-Page zeigt heute Steps inline. Sie soll jetzt zusaetzlich einen Link auf `/intern/agents/runs/[latestRunId]` zeigen, damit User zum DAG kommen.

**Files:**
- Modify: `src/components/agents/goals/goal-detail-view.tsx`

- [ ] **Step 1: Lies die Datei**

Suche im Component nach der Stelle, wo Run-Daten angezeigt werden. Fuege einen Link auf die Run-Detail-Page ein:

```tsx
{data.latestRunId && (
  <Link href={`/intern/agents/runs/${data.latestRunId}`} className="text-primary hover:underline">
    Run-Details mit DAG anzeigen →
  </Link>
)}
```

Plus die `ManualTriggers`-Component fuer Goal-Level-Aktionen (run-immediate):

```tsx
import { ManualTriggers } from '@/components/agents/runs/manual-triggers'
// ...
<ManualTriggers goalId={goalId} runId={data.latestRunId ?? undefined} />
```

- [ ] **Step 2: Commit**

```bash
git add src/components/agents/goals/goal-detail-view.tsx
git commit -m "feat(agents): Goal-Detail linkt auf Run-Detail + ManualTriggers"
```

---

### Task 12: Final-Verification

- [ ] **Step 1: Type-Check**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`
Expected: 0 Fehler

- [ ] **Step 2: Volle Vitest-Suite**

Run: `node node_modules/vitest/vitest.mjs run`
Expected: alle PASS

- [ ] **Step 3: Manueller Smoke-Test**

`pnpm dev` und durchklicken:
- `/intern/agents` → Dashboard
- `/intern/agents/goals/new` → Goal anlegen mit `executionMode='cron'`
- `/intern/agents/goals/[id]` → Goal-Detail
- `/intern/agents/runs/[id]` → DAG sichtbar, Cost-Breakdown da, ManualTriggers funktionieren
- `/intern/agents/cost` → 3 Charts
- `/intern/agents/memory` → Memory-Tree
- `/intern/agents/memory/[scope]` → Detail-View
- `/intern/agents/memory/[scope]/edit` → Markdown-Editor speichert
- `/intern/agents/definitions` → Liste der 3 Default-Worker (writer/researcher/generalist)
- `/intern/agents/definitions/new` → neue Definition anlegen
- `/intern/agents/definitions/[id]` → Edit-Form

- [ ] **Step 4: DoD-Check**

| DoD aus Spec §7 + Phase-7-Definition | Pruefung |
|---|---|
| DAG-Visualisierung | Task 5 RunDagView ✅ |
| Cost-Charts | Task 3 (CostCharts mit 3 Charts) + Task 10 (Dashboard-Sparkline) ✅ |
| Memory-Editor mit Markdown-Edit | Task 9 ✅ |
| Definition-Editor | Task 8 (CRUD) ✅ |
| Live-Events | (out-of-scope — Polling stattdessen, siehe Spec §9) ✅ |
| Manual-Trigger-Buttons | Task 7 (replan-now/retry/run-immediate) ✅ |
| Komplettes Feature ohne SQL-Inserts bedienbar | Tasks 8 + 10 zusammen ✅ |
| Test: Manual-Smoke-Test auf bos.dev.xkmu.de | Step 3 oben (lokal/dev) ✅ |

- [ ] **Step 5: Push + PR**

```bash
git push -u origin feat/agents-ui
```

PR-Titel: `feat(agents): Phase 7 — UI-Komplettierung`

---

## Self-Review

**1. Spec-coverage:**
- Spec §7.1 alle 8 Routen? Dashboard ✅, goals/new+[id] (existieren) ✅, runs/[id] ✅ neu, memory + memory/[scope] (existieren) ✅, definitions ✅ neu, cost ✅ neu — vollstaendig
- §7.2 Komponenten: GoalForm/GoalListTable existieren, RunDagView ✅, RunCostBreakdown ✅, ManualTriggers ✅, MemoryTree existiert, MemoryEditor ✅ neu, CostChart ✅ neu, DefinitionForm ✅ neu — vollstaendig
- §7.4 Manual-Trigger-Hooks: replan-now ✅, step retry ✅, run-immediate ✅ — vollstaendig
- §9 Live-Events: out-of-scope (Realtime-Layer-Anforderung), Polling stattdessen

**2. Placeholder-Scan:** Keine TBD/TODO. Code in jedem Step vollstaendig.

**3. Type-Konsistenz:**
- `DagStep` Interface in run-dag-view.tsx wird nur dort genutzt — ok lokal
- `CostByDayRow`/`CostByGoalRow`/`CostByModelRow` in cost-aggregation.service.ts → genutzt in cost-route + cost-charts (typed via fetch-Response, kein direkter Import — das ist akzeptabel weil Frontend Server-API kontrolliert)
- API-Routes folgen alle dem gleichen Pattern: `getSession()` → `apiUnauthorized` → main-Logic → NextResponse.json

**Out-of-scope (Phase 8 oder Folge-Improvement):**
- Approval-Flow UI (Phase 8 optional)
- Goal-Templates (Phase 8 optional)
- Notification-Banner bei Done/Failed (Phase 8 optional)
- Live-Events via SSE/WebSocket (Realtime-Layer fehlt, Polling reicht)
- Pricing-Tabelle pro Provider/Modell (kommt mit echten cost-Daten — Phase 8)

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-08-agents-phase-7-ui.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Ein frischer Subagent pro Task, Reviews dazwischen, schnelle Iteration.

**2. Inline Execution** — Tasks in dieser Session per executing-plans, Batch-Execution mit Checkpoints.

**Welcher Ansatz?**
