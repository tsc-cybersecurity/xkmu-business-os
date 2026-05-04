import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

describe('SlotTypeService', () => {
  beforeEach(() => vi.resetModules())

  it('list returns slot types ordered by displayOrder', async () => {
    const helper = setupDbMock()
    const rows = [
      { id: '1', userId: 'u-1', slug: 'kurz', displayOrder: 0 },
      { id: '2', userId: 'u-1', slug: 'lang', displayOrder: 1 },
    ]
    helper.selectMock.mockResolvedValueOnce(rows)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    const out = await SlotTypeService.list('u-1')
    expect(out).toHaveLength(2)
  })

  it('create inserts a new row', async () => {
    const helper = setupDbMock()
    helper.insertMock.mockResolvedValueOnce([{ id: 'new-id', userId: 'u-1', slug: 'erstgespraech' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    const out = await SlotTypeService.create('u-1', {
      slug: 'erstgespraech', name: 'Erstgespräch', durationMinutes: 30,
    })
    expect(out.id).toBe('new-id')
  })

  it('update applies partial fields', async () => {
    const helper = setupDbMock()
    helper.updateMock.mockResolvedValueOnce([{ id: 'st-1', name: 'Neu' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    const out = await SlotTypeService.update('st-1', { name: 'Neu' })
    expect(out.name).toBe('Neu')
  })

  it('delete removes by id', async () => {
    const helper = setupDbMock()
    helper.deleteMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    await SlotTypeService.delete('st-1')
    expect(helper.db.delete).toHaveBeenCalled()
  })

  it('reorder sets displayOrder for each id', async () => {
    const helper = setupDbMock()
    helper.updateMock.mockResolvedValueOnce(undefined)
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    await SlotTypeService.reorder('u-1', ['b', 'a'])
    expect(helper.db.update).toHaveBeenCalledTimes(2)
  })
})
