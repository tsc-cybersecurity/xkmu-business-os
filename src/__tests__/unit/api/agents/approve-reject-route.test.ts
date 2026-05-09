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
