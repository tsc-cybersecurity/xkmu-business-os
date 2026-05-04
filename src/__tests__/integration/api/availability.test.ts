import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, fn) => fn({ userId: 'u-1', role: 'owner' })),
}))
vi.mock('@/lib/services/availability.service', () => ({
  AvailabilityService: {
    listRules: vi.fn(), createRule: vi.fn(), updateRule: vi.fn(), deleteRule: vi.fn(),
    listOverrides: vi.fn(), createOverride: vi.fn(), deleteOverride: vi.fn(),
  },
}))

const ownedRule = { id: 'r-1', userId: 'u-1', dayOfWeek: 1, startTime: '09:00:00', endTime: '17:00:00' }
const otherRule = { id: 'r-2', userId: 'OTHER', dayOfWeek: 1, startTime: '09:00:00', endTime: '17:00:00' }

describe('Availability Rules API', () => {
  beforeEach(() => vi.resetModules())

  it('GET /api/v1/availability/rules returns own rules', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([ownedRule] as never)
    const { GET } = await import('@/app/api/v1/availability/rules/route')
    const res = await GET(new Request('https://x/api/v1/availability/rules') as never)
    expect(res.status).toBe(200)
  })

  it('POST creates a rule', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.createRule).mockResolvedValueOnce(ownedRule as never)
    const { POST } = await import('@/app/api/v1/availability/rules/route')
    const req = new Request('https://x/api/v1/availability/rules', {
      method: 'POST',
      body: JSON.stringify({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(201)
  })

  it('POST 400 when end_time <= start_time', async () => {
    const { POST } = await import('@/app/api/v1/availability/rules/route')
    const req = new Request('https://x/api/v1/availability/rules', {
      method: 'POST',
      body: JSON.stringify({ dayOfWeek: 1, startTime: '17:00', endTime: '09:00' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('PATCH enforces ownership via listRules', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([otherRule] as never)
    const { PATCH } = await import('@/app/api/v1/availability/rules/[id]/route')
    const req = new Request('https://x/api/v1/availability/rules/r-2', {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PATCH(req as never, { params: Promise.resolve({ id: 'r-2' }) } as never)
    expect(res.status).toBe(404)
  })

  it('DELETE removes own rule', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([ownedRule] as never)
    const { DELETE } = await import('@/app/api/v1/availability/rules/[id]/route')
    const res = await DELETE(
      new Request('https://x/api/v1/availability/rules/r-1', { method: 'DELETE' }) as never,
      { params: Promise.resolve({ id: 'r-1' }) } as never,
    )
    expect(res.status).toBe(200)
    expect(AvailabilityService.deleteRule).toHaveBeenCalledWith('r-1')
  })
})

describe('Availability Overrides API', () => {
  beforeEach(() => vi.resetModules())

  it('GET returns overrides, optional date filter', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listOverrides).mockResolvedValueOnce([] as never)
    const { GET } = await import('@/app/api/v1/availability/overrides/route')
    const res = await GET(new Request('https://x/api/v1/availability/overrides?from=2026-05-01&to=2026-05-31') as never)
    expect(res.status).toBe(200)
  })

  it('POST creates a block override', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.createOverride).mockResolvedValueOnce({ id: 'o-1', kind: 'block' } as never)
    const { POST } = await import('@/app/api/v1/availability/overrides/route')
    const req = new Request('https://x/api/v1/availability/overrides', {
      method: 'POST',
      body: JSON.stringify({
        startAt: '2026-12-24T00:00:00.000Z',
        endAt: '2026-12-26T23:59:59.000Z',
        kind: 'block',
        reason: 'Weihnachten',
      }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(201)
  })
})
