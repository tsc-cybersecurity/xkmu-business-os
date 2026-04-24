import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

describe('PortalDocumentCategoryService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getSvc() {
    const mod = await import('@/lib/services/portal-document-category.service')
    return mod.PortalDocumentCategoryService
  }

  it('listActive filters deletedAt IS NULL and orders by sortOrder', async () => {
    const svc = await getSvc()
    dbMock.mockSelect.mockResolvedValueOnce([
      { id: 'c1', name: 'Vertrag', direction: 'admin_to_portal', sortOrder: 10, isSystem: true, deletedAt: null },
    ])
    const rows = await svc.listActive('admin_to_portal')
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Vertrag')
  })

  it('create rejects invalid direction', async () => {
    const svc = await getSvc()
    await expect(svc.create({ name: 'Test', direction: 'bogus' as any }))
      .rejects.toThrow(/direction/i)
  })

  it('update blocks rename of isSystem=true category', async () => {
    const svc = await getSvc()
    dbMock.mockSelect.mockResolvedValueOnce([{ id: 'c1', isSystem: true, name: 'Vertrag' }])
    await expect(svc.update('c1', { name: 'Neu' }))
      .rejects.toThrow(/system/i)
  })

  it('softDelete blocks when active documents reference it', async () => {
    const svc = await getSvc()
    dbMock.mockSelect.mockResolvedValueOnce([{ id: 'c1', isSystem: false, name: 'X' }])
    dbMock.mockSelect.mockResolvedValueOnce([{ count: 3 }])
    await expect(svc.softDelete('c1'))
      .rejects.toThrow(/referenziert|Dokumente/i)
  })

  it('softDelete blocks isSystem category', async () => {
    const svc = await getSvc()
    dbMock.mockSelect.mockResolvedValueOnce([{ id: 'c1', isSystem: true, name: 'Sonstiges' }])
    await expect(svc.softDelete('c1'))
      .rejects.toThrow(/system/i)
  })
})
