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
