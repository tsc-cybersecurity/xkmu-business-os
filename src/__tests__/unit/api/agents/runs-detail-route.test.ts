import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Auth mock ──────────────────────────────────────────────────────────────
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'admin' } }),
}))

// ── DB mock ────────────────────────────────────────────────────────────────
const dbSelectMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => dbSelectMock(),
          orderBy: () => dbSelectMock(),
        }),
        orderBy: () => dbSelectMock(),
      }),
    }),
  },
}))

// drizzle-orm eq/desc stubs
vi.mock('drizzle-orm', () => ({
  eq: (_col: unknown, _val: unknown) => 'eq-stub',
  desc: (_col: unknown) => 'desc-stub',
}))

// schema stubs (columns are opaque objects — only identity matters)
vi.mock('@/lib/db/schema', () => ({
  agentRuns: { id: 'agentRuns.id' },
  agentSteps: { runId: 'agentSteps.runId', createdAt: 'agentSteps.createdAt' },
  agentCostEvents: { runId: 'agentCostEvents.runId', occurredAt: 'agentCostEvents.occurredAt' },
}))

// ── Fixtures ───────────────────────────────────────────────────────────────
const MOCK_RUN = {
  id: 'run-1',
  goalId: 'goal-1',
  attempt: 1,
  status: 'completed',
  startedAt: new Date('2026-05-01T10:00:00Z'),
  finishedAt: new Date('2026-05-01T10:05:00Z'),
  costCents: 42,
  createdAt: new Date('2026-05-01T10:00:00Z'),
  updatedAt: new Date('2026-05-01T10:05:00Z'),
}

const MOCK_STEPS = [
  { id: 's1', runId: 'run-1', stepKey: 'research', workerType: 'researcher', status: 'completed', dependsOnStepKeys: [] },
  { id: 's2', runId: 'run-1', stepKey: 'write', workerType: 'writer', status: 'completed', dependsOnStepKeys: ['research'] },
]

const MOCK_EVENTS = [
  { id: 'e1', runId: 'run-1', provider: 'gemini', model: 'gemini-2.5-flash', costCents: 42, occurredAt: new Date() },
]

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/agents/runs/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('liefert Run + Steps + CostEvents bei gueltigem Run', async () => {
    // First call → run lookup, second → steps, third → cost events
    dbSelectMock
      .mockResolvedValueOnce([MOCK_RUN])
      .mockResolvedValueOnce(MOCK_STEPS)
      .mockResolvedValueOnce(MOCK_EVENTS)

    const { GET } = await import('@/app/api/agents/runs/[id]/route')
    const req = new Request('http://x/api/agents/runs/run-1')
    const res = await GET(req as unknown as import('next/server').NextRequest, {
      params: Promise.resolve({ id: 'run-1' }),
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.run.id).toBe('run-1')
    expect(data.steps).toHaveLength(2)
    expect(data.costEvents).toHaveLength(1)
  })

  it('404 wenn Run nicht existiert', async () => {
    dbSelectMock.mockResolvedValueOnce([]) // run not found

    const { GET } = await import('@/app/api/agents/runs/[id]/route')
    const req = new Request('http://x/api/agents/runs/nonexistent')
    const res = await GET(req as unknown as import('next/server').NextRequest, {
      params: Promise.resolve({ id: 'nonexistent' }),
    })

    expect(res.status).toBe(404)
  })

  it('401 ohne Session', async () => {
    const { getSession } = await import('@/lib/auth/session')
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const { GET } = await import('@/app/api/agents/runs/[id]/route')
    const req = new Request('http://x/api/agents/runs/run-1')
    const res = await GET(req as unknown as import('next/server').NextRequest, {
      params: Promise.resolve({ id: 'run-1' }),
    })

    expect(res.status).toBe(401)
  })
})
