import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 123 }),
}))

vi.mock('@/lib/services/portal-document-category.service', () => ({
  PortalDocumentCategoryService: { getById: vi.fn() },
}))

describe('PortalDocumentService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    dbMock = setupDbMock()
  })

  async function getSvc() {
    const mod = await import('@/lib/services/portal-document.service')
    return mod.PortalDocumentService
  }

  async function mkFile(type: string, size = 100) {
    const buf = new Uint8Array(size)
    return new File([buf], 'test.pdf', { type })
  }

  describe('upload', () => {
    it('rejects file above size limit', async () => {
      const svc = await getSvc()
      const file = await mkFile('application/pdf', 11 * 1024 * 1024)
      await expect(svc.upload({
        companyId: 'c1', categoryId: 'cat1', direction: 'portal_to_admin',
        uploaderUserId: 'u1', uploaderRole: 'portal_user', file,
      })).rejects.toThrow(/10 MB|groß/i)
    })

    it('rejects unsupported MIME type', async () => {
      const svc = await getSvc()
      const file = await mkFile('application/x-msdownload', 100)
      await expect(svc.upload({
        companyId: 'c1', categoryId: 'cat1', direction: 'portal_to_admin',
        uploaderUserId: 'u1', uploaderRole: 'portal_user', file,
      })).rejects.toThrow(/MIME|Dateityp/i)
    })

    it('rejects when category direction does not match room', async () => {
      const { PortalDocumentCategoryService } = await import('@/lib/services/portal-document-category.service')
      ;(PortalDocumentCategoryService.getById as any).mockResolvedValueOnce({
        id: 'cat1', direction: 'admin_to_portal', deletedAt: null,
      })
      const svc = await getSvc()
      const file = await mkFile('application/pdf', 100)
      await expect(svc.upload({
        companyId: 'c1', categoryId: 'cat1', direction: 'portal_to_admin',
        uploaderUserId: 'u1', uploaderRole: 'portal_user', file,
      })).rejects.toThrow(/Kategorie|direction/i)
    })

    it('accepts matching room (both-direction category)', async () => {
      const { PortalDocumentCategoryService } = await import('@/lib/services/portal-document-category.service')
      ;(PortalDocumentCategoryService.getById as any).mockResolvedValueOnce({
        id: 'cat1', direction: 'both', deletedAt: null,
      })
      dbMock.mockInsert.mockResolvedValueOnce([{
        id: 'd1', companyId: 'c1', categoryId: 'cat1', direction: 'portal_to_admin',
        fileName: 'test.pdf', storagePath: 'portal-docs/2026/04/x.pdf',
        mimeType: 'application/pdf', sizeBytes: 100,
        uploadedByUserId: 'u1', uploaderRole: 'portal_user',
      }])
      const svc = await getSvc()
      const file = await mkFile('application/pdf', 100)
      const doc = await svc.upload({
        companyId: 'c1', categoryId: 'cat1', direction: 'portal_to_admin',
        uploaderUserId: 'u1', uploaderRole: 'portal_user', file,
      })
      expect(doc.id).toBe('d1')
    })
  })

  describe('softDelete', () => {
    it('portal_user can only delete own uploads in portal_to_admin room', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([{
        id: 'd1', companyId: 'c1', direction: 'portal_to_admin',
        uploadedByUserId: 'other', deletedAt: null,
      }])
      const svc = await getSvc()
      await expect(svc.softDelete({
        documentId: 'd1', actorUserId: 'u1', actorRole: 'portal_user',
      })).rejects.toThrow(/eigene|berechtigt/i)
    })

    it('admin can delete in both directions', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([{
        id: 'd1', companyId: 'c1', direction: 'admin_to_portal',
        uploadedByUserId: 'adminX', deletedAt: null,
      }])
      dbMock.mockUpdate.mockResolvedValueOnce([{ id: 'd1', deletedAt: new Date() }])
      const svc = await getSvc()
      const result = await svc.softDelete({
        documentId: 'd1', actorUserId: 'admin1', actorRole: 'admin',
      })
      expect(result.id).toBe('d1')
    })
  })
})
