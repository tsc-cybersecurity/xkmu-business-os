/*
 * Manual E2E — after deploy
 *
 * 1. Seed portal_change_request_admin + portal_change_request_decision templates via
 *    Intern → CMS → E-Mail-Vorlagen → "Standard-Templates laden"
 * 2. Log in as Portal-User → Dashboard → "Firmendaten bearbeiten"
 * 3. Change a few fields (e.g. Telefon, Stadt) → Antrag einreichen
 * 4. Redirect to /portal/company/requests — sollte "Offen" Badge zeigen
 * 5. Log out, log in as Admin → Sidebar "Portal-Anträge"
 * 6. Offenen Antrag klicken → Approve → Toast "Genehmigt"
 * 7. Check Task-Queue: 1x admin-Benachrichtigung (beim Submit) + 1x decision-Email (beim
 *    Approve) — sollten da sein, kann man manuell ausführen oder warten auf Cron
 * 8. Log in wieder als Portal-User → /portal/company — aktualisierte Werte sichtbar
 * 9. /portal/company/requests — Antrag jetzt "Genehmigt"
 * 10. Neuen Antrag einreichen → als Admin ablehnen mit Kommentar
 * 11. Portal-User sieht "Abgelehnt" + Kommentar
 * 12. DB-Spot-Check:
 *     SELECT action, entity_type, created_at FROM audit_logs
 *     WHERE action LIKE '%change_request%' ORDER BY created_at DESC LIMIT 10;
 *     — 4 Einträge (submit + approve + submit + reject + cancellations ggf.)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestDb } from './setup/test-db'
import type { TestDb } from './setup/test-db'

// session.ts uses next/headers cookies() — mock harmlessly
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('Company change-request flow — real DB', () => {
  let db: TestDb
  let companyId: string
  let portalUserId: string
  let adminUserId: string
  let createdRequestIds: string[] = []

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-xyz'
    db = createTestDb()

    const { companies, users } = await import('@/lib/db/schema')
    const { UserService } = await import('@/lib/services/user.service')
    const bcrypt = await import('bcryptjs')

    // Create test company
    const [c] = await db.insert(companies).values({
      name: `CCR Test GmbH ${Date.now()} ffff`,
    }).returning()
    companyId = c.id

    // Create portal user (via UserService)
    const portalUser = await UserService.createPortalUser({
      companyId,
      firstName: 'CCR',
      lastName: 'Portal',
      email: `ccr-portal-${Date.now()}@test-ffff.invalid`,
      method: 'password',
      password: 'TestPortalPw12345',
    })
    portalUserId = portalUser.id

    // Create admin user manually (no UserService helper)
    const [admin] = await db.insert(users).values({
      email: `ccr-admin-${Date.now()}@test-ffff.invalid`,
      passwordHash: await bcrypt.default.hash('admin-pw-x', 10),
      firstName: 'CCR',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
    }).returning()
    adminUserId = admin.id
  })

  afterAll(async () => {
    const { companyChangeRequests, users, companies } = await import('@/lib/db/schema')
    const { eq, inArray } = await import('drizzle-orm')
    try {
      if (createdRequestIds.length > 0) {
        await db.delete(companyChangeRequests).where(inArray(companyChangeRequests.id, createdRequestIds))
      }
    } catch { /* ignore */ }
    try {
      if (portalUserId) await db.delete(users).where(eq(users.id, portalUserId))
      if (adminUserId) await db.delete(users).where(eq(users.id, adminUserId))
    } catch { /* ignore */ }
    try {
      if (companyId) await db.delete(companies).where(eq(companies.id, companyId))
    } catch { /* ignore */ }
  })

  it('creates a change-request and blocks duplicates while pending', async () => {
    const { CompanyChangeRequestService } = await import('@/lib/services/company-change-request.service')

    const req1 = await CompanyChangeRequestService.create({
      companyId,
      requestedBy: portalUserId,
      proposedChanges: { street: 'Neue Straße 1', phone: '+49 30 111111' },
    })
    createdRequestIds.push(req1.id)
    expect(req1.status).toBe('pending')
    expect(req1.companyId).toBe(companyId)

    // Second create while pending → throws
    await expect(CompanyChangeRequestService.create({
      companyId,
      requestedBy: portalUserId,
      proposedChanges: { city: 'Berlin' },
    })).rejects.toThrow(/PENDING_REQUEST_EXISTS/)
  })

  it('admin approves a pending request and applies the diff to companies', async () => {
    const { CompanyChangeRequestService } = await import('@/lib/services/company-change-request.service')
    const { CompanyService } = await import('@/lib/services/company.service')

    // Use the pending request from the previous test
    const pending = (await CompanyChangeRequestService.list({ companyId, status: 'pending' }))[0]
    expect(pending).toBeTruthy()

    const approved = await CompanyChangeRequestService.approve(pending.id, adminUserId)
    expect(approved.status).toBe('approved')
    expect(approved.reviewedBy).toBe(adminUserId)
    expect(approved.reviewedAt).toBeTruthy()

    // Company now has the new values
    const company = await CompanyService.getById(companyId)
    expect(company?.street).toBe('Neue Straße 1')
    expect(company?.phone).toBe('+49 30 111111')
  })

  it('admin rejects a pending request with a comment and leaves company unchanged', async () => {
    const { CompanyChangeRequestService } = await import('@/lib/services/company-change-request.service')
    const { CompanyService } = await import('@/lib/services/company.service')

    // Create a new pending request
    const req2 = await CompanyChangeRequestService.create({
      companyId,
      requestedBy: portalUserId,
      proposedChanges: { city: 'Hamburg', postalCode: '20095' },
    })
    createdRequestIds.push(req2.id)

    const before = await CompanyService.getById(companyId)

    const rejected = await CompanyChangeRequestService.reject(req2.id, adminUserId, 'Adresse bitte mit Belegen einreichen.')
    expect(rejected.status).toBe('rejected')
    expect(rejected.reviewComment).toBe('Adresse bitte mit Belegen einreichen.')

    // Company unchanged
    const after = await CompanyService.getById(companyId)
    expect(after?.city).toBe(before?.city)
    expect(after?.postalCode).toBe(before?.postalCode)
  })

  it('approve on non-pending throws NOT_PENDING', async () => {
    const { CompanyChangeRequestService } = await import('@/lib/services/company-change-request.service')
    // Use the already-approved request from the approve test
    const approvedList = await CompanyChangeRequestService.list({ companyId, status: 'approved' })
    expect(approvedList[0]).toBeTruthy()

    await expect(CompanyChangeRequestService.approve(approvedList[0].id, adminUserId))
      .rejects.toThrow(/NOT_PENDING/)
  })

  it('cancel a pending request deletes it (owner-only)', async () => {
    const { CompanyChangeRequestService } = await import('@/lib/services/company-change-request.service')

    const req3 = await CompanyChangeRequestService.create({
      companyId,
      requestedBy: portalUserId,
      proposedChanges: { website: 'https://example.com' },
    })
    createdRequestIds.push(req3.id)

    const ok = await CompanyChangeRequestService.cancel(req3.id, portalUserId)
    expect(ok).toBe(true)

    // Already deleted → second cancel is no-op (returns false)
    const okAgain = await CompanyChangeRequestService.cancel(req3.id, portalUserId)
    expect(okAgain).toBe(false)
  })
})
