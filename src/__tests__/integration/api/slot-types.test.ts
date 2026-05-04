import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, fn) => fn({ userId: 'u-1', role: 'owner' })),
}))
vi.mock('@/lib/services/slot-type.service', () => ({
  SlotTypeService: {
    list: vi.fn(),
    listActive: vi.fn(),
    getById: vi.fn(),
    getByUserAndSlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
  },
}))

describe('Slot-Types API', () => {
  beforeEach(() => vi.resetModules())

  it('GET /api/v1/slot-types returns own slot types', async () => {
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.list).mockResolvedValueOnce([{ id: '1', name: 'Erst' } as never])
    const { GET } = await import('@/app/api/v1/slot-types/route')
    const res = await GET(new Request('https://x/api/v1/slot-types') as never)
    expect(res.status).toBe(200)
    expect(SlotTypeService.list).toHaveBeenCalledWith('u-1')
  })

  it('POST /api/v1/slot-types creates a new slot type', async () => {
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.create).mockResolvedValueOnce({ id: 'new', name: 'Erstgespräch' } as never)
    const { POST } = await import('@/app/api/v1/slot-types/route')
    const req = new Request('https://x/api/v1/slot-types', {
      method: 'POST',
      body: JSON.stringify({
        slug: 'erstgespraech', name: 'Erstgespräch', durationMinutes: 30,
      }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(201)
  })

  it('POST returns 400 for invalid body', async () => {
    const { POST } = await import('@/app/api/v1/slot-types/route')
    const req = new Request('https://x/api/v1/slot-types', {
      method: 'POST',
      body: JSON.stringify({ slug: 'a' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('PATCH /api/v1/slot-types/[id] returns 404 for foreign slot type', async () => {
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.getById).mockResolvedValueOnce({ id: 'st-1', userId: 'OTHER-USER' } as never)
    const { PATCH } = await import('@/app/api/v1/slot-types/[id]/route')
    const req = new Request('https://x/api/v1/slot-types/st-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'X' }),
    })
    const res = await PATCH(req as never, { params: Promise.resolve({ id: 'st-1' }) } as never)
    expect(res.status).toBe(404)
  })

  it('DELETE /api/v1/slot-types/[id] removes own slot type', async () => {
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.getById).mockResolvedValueOnce({ id: 'st-1', userId: 'u-1' } as never)
    const { DELETE } = await import('@/app/api/v1/slot-types/[id]/route')
    const res = await DELETE(
      new Request('https://x/api/v1/slot-types/st-1', { method: 'DELETE' }) as never,
      { params: Promise.resolve({ id: 'st-1' }) } as never,
    )
    expect(res.status).toBe(200)
    expect(SlotTypeService.delete).toHaveBeenCalledWith('st-1')
  })

  it('POST /api/v1/slot-types/reorder updates display order', async () => {
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    const { POST } = await import('@/app/api/v1/slot-types/reorder/route')
    const req = new Request('https://x/api/v1/slot-types/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids: [crypto.randomUUID(), crypto.randomUUID()] }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(SlotTypeService.reorder).toHaveBeenCalled()
  })
})
