/**
 * ## Manual E2E (after deploy)
 *
 * 1. Portal-User einloggen → Dashboard → Chat-Kachel öffnen → "Hallo Admin"
 * 2. Admin einloggen → Sidebar "Kunden-Chat" → Firma in Liste (mit Badge) → Chat öffnen
 * 3. Admin liest (mark-read automatisch) → antwortet "Hallo Kunde"
 * 4. Portal-User refresht oder wartet max 15s → Admin-Message erscheint
 * 5. Read-Receipt (✓✓) erscheint bei Portal-Messages nach Admin-Open
 * 6. Cross-Check DB: SELECT action, entity_type FROM audit_logs WHERE action LIKE '%chat%' ORDER BY created_at DESC LIMIT 10;
 */

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

describe.skipIf(!hasTestDb)('Chat flow + cross-company isolation — real DB', () => {
  let db: TestDb
  let companyAId: string
  let companyBId: string
  let portalUserId: string
  let adminUserId: string
  const createdMessageIds: string[] = []

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-xyz'
    db = createTestDb()

    const { companies, users } = await import('@/lib/db/schema')
    const { UserService } = await import('@/lib/services/user.service')
    const bcrypt = await import('bcryptjs')

    const [a] = await db.insert(companies).values({ name: `Chat-Test-A ${Date.now()} ffff` }).returning()
    companyAId = a.id
    const [b] = await db.insert(companies).values({ name: `Chat-Test-B ${Date.now()} ffff` }).returning()
    companyBId = b.id

    const pu = await UserService.createPortalUser({
      companyId: companyAId,
      firstName: 'Chat',
      lastName: 'Tester',
      email: `chat-test-${Date.now()}@test-ffff.invalid`,
      method: 'password',
      password: 'TestChatPw12345',
    })
    portalUserId = pu.id

    const [admin] = await db.insert(users).values({
      email: `chat-admin-${Date.now()}@test-ffff.invalid`,
      passwordHash: await bcrypt.default.hash('admin-pw-x', 10),
      firstName: 'Chat',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
    }).returning()
    adminUserId = admin.id
  })

  afterAll(async () => {
    const { portalMessages, users, companies } = await import('@/lib/db/schema')
    const { eq, inArray } = await import('drizzle-orm')
    try {
      const cids = [companyAId, companyBId].filter(Boolean) as string[]
      if (cids.length > 0) {
        await db.delete(portalMessages).where(inArray(portalMessages.companyId, cids))
      }
    } catch { /* ignore */ }
    try {
      if (portalUserId) await db.delete(users).where(eq(users.id, portalUserId))
      if (adminUserId) await db.delete(users).where(eq(users.id, adminUserId))
    } catch { /* ignore */ }
    try {
      const cids = [companyAId, companyBId].filter(Boolean) as string[]
      if (cids.length > 0) await db.delete(companies).where(inArray(companies.id, cids))
    } catch { /* ignore */ }
  })

  it('portal user sends message, admin sees unread, reads it', async () => {
    const { PortalChatService } = await import('@/lib/services/portal-chat.service')

    const msg = await PortalChatService.createMessage({
      companyId: companyAId,
      senderId: portalUserId,
      senderRole: 'portal_user',
      bodyText: 'Hallo Admin, erste Nachricht.',
    })
    createdMessageIds.push(msg.id)
    expect(msg.senderRole).toBe('portal_user')
    expect(msg.companyId).toBe(companyAId)
    expect(msg.readByAdminAt).toBeNull()
    expect(msg.readByPortalAt).toBeNull()

    const unreadForAdmin = await PortalChatService.unreadCountForAdmin(companyAId)
    expect(unreadForAdmin).toBe(1)

    const list = await PortalChatService.listForCompany(companyAId)
    expect(list.map(m => m.id)).toContain(msg.id)

    const marked = await PortalChatService.markReadByAdmin(companyAId)
    expect(marked).toBe(1)

    const unreadAfter = await PortalChatService.unreadCountForAdmin(companyAId)
    expect(unreadAfter).toBe(0)
  })

  it('admin sends message, portal user sees unread, reads it', async () => {
    const { PortalChatService } = await import('@/lib/services/portal-chat.service')

    const msg = await PortalChatService.createMessage({
      companyId: companyAId,
      senderId: adminUserId,
      senderRole: 'admin',
      bodyText: 'Hallo Kunde, danke für Ihre Nachricht.',
    })
    createdMessageIds.push(msg.id)
    expect(msg.senderRole).toBe('admin')
    expect(msg.readByPortalAt).toBeNull()

    const unreadForPortal = await PortalChatService.unreadCountForPortal(companyAId)
    expect(unreadForPortal).toBe(1)

    const marked = await PortalChatService.markReadByPortal(companyAId)
    expect(marked).toBe(1)

    const unreadAfter = await PortalChatService.unreadCountForPortal(companyAId)
    expect(unreadAfter).toBe(0)
  })

  it('markReadByAdmin does not touch portal-user-read status (and vice versa)', async () => {
    const { PortalChatService } = await import('@/lib/services/portal-chat.service')

    // Portal sends another
    const portalMsg = await PortalChatService.createMessage({
      companyId: companyAId,
      senderId: portalUserId,
      senderRole: 'portal_user',
      bodyText: 'Zweite Portal-Nachricht.',
    })
    createdMessageIds.push(portalMsg.id)

    // Admin marks read — should only affect the new portal message (others already marked)
    const markedA = await PortalChatService.markReadByAdmin(companyAId)
    expect(markedA).toBe(1)

    // Portal marks read — should NOT affect the just-marked admin→portal message (readByPortalAt already set), should affect nothing new
    const markedP = await PortalChatService.markReadByPortal(companyAId)
    expect(markedP).toBe(0)
  })

  it('cross-company: company B has no messages, listForCompany(B) returns empty', async () => {
    const { PortalChatService } = await import('@/lib/services/portal-chat.service')

    const list = await PortalChatService.listForCompany(companyBId)
    expect(list).toEqual([])

    const unreadB = await PortalChatService.unreadCountForAdmin(companyBId)
    expect(unreadB).toBe(0)
  })

  it('listCompaniesWithChat returns company A with metadata', async () => {
    const { PortalChatService } = await import('@/lib/services/portal-chat.service')

    const rows = await PortalChatService.listCompaniesWithChat(false)
    const a = rows.find(r => r.companyId === companyAId)
    expect(a).toBeDefined()
    expect(a?.companyName).toMatch(/^Chat-Test-A/)
    expect(a?.lastMessageAt).toBeTruthy()
    expect(a?.lastMessagePreview).toBeTruthy()
    expect(a?.unreadCount).toBe(0)  // all marked read by now
  })

  it('listForCompany respects since parameter', async () => {
    const { PortalChatService } = await import('@/lib/services/portal-chat.service')

    const allBefore = await PortalChatService.listForCompany(companyAId)
    const lastCreatedAt = allBefore[allBefore.length - 1].createdAt

    // Use one millisecond PAST the last message → should exclude it
    const pastLast = new Date(new Date(lastCreatedAt).getTime())
    const deltaOnPoint = await PortalChatService.listForCompany(companyAId, pastLast)
    expect(deltaOnPoint.length).toBe(0)

    // Before all → should include all
    const beforeAll = new Date(0)
    const deltaAll = await PortalChatService.listForCompany(companyAId, beforeAll)
    expect(deltaAll.length).toBe(allBefore.length)
  })

  it('global unreadCountForAdmin (no companyId) reflects all unread portal messages', async () => {
    const { PortalChatService } = await import('@/lib/services/portal-chat.service')

    // Currently: all portal messages in A are read. Create a new portal message:
    const msg = await PortalChatService.createMessage({
      companyId: companyAId,
      senderId: portalUserId,
      senderRole: 'portal_user',
      bodyText: 'Drittes Portal-Message für global-count.',
    })
    createdMessageIds.push(msg.id)

    const globalUnread = await PortalChatService.unreadCountForAdmin()
    expect(globalUnread).toBeGreaterThanOrEqual(1)

    // Clean up by marking read
    await PortalChatService.markReadByAdmin(companyAId)
  })

  it('hasUnreadOnly filter in listCompaniesWithChat', async () => {
    const { PortalChatService } = await import('@/lib/services/portal-chat.service')

    // Currently all marked read for A — filter should return empty for A
    const unreadOnly = await PortalChatService.listCompaniesWithChat(true)
    const aInUnread = unreadOnly.find(r => r.companyId === companyAId)
    expect(aInUnread).toBeUndefined()

    // Create unread
    const msg = await PortalChatService.createMessage({
      companyId: companyAId,
      senderId: portalUserId,
      senderRole: 'portal_user',
      bodyText: 'Unread-Filter-Test.',
    })
    createdMessageIds.push(msg.id)

    const unreadOnly2 = await PortalChatService.listCompaniesWithChat(true)
    expect(unreadOnly2.some(r => r.companyId === companyAId)).toBe(true)
  })
})
