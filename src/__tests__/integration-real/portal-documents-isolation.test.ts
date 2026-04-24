/**
 * ## Manual E2E (after deploy)
 *
 * Cross-company isolation for portal documents:
 * 1. Admin lädt Dokument für Firma A hoch
 * 2. Portal-User von Firma B ruft Dokumentenliste auf → Firma-A-Dokument nicht sichtbar
 * 3. Direktzugriff via ID → Dokument gehört companyA, nicht companyB
 * 4. DB-Check: SELECT company_id, file_name FROM portal_documents ORDER BY created_at DESC LIMIT 5;
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

const TEST_UPLOADS_DIR = path.join(process.cwd(), '.test-uploads-docs-isolation')
process.env.MEDIA_UPLOAD_DIR = TEST_UPLOADS_DIR

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('Portal documents cross-company isolation — real DB', () => {
  let db: TestDb
  let companyA: string
  let companyB: string
  let adminUserId: string
  let adminCatId: string
  let docInA: string

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-xyz'
    db = createTestDb()

    const { companies, users, portalDocumentCategories } = await import('@/lib/db/schema')
    const bcrypt = await import('bcryptjs')

    const [a] = await db.insert(companies).values({
      name: `Iso-Doc-A ${Date.now()} ffff`,
    }).returning()
    companyA = a.id

    const [b] = await db.insert(companies).values({
      name: `Iso-Doc-B ${Date.now()} ffff`,
    }).returning()
    companyB = b.id

    const [admin] = await db.insert(users).values({
      email: `iso-doc-admin-${Date.now()}@test-ffff.invalid`,
      passwordHash: await bcrypt.default.hash('admin-pw-x', 10),
      firstName: 'Iso',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
    }).returning()
    adminUserId = admin.id

    const cats = await db.select().from(portalDocumentCategories)
    adminCatId = cats.find(c => c.direction === 'admin_to_portal')!.id

    // Upload one document into company A
    const { PortalDocumentService } = await import('@/lib/services/portal-document.service')
    const file = new File(
      [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
      'a.pdf',
      { type: 'application/pdf' },
    )
    const doc = await PortalDocumentService.upload({
      companyId: companyA,
      categoryId: adminCatId,
      direction: 'admin_to_portal',
      uploaderUserId: adminUserId,
      uploaderRole: 'admin',
      file,
    })
    docInA = doc.id
  })

  afterAll(async () => {
    const { portalDocuments, users, companies } = await import('@/lib/db/schema')
    const { eq, inArray } = await import('drizzle-orm')
    try {
      if (companyA) await db.delete(portalDocuments).where(eq(portalDocuments.companyId, companyA))
    } catch { /* ignore */ }
    try {
      if (adminUserId) await db.delete(users).where(eq(users.id, adminUserId))
    } catch { /* ignore */ }
    try {
      const cids = [companyA, companyB].filter(Boolean) as string[]
      if (cids.length > 0) await db.delete(companies).where(inArray(companies.id, cids))
    } catch { /* ignore */ }
    try {
      await rm(TEST_UPLOADS_DIR, { recursive: true, force: true })
    } catch { /* ignore */ }
  })

  it('list scoped to companyB does not see documents of companyA', async () => {
    const { PortalDocumentService } = await import('@/lib/services/portal-document.service')

    const list = await PortalDocumentService.list({ companyId: companyB })
    expect(list.find(d => d.id === docInA)).toBeUndefined()
  })

  it('list(companyA) contains the document', async () => {
    const { PortalDocumentService } = await import('@/lib/services/portal-document.service')

    const list = await PortalDocumentService.list({ companyId: companyA })
    expect(list.find(d => d.id === docInA)).toBeTruthy()
  })

  it('getById returns the doc, companyId confirms it belongs to A not B', async () => {
    const { PortalDocumentService } = await import('@/lib/services/portal-document.service')

    const doc = await PortalDocumentService.getById(docInA)
    expect(doc).toBeTruthy()
    expect(doc!.companyId).toBe(companyA)
    expect(doc!.companyId).not.toBe(companyB)
  })

  it('getById for non-existent id returns null', async () => {
    const { PortalDocumentService } = await import('@/lib/services/portal-document.service')

    const doc = await PortalDocumentService.getById('00000000-0000-0000-0000-000000000000')
    expect(doc).toBeNull()
  })

  it('companyB list stays empty when more documents are added to companyA', async () => {
    const { PortalDocumentService } = await import('@/lib/services/portal-document.service')

    const file = new File(
      [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
      'extra-a.pdf',
      { type: 'application/pdf' },
    )
    await PortalDocumentService.upload({
      companyId: companyA,
      categoryId: adminCatId,
      direction: 'admin_to_portal',
      uploaderUserId: adminUserId,
      uploaderRole: 'admin',
      file,
    })

    const listB = await PortalDocumentService.list({ companyId: companyB })
    expect(listB).toHaveLength(0)
  })
})
