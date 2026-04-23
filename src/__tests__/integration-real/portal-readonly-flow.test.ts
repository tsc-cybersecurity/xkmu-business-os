import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestDb } from './setup/test-db'
import type { TestDb } from './setup/test-db'

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('Portal read-only isolation — real DB', () => {
  let db: TestDb
  let companyAId: string
  let companyBId: string
  let contractAId: string
  let contractBId: string
  let projectAActiveId: string
  let projectAArchivedId: string
  let projectBId: string

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-xyz'
    db = createTestDb()

    const { companies, documents, projects } = await import('@/lib/db/schema')

    const [a] = await db.insert(companies).values({
      name: `Portal-RO-Test-A ${Date.now()} ffff`,
    }).returning()
    companyAId = a.id

    const [b] = await db.insert(companies).values({
      name: `Portal-RO-Test-B ${Date.now()} ffff`,
    }).returning()
    companyBId = b.id

    const [ca] = await db.insert(documents).values({
      type: 'contract',
      number: `RO-TEST-A-${Date.now()}`,
      companyId: companyAId,
      status: 'active',
      total: '1000.00',
    }).returning()
    contractAId = ca.id

    const [cb] = await db.insert(documents).values({
      type: 'contract',
      number: `RO-TEST-B-${Date.now()}`,
      companyId: companyBId,
      status: 'active',
      total: '2000.00',
    }).returning()
    contractBId = cb.id

    const [paActive] = await db.insert(projects).values({
      name: `RO Project A Active ${Date.now()}`,
      companyId: companyAId,
      status: 'active',
    }).returning()
    projectAActiveId = paActive.id

    const [paArchived] = await db.insert(projects).values({
      name: `RO Project A Archived ${Date.now()}`,
      companyId: companyAId,
      status: 'archived',
    }).returning()
    projectAArchivedId = paArchived.id

    const [pb] = await db.insert(projects).values({
      name: `RO Project B ${Date.now()}`,
      companyId: companyBId,
      status: 'active',
    }).returning()
    projectBId = pb.id
  })

  afterAll(async () => {
    const { companies, documents, projects } = await import('@/lib/db/schema')
    const { inArray } = await import('drizzle-orm')
    try {
      if (contractAId || contractBId) {
        await db.delete(documents).where(inArray(documents.id, [contractAId, contractBId].filter(Boolean) as string[]))
      }
    } catch { /* ignore */ }
    try {
      const pids = [projectAActiveId, projectAArchivedId, projectBId].filter(Boolean) as string[]
      if (pids.length > 0) await db.delete(projects).where(inArray(projects.id, pids))
    } catch { /* ignore */ }
    try {
      const cids = [companyAId, companyBId].filter(Boolean) as string[]
      if (cids.length > 0) await db.delete(companies).where(inArray(companies.id, cids))
    } catch { /* ignore */ }
  })

  it('contracts list for company A returns only A-owned contracts', async () => {
    const { documents } = await import('@/lib/db/schema')
    const { eq, and } = await import('drizzle-orm')
    const rows = await db.select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.type, 'contract'), eq(documents.companyId, companyAId)))
    const ids = rows.map((r) => r.id)
    expect(ids).toContain(contractAId)
    expect(ids).not.toContain(contractBId)
  })

  it('contract detail WHERE-clause with wrong companyId returns no row', async () => {
    const { documents } = await import('@/lib/db/schema')
    const { eq, and } = await import('drizzle-orm')
    // Portal-User of A tries to load Contract B via /portal/me/contracts/[B-id]
    const rows = await db.select({ id: documents.id })
      .from(documents)
      .where(and(
        eq(documents.id, contractBId),
        eq(documents.type, 'contract'),
        eq(documents.companyId, companyAId),
      ))
      .limit(1)
    expect(rows).toHaveLength(0)  // route would return apiNotFound
  })

  it('projects list for company A returns only A active projects (not archived, not B)', async () => {
    const { projects } = await import('@/lib/db/schema')
    const { eq, and, ne } = await import('drizzle-orm')
    const rows = await db.select({ id: projects.id })
      .from(projects)
      .where(and(
        eq(projects.companyId, companyAId),
        ne(projects.status, 'archived'),
      ))
    const ids = rows.map((r) => r.id)
    expect(ids).toContain(projectAActiveId)
    expect(ids).not.toContain(projectAArchivedId)
    expect(ids).not.toContain(projectBId)
  })

  it('project detail WHERE-clause with archived project returns no row', async () => {
    const { projects } = await import('@/lib/db/schema')
    const { eq, and, ne } = await import('drizzle-orm')
    // Portal-User of A tries to load the archived project
    const rows = await db.select({ id: projects.id })
      .from(projects)
      .where(and(
        eq(projects.id, projectAArchivedId),
        eq(projects.companyId, companyAId),
        ne(projects.status, 'archived'),
      ))
      .limit(1)
    expect(rows).toHaveLength(0)
  })

  it('project detail WHERE-clause with wrong company returns no row', async () => {
    const { projects } = await import('@/lib/db/schema')
    const { eq, and, ne } = await import('drizzle-orm')
    const rows = await db.select({ id: projects.id })
      .from(projects)
      .where(and(
        eq(projects.id, projectBId),
        eq(projects.companyId, companyAId),
        ne(projects.status, 'archived'),
      ))
      .limit(1)
    expect(rows).toHaveLength(0)
  })
})
