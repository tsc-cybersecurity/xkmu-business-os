import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext, mockAuthForbidden } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture,
  companyFixture,
  createCompanyInput,
  TEST_TENANT_ID,
  TEST_COMPANY_ID,
} from '../../helpers/fixtures'

// Mock webhook service
vi.mock('@/lib/services/webhook.service', () => ({
  WebhookService: { fire: vi.fn().mockResolvedValue(undefined) },
}))

// ─── POST /api/v1/companies ───────────────────────────────────────────────────

describe('POST /api/v1/companies', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/route')
    return mod.POST
  }

  it('returns 201 with valid data', async () => {
    const fixture = companyFixture()
    // checkDuplicate: no match
    dbMock.mockSelect.mockResolvedValue([])
    // create: returns new company
    dbMock.mockInsert.mockResolvedValue([fixture])

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', createCompanyInput())
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('Test GmbH')
  })

  it('returns 400 with invalid data', async () => {
    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', {})
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 409 when duplicate detected', async () => {
    const existing = companyFixture()
    dbMock.mockSelect.mockResolvedValue([existing])

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', createCompanyInput())
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error.code).toBe('DUPLICATE_COMPANY')
  })

  it('calls WebhookService.fire on success', async () => {
    const fixture = companyFixture()
    dbMock.mockSelect.mockResolvedValue([])
    dbMock.mockInsert.mockResolvedValue([fixture])

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', createCompanyInput())
    await handler(req)

    const { WebhookService } = await import('@/lib/services/webhook.service')
    expect(WebhookService.fire).toHaveBeenCalled()
  })
})

describe('POST /api/v1/companies - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(null)

    const mod = await import('@/app/api/v1/companies/route')
    const req = createTestRequest('POST', '/api/v1/companies', createCompanyInput())
    const res = await mod.POST(req)

    expect(res.status).toBe(401)
  })

  it('returns 403 as viewer', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthForbidden()

    const mod = await import('@/app/api/v1/companies/route')
    const req = createTestRequest('POST', '/api/v1/companies', createCompanyInput())
    const res = await mod.POST(req)

    expect(res.status).toBe(403)
  })
})

// ─── GET /api/v1/companies ────────────────────────────────────────────────────

describe('GET /api/v1/companies', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/route')
    return mod.GET
  }

  it('returns 200 with paginated list', async () => {
    const fixtures = [companyFixture()]
    dbMock.mockSelect.mockResolvedValueOnce(fixtures)
    dbMock.mockSelect.mockResolvedValueOnce([{ count: 1 }])

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/companies')
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.meta.total).toBe(1)
  })
})

describe('GET /api/v1/companies - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(null)

    const mod = await import('@/app/api/v1/companies/route')
    const req = createTestRequest('GET', '/api/v1/companies')
    const res = await mod.GET(req)

    expect(res.status).toBe(401)
  })
})

// ─── GET /api/v1/companies/[id] ──────────────────────────────────────────────

describe('GET /api/v1/companies/[id]', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/[id]/route')
    return mod.GET
  }

  it('returns 200 with company', async () => {
    dbMock.mockSelect.mockResolvedValue([companyFixture()])

    const handler = await getHandler()
    const req = createTestRequest('GET', `/api/v1/companies/${TEST_COMPANY_ID}`)
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(TEST_COMPANY_ID)
  })

  it('returns 404 when not found', async () => {
    dbMock.mockSelect.mockResolvedValue([])

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/companies/nonexistent')
    const res = await handler(req, createTestParams('nonexistent'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

describe('GET /api/v1/companies/[id] - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(null)

    const mod = await import('@/app/api/v1/companies/[id]/route')
    const req = createTestRequest('GET', `/api/v1/companies/${TEST_COMPANY_ID}`)
    const res = await mod.GET(req, createTestParams(TEST_COMPANY_ID))

    expect(res.status).toBe(401)
  })
})

// ─── PUT /api/v1/companies/[id] ──────────────────────────────────────────────

describe('PUT /api/v1/companies/[id]', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/[id]/route')
    return mod.PUT
  }

  it('returns 200 with valid update', async () => {
    const updated = companyFixture({ name: 'Updated GmbH' })
    dbMock.mockUpdate.mockResolvedValue([updated])

    const handler = await getHandler()
    const req = createTestRequest('PUT', `/api/v1/companies/${TEST_COMPANY_ID}`, { name: 'Updated GmbH' })
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.name).toBe('Updated GmbH')
  })

  it('returns 400 with invalid data', async () => {
    const handler = await getHandler()
    const req = createTestRequest('PUT', `/api/v1/companies/${TEST_COMPANY_ID}`, { name: 'A'.repeat(256) })
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when not found', async () => {
    dbMock.mockUpdate.mockResolvedValue([])

    const handler = await getHandler()
    const req = createTestRequest('PUT', '/api/v1/companies/nonexistent', { name: 'Test' })
    const res = await handler(req, createTestParams('nonexistent'))

    expect((await res.json()).error.code).toBe('NOT_FOUND')
  })

  it('returns 200 as member (members can update)', async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture({ role: 'member' }))

    const updated = companyFixture({ name: 'Member Update' })
    dbMock.mockUpdate.mockResolvedValue([updated])

    const mod = await import('@/app/api/v1/companies/[id]/route')
    const req = createTestRequest('PUT', `/api/v1/companies/${TEST_COMPANY_ID}`, { name: 'Member Update' })
    const res = await mod.PUT(req, createTestParams(TEST_COMPANY_ID))

    expect(res.status).toBe(200)
  })
})

describe('PUT /api/v1/companies/[id] - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(null)

    const mod = await import('@/app/api/v1/companies/[id]/route')
    const req = createTestRequest('PUT', `/api/v1/companies/${TEST_COMPANY_ID}`, { name: 'Test' })
    const res = await mod.PUT(req, createTestParams(TEST_COMPANY_ID))

    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/v1/companies/[id] ───────────────────────────────────────────

describe('DELETE /api/v1/companies/[id]', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/[id]/route')
    return mod.DELETE
  }

  it('returns 200 on successful delete', async () => {
    dbMock.mockDelete.mockResolvedValue([{ id: TEST_COMPANY_ID }])

    const handler = await getHandler()
    const req = createTestRequest('DELETE', `/api/v1/companies/${TEST_COMPANY_ID}`)
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 404 when not found', async () => {
    dbMock.mockDelete.mockResolvedValue([])

    const handler = await getHandler()
    const req = createTestRequest('DELETE', '/api/v1/companies/nonexistent')
    const res = await handler(req, createTestParams('nonexistent'))

    expect((await res.json()).error.code).toBe('NOT_FOUND')
  })
})

describe('DELETE /api/v1/companies/[id] - auth', () => {
  it('returns 401 without auth', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(null)

    const mod = await import('@/app/api/v1/companies/[id]/route')
    const req = createTestRequest('DELETE', `/api/v1/companies/${TEST_COMPANY_ID}`)
    const res = await mod.DELETE(req, createTestParams(TEST_COMPANY_ID))

    expect(res.status).toBe(401)
  })

  it('returns 403 as member', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthForbidden()

    const mod = await import('@/app/api/v1/companies/[id]/route')
    const req = createTestRequest('DELETE', `/api/v1/companies/${TEST_COMPANY_ID}`)
    const res = await mod.DELETE(req, createTestParams(TEST_COMPANY_ID))

    expect(res.status).toBe(403)
  })
})
