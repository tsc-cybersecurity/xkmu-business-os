import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

describe('PortalChatService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getSvc() {
    const mod = await import('@/lib/services/portal-chat.service')
    return mod.PortalChatService
  }

  // ----------------------------------------------------------------
  // 1. createMessage
  // ----------------------------------------------------------------
  describe('createMessage', () => {
    it('inserts with correct columns and returns row', async () => {
      const svc = await getSvc()
      dbMock.mockInsert.mockResolvedValueOnce([{
        id: 'm1',
        companyId: 'c1',
        senderId: 'u1',
        senderRole: 'portal_user',
        bodyText: 'hello',
        readByPortalAt: null,
        readByAdminAt: null,
        createdAt: new Date(),
      }])
      const msg = await svc.createMessage({
        companyId: 'c1',
        senderId: 'u1',
        senderRole: 'portal_user',
        bodyText: 'hello',
      })
      expect(msg.id).toBe('m1')
      expect(msg.bodyText).toBe('hello')
      expect(msg.senderRole).toBe('portal_user')
    })

    it('accepts null senderId (system/anonymous message)', async () => {
      const svc = await getSvc()
      dbMock.mockInsert.mockResolvedValueOnce([{
        id: 'm2',
        companyId: 'c1',
        senderId: null,
        senderRole: 'admin',
        bodyText: 'system note',
        readByPortalAt: null,
        readByAdminAt: null,
        createdAt: new Date(),
      }])
      const msg = await svc.createMessage({
        companyId: 'c1',
        senderId: null,
        senderRole: 'admin',
        bodyText: 'system note',
      })
      expect(msg.senderId).toBeNull()
      expect(msg.senderRole).toBe('admin')
    })
  })

  // ----------------------------------------------------------------
  // 2. listForCompany
  // ----------------------------------------------------------------
  describe('listForCompany', () => {
    it('returns rows for the given companyId', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([
        { id: 'm1', companyId: 'c1', bodyText: 'hi' },
        { id: 'm2', companyId: 'c1', bodyText: 'there' },
      ])
      const rows = await svc.listForCompany('c1')
      expect(rows).toHaveLength(2)
      expect(rows[0].id).toBe('m1')
    })

    it('returns empty array when no messages', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([])
      const rows = await svc.listForCompany('c-empty')
      expect(rows).toEqual([])
    })

    it('with `since` param adds the gt filter (still returns rows)', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ id: 'm3', companyId: 'c1', bodyText: 'newer' }])
      const since = new Date('2025-01-01T00:00:00Z')
      const rows = await svc.listForCompany('c1', since)
      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe('m3')
    })
  })

  // ----------------------------------------------------------------
  // 4. markReadByPortal
  // ----------------------------------------------------------------
  describe('markReadByPortal', () => {
    it('returns count of updated rows', async () => {
      const svc = await getSvc()
      dbMock.mockUpdate.mockResolvedValueOnce([{ id: 'm1' }, { id: 'm2' }])
      const count = await svc.markReadByPortal('c1')
      expect(count).toBe(2)
    })

    it('returns 0 when nothing was unread', async () => {
      const svc = await getSvc()
      dbMock.mockUpdate.mockResolvedValueOnce([])
      const count = await svc.markReadByPortal('c1')
      expect(count).toBe(0)
    })
  })

  // ----------------------------------------------------------------
  // 5. markReadByAdmin
  // ----------------------------------------------------------------
  describe('markReadByAdmin', () => {
    it('returns count of updated portal_user rows', async () => {
      const svc = await getSvc()
      dbMock.mockUpdate.mockResolvedValueOnce([{ id: 'm5' }])
      const count = await svc.markReadByAdmin('c1')
      expect(count).toBe(1)
    })

    it('returns 0 when no portal_user messages were unread', async () => {
      const svc = await getSvc()
      dbMock.mockUpdate.mockResolvedValueOnce([])
      const count = await svc.markReadByAdmin('c1')
      expect(count).toBe(0)
    })
  })

  // ----------------------------------------------------------------
  // 6. unreadCountForPortal
  // ----------------------------------------------------------------
  describe('unreadCountForPortal', () => {
    it('returns the numeric count from the aggregate row', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ c: 7 }])
      const n = await svc.unreadCountForPortal('c1')
      expect(n).toBe(7)
    })

    it('returns 0 when no unread messages', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ c: 0 }])
      const n = await svc.unreadCountForPortal('c1')
      expect(n).toBe(0)
    })

    it('returns 0 when result is empty (defensive)', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([])
      const n = await svc.unreadCountForPortal('c1')
      expect(n).toBe(0)
    })
  })

  // ----------------------------------------------------------------
  // 7 & 8. unreadCountForAdmin
  // ----------------------------------------------------------------
  describe('unreadCountForAdmin', () => {
    it('with companyId returns per-company count', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ c: 3 }])
      const n = await svc.unreadCountForAdmin('c1')
      expect(n).toBe(3)
    })

    it('without companyId returns global count across all companies', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ c: 42 }])
      const n = await svc.unreadCountForAdmin()
      expect(n).toBe(42)
    })

    it('returns 0 when no unread messages globally', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ c: 0 }])
      const n = await svc.unreadCountForAdmin()
      expect(n).toBe(0)
    })
  })

  // ----------------------------------------------------------------
  // 9. listCompaniesWithChat
  // ----------------------------------------------------------------
  describe('listCompaniesWithChat', () => {
    it('returns metadata for each company with chat', async () => {
      const svc = await getSvc()
      const lastAt = new Date('2025-06-01T10:00:00Z')

      // First select: aggregate query for all companies
      dbMock.mockSelect.mockResolvedValueOnce([
        {
          companyId: 'c1',
          companyName: 'Acme GmbH',
          lastMessageAt: lastAt,
          unreadCount: 2,
        },
      ])
      // Second select: per-company last-message-preview query for c1
      dbMock.mockSelect.mockResolvedValueOnce([{ bodyText: 'Hey, bitte bescheid geben!' }])

      const results = await svc.listCompaniesWithChat()
      expect(results).toHaveLength(1)
      expect(results[0].companyId).toBe('c1')
      expect(results[0].companyName).toBe('Acme GmbH')
      expect(results[0].unreadCount).toBe(2)
      expect(results[0].lastMessageAt).toBe(lastAt)
      expect(results[0].lastMessagePreview).toBe('Hey, bitte bescheid geben!')
    })

    it('truncates long preview to 100 chars', async () => {
      const svc = await getSvc()
      const longText = 'A'.repeat(200)

      dbMock.mockSelect.mockResolvedValueOnce([
        {
          companyId: 'c1',
          companyName: 'Long Corp',
          lastMessageAt: new Date(),
          unreadCount: 1,
        },
      ])
      dbMock.mockSelect.mockResolvedValueOnce([{ bodyText: longText }])

      const results = await svc.listCompaniesWithChat()
      expect(results[0].lastMessagePreview).toHaveLength(100)
    })

    it('returns null preview when no last message found', async () => {
      const svc = await getSvc()

      dbMock.mockSelect.mockResolvedValueOnce([
        {
          companyId: 'c1',
          companyName: 'Ghost GmbH',
          lastMessageAt: null,
          unreadCount: 0,
        },
      ])
      // No last message returned
      dbMock.mockSelect.mockResolvedValueOnce([])

      const results = await svc.listCompaniesWithChat()
      expect(results[0].lastMessagePreview).toBeNull()
    })

    it('returns empty array when no companies have chat', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([])
      const results = await svc.listCompaniesWithChat()
      expect(results).toEqual([])
    })
  })

  // ----------------------------------------------------------------
  // 10. listCompaniesWithChat — hasUnreadOnly filter
  // ----------------------------------------------------------------
  describe('listCompaniesWithChat(hasUnreadOnly=true)', () => {
    it('filters out companies with zero unread messages', async () => {
      const svc = await getSvc()

      // Two companies: one with unread, one without
      dbMock.mockSelect.mockResolvedValueOnce([
        {
          companyId: 'c1',
          companyName: 'Has Unread',
          lastMessageAt: new Date(),
          unreadCount: 3,
        },
        {
          companyId: 'c2',
          companyName: 'All Read',
          lastMessageAt: new Date(),
          unreadCount: 0,
        },
      ])
      // Preview queries for c1 and c2
      dbMock.mockSelect.mockResolvedValueOnce([{ bodyText: 'Unread message' }])
      dbMock.mockSelect.mockResolvedValueOnce([{ bodyText: 'Already read message' }])

      const results = await svc.listCompaniesWithChat(true)
      expect(results).toHaveLength(1)
      expect(results[0].companyId).toBe('c1')
      expect(results[0].unreadCount).toBe(3)
    })

    it('returns empty array when all companies have zero unread', async () => {
      const svc = await getSvc()

      dbMock.mockSelect.mockResolvedValueOnce([
        {
          companyId: 'c1',
          companyName: 'All Read Corp',
          lastMessageAt: new Date(),
          unreadCount: 0,
        },
      ])
      dbMock.mockSelect.mockResolvedValueOnce([{ bodyText: 'old message' }])

      const results = await svc.listCompaniesWithChat(true)
      expect(results).toEqual([])
    })
  })
})
