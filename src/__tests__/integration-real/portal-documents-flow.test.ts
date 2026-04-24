/**
 * ## Manual E2E (after deploy)
 *
 * 1. Admin einloggen → Dokumente → Firma wählen → Datei hochladen (Richtung: admin_to_portal)
 * 2. Portal-User einloggen → /portal/documents → Datei aus Schritt 1 sichtbar
 * 3. Portal-User versucht Admin-Dokument zu löschen → Fehlermeldung
 * 4. Portal-User lädt eigene Datei hoch (portal_to_admin)
 * 5. Portal-User löscht eigenes Dokument → Soft-Delete (deletedAt gesetzt)
 * 6. Gelöschtes Dokument in normaler Portal-Liste nicht mehr sichtbar
 * 7. Admin sieht gelöschtes Dokument via includeDeleted=true
 * 8. DB-Check: SELECT action FROM audit_logs WHERE entity_type='portal_document' ORDER BY created_at DESC LIMIT 10;
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'path'
import { rm } from 'fs/promises'
import { createTestDb } from './setup/test-db'
import type { TestDb } from './setup/test-db'

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

const TEST_UPLOADS_DIR = path.join(process.cwd(), '.test-uploads-docs-flow')
process.env.MEDIA_UPLOAD_DIR = TEST_UPLOADS_DIR

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('Portal documents flow — real DB', () => {
  let db: TestDb
  let companyId: string
  let adminUserId: string
  let portalUserId: string
  let portalCatId: string
  let adminCatId: string

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-xyz'
    db = createTestDb()

    const { companies, users, portalDocumentCategories } = await import('@/lib/db/schema')
    const bcrypt = await import('bcryptjs')

    const [c] = await db.insert(companies).values({
      name: `DocFlow-Test ${Date.now()} ffff`,
    }).returning()
    companyId = c.id

    const [admin] = await db.insert(users).values({
      email: `doc-flow-admin-${Date.now()}@test-ffff.invalid`,
      passwordHash: await bcrypt.default.hash('admin-pw-x', 10),
      firstName: 'Doc',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
    }).returning()
    adminUserId = admin.id

    const [portalU] = await db.insert(users).values({
      email: `doc-flow-portal-${Date.now()}@test-ffff.invalid`,
      passwordHash: await bcrypt.default.hash('portal-pw-x', 10),
      firstName: 'Doc',
      lastName: 'Portal',
      role: 'portal_user',
      status: 'active',
      companyId,
    }).returning()
    portalUserId = portalU.id

    const cats = await db.select().from(portalDocumentCategories)
    portalCatId = cats.find(c => c.direction === 'portal_to_admin')!.id
    adminCatId = cats.find(c => c.direction === 'admin_to_portal')!.id
  })

  afterAll(async () => {
    const { portalDocuments, users, companies } = await import('@/lib/db/schema')
    const { eq, inArray } = await import('drizzle-orm')
    try {
      await db.delete(portalDocuments).where(eq(portalDocuments.companyId, companyId))
    } catch { /* ignore */ }
    try {
      const uids = [portalUserId, adminUserId].filter(Boolean) as string[]
      if (uids.length > 0) await db.delete(users).where(inArray(users.id, uids))
    } catch { /* ignore */ }
    try {
      if (companyId) await db.delete(companies).where(eq(companies.id, companyId))
    } catch { /* ignore */ }
    try {
      await rm(TEST_UPLOADS_DIR, { recursive: true, force: true })
    } catch { /* ignore */ }
  })

  it('admin uploads → portal lists → portal cannot delete → portal uploads → portal soft-deletes own', async () => {
    const { PortalDocumentService } = await import('@/lib/services/portal-document.service')

    // Admin uploads a document for the portal user to see
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const adminFile = new File([pdfBytes], 'von-admin.pdf', { type: 'application/pdf' })
    const adminDoc = await PortalDocumentService.upload({
      companyId,
      categoryId: adminCatId,
      direction: 'admin_to_portal',
      uploaderUserId: adminUserId,
      uploaderRole: 'admin',
      file: adminFile,
    })
    expect(adminDoc.id).toBeTruthy()
    expect(adminDoc.direction).toBe('admin_to_portal')
    expect(adminDoc.companyId).toBe(companyId)

    // Portal user can see the admin document
    const listForPortal = await PortalDocumentService.list({
      companyId,
      direction: 'admin_to_portal',
    })
    expect(listForPortal.find(d => d.id === adminDoc.id)).toBeTruthy()

    // Portal user cannot delete an admin document (wrong direction)
    await expect(PortalDocumentService.softDelete({
      documentId: adminDoc.id,
      actorUserId: portalUserId,
      actorRole: 'portal_user',
    })).rejects.toThrow(/berechtigt/i)

    // Portal user uploads own document
    const portalFile = new File([pdfBytes], 'vom-kunden.pdf', { type: 'application/pdf' })
    const portalDoc = await PortalDocumentService.upload({
      companyId,
      categoryId: portalCatId,
      direction: 'portal_to_admin',
      uploaderUserId: portalUserId,
      uploaderRole: 'portal_user',
      file: portalFile,
    })
    expect(portalDoc.id).toBeTruthy()
    expect(portalDoc.direction).toBe('portal_to_admin')

    // Portal user can soft-delete own upload
    const deleted = await PortalDocumentService.softDelete({
      documentId: portalDoc.id,
      actorUserId: portalUserId,
      actorRole: 'portal_user',
    })
    expect(deleted.deletedAt).toBeTruthy()
    expect(deleted.deletedByUserId).toBe(portalUserId)

    // Deleted document no longer visible in default list
    const afterDelete = await PortalDocumentService.list({
      companyId,
      direction: 'portal_to_admin',
      includeDeleted: false,
    })
    expect(afterDelete.find(d => d.id === portalDoc.id)).toBeUndefined()

    // Admin sees it with includeDeleted=true
    const adminSees = await PortalDocumentService.list({
      companyId,
      direction: 'portal_to_admin',
      includeDeleted: true,
    })
    expect(adminSees.find(d => d.id === portalDoc.id)).toBeTruthy()
  })

  it('double soft-delete throws', async () => {
    const { PortalDocumentService } = await import('@/lib/services/portal-document.service')

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const file = new File([pdfBytes], 'dbl-delete.pdf', { type: 'application/pdf' })
    const doc = await PortalDocumentService.upload({
      companyId,
      categoryId: portalCatId,
      direction: 'portal_to_admin',
      uploaderUserId: portalUserId,
      uploaderRole: 'portal_user',
      file,
    })

    await PortalDocumentService.softDelete({
      documentId: doc.id,
      actorUserId: portalUserId,
      actorRole: 'portal_user',
    })

    await expect(PortalDocumentService.softDelete({
      documentId: doc.id,
      actorUserId: portalUserId,
      actorRole: 'portal_user',
    })).rejects.toThrow(/bereits gelöscht/i)
  })

  it('getById returns full document record', async () => {
    const { PortalDocumentService } = await import('@/lib/services/portal-document.service')

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const file = new File([pdfBytes], 'getbyid.pdf', { type: 'application/pdf' })
    const doc = await PortalDocumentService.upload({
      companyId,
      categoryId: adminCatId,
      direction: 'admin_to_portal',
      uploaderUserId: adminUserId,
      uploaderRole: 'admin',
      file,
    })

    const fetched = await PortalDocumentService.getById(doc.id)
    expect(fetched).toBeTruthy()
    expect(fetched!.id).toBe(doc.id)
    expect(fetched!.companyId).toBe(companyId)
    expect(fetched!.mimeType).toBe('application/pdf')
    expect(fetched!.sizeBytes).toBe(pdfBytes.byteLength)
  })

  it('list without direction filter returns all directions', async () => {
    const { PortalDocumentService } = await import('@/lib/services/portal-document.service')

    const all = await PortalDocumentService.list({ companyId, includeDeleted: false })
    const dirs = [...new Set(all.map(d => d.direction))]
    // Should contain both directions (admin_to_portal docs from first test still exist)
    expect(dirs).toContain('admin_to_portal')
  })
})
