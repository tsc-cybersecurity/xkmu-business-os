import { describe, it, expect, vi } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { createTestRequest } from '../../helpers/mock-request'

// Mock withPermission to return 401 for all routes (simulating no-auth)
function mockAuthUnauthorized() {
  vi.doMock('@/lib/auth/require-permission', () => ({
    withPermission: vi.fn().mockImplementation(async () =>
      Response.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      ),
    ),
  }))
}

// ─── Test 1: POST /api/v1/companies/[id]/research ─────────────────────────────

describe('POST /api/v1/companies/[id]/research - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/companies/[id]/research/route')
    const req = createTestRequest('POST', '/api/v1/companies/test-id/research', {})
    const res = await mod.POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(401)
  })
})

// ─── Test 2: POST /api/v1/email/send ─────────────────────────────────────────

describe('POST /api/v1/email/send - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/email/send/route')
    const req = createTestRequest('POST', '/api/v1/email/send', {})
    const res = await mod.POST(req)

    expect(res.status).toBe(401)
  })
})

// ─── Test 3: GET /api/v1/export/database ─────────────────────────────────────

describe('GET /api/v1/export/database - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/export/database/route')
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await mod.GET(req)

    expect(res.status).toBe(401)
  })
})

// ─── Test 4: POST /api/v1/import/database ────────────────────────────────────

describe('POST /api/v1/import/database - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/import/database/route')
    const req = createTestRequest('POST', '/api/v1/import/database')
    const res = await mod.POST(req)

    expect(res.status).toBe(401)
  })
})

// ─── Test 5: POST /api/v1/leads/[id]/research ────────────────────────────────

describe('POST /api/v1/leads/[id]/research - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/leads/[id]/research/route')
    const req = createTestRequest('POST', '/api/v1/leads/test-id/research', {})
    const res = await mod.POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(401)
  })
})

// ─── Test 6: POST /api/v1/leads/[id]/outreach ────────────────────────────────

describe('POST /api/v1/leads/[id]/outreach - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/leads/[id]/outreach/route')
    const req = createTestRequest('POST', '/api/v1/leads/test-id/outreach', {})
    const res = await mod.POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(401)
  })
})

// ─── Test 7: POST /api/v1/persons/[id]/research ──────────────────────────────

describe('POST /api/v1/persons/[id]/research - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/persons/[id]/research/route')
    const req = createTestRequest('POST', '/api/v1/persons/test-id/research', {})
    const res = await mod.POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(401)
  })
})

// ─── Test 8: POST /api/v1/companies/[id]/crawl ───────────────────────────────

describe('POST /api/v1/companies/[id]/crawl - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/companies/[id]/crawl/route')
    const req = createTestRequest('POST', '/api/v1/companies/test-id/crawl', {})
    const res = await mod.POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(401)
  })
})

// ─── Test 9: POST /api/v1/companies/[id]/analyze-document ────────────────────

describe('POST /api/v1/companies/[id]/analyze-document - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/companies/[id]/analyze-document/route')
    const req = createTestRequest('POST', '/api/v1/companies/test-id/analyze-document', {})
    const res = await mod.POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(401)
  })
})

// ─── Test 10: GET /api/v1/companies/[id]/persons ─────────────────────────────

describe('GET /api/v1/companies/[id]/persons - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/companies/[id]/persons/route')
    const req = createTestRequest('GET', '/api/v1/companies/test-id/persons')
    const res = await mod.GET(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(401)
  })
})

// ─── Test 11: POST /api/v1/companies/[id]/research/[researchId]/apply ────────

describe('POST /api/v1/companies/[id]/research/[researchId]/apply - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/companies/[id]/research/[researchId]/apply/route')
    const req = createTestRequest('POST', '/api/v1/companies/test-id/research/res-id/apply', {})
    const res = await mod.POST(req, { params: Promise.resolve({ id: 'test-id', researchId: 'res-id' }) })

    expect(res.status).toBe(401)
  })
})

// ─── Test 12: POST /api/v1/companies/[id]/research/[researchId]/reject ───────

describe('POST /api/v1/companies/[id]/research/[researchId]/reject - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/companies/[id]/research/[researchId]/reject/route')
    const req = createTestRequest('POST', '/api/v1/companies/test-id/research/res-id/reject', {})
    const res = await mod.POST(req, { params: Promise.resolve({ id: 'test-id', researchId: 'res-id' }) })

    expect(res.status).toBe(401)
  })
})

// ─── Test 13: POST /api/v1/ideas/[id]/convert ────────────────────────────────

describe('POST /api/v1/ideas/[id]/convert - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/ideas/[id]/convert/route')
    const req = createTestRequest('POST', '/api/v1/ideas/test-id/convert', {})
    const res = await mod.POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(401)
  })
})

// ─── Test 14: POST /api/v1/ai-prompt-templates/seed ─────────────────────────

describe('POST /api/v1/ai-prompt-templates/seed - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthUnauthorized()

    const mod = await import('@/app/api/v1/ai-prompt-templates/seed/route')
    const req = createTestRequest('POST', '/api/v1/ai-prompt-templates/seed', {})
    const res = await mod.POST(req)

    expect(res.status).toBe(401)
  })
})
