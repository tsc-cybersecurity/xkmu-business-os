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
