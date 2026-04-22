import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

describe('UserService portal methods', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/user.service')
    return mod.UserService
  }

  describe('createPortalUser', () => {
    it('creates user with role=portal_user + password hash when method=password', async () => {
      const UserService = await getService()
      // 1) duplicate check returns empty
      dbMock.mockSelect.mockResolvedValueOnce([])
      // 2) insert returns the new user row
      dbMock.mockInsert.mockResolvedValueOnce([{
        id: 'new-user-id',
        email: 'max@kunde.de',
        firstName: 'Max',
        lastName: 'Muster',
        role: 'portal_user',
        companyId: 'c1',
      }])

      const user = await UserService.createPortalUser({
        companyId: 'c1',
        firstName: 'Max',
        lastName: 'Muster',
        email: 'Max@Kunde.de', // note the mixed case — should be lowercased
        method: 'password',
        password: 'Secret12345',
      })
      expect(user.id).toBe('new-user-id')
    })

    it('creates user with invite token when method=invite', async () => {
      const UserService = await getService()
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockInsert.mockResolvedValueOnce([{
        id: 'new-user-id-2',
        email: 'max@kunde.de',
        role: 'portal_user',
        inviteToken: 'abc123',
      }])

      const user = await UserService.createPortalUser({
        companyId: 'c1',
        firstName: 'Max',
        lastName: 'Muster',
        email: 'max@kunde.de',
        method: 'invite',
      })
      expect(user.id).toBe('new-user-id-2')
    })

    it('rejects duplicate portal_user for same company', async () => {
      const UserService = await getService()
      dbMock.mockSelect.mockResolvedValueOnce([{ id: 'existing' }])

      await expect(UserService.createPortalUser({
        companyId: 'c1',
        firstName: 'Max',
        lastName: 'Muster',
        email: 'max@kunde.de',
        method: 'invite',
      })).rejects.toThrow(/bereits vorhanden/i)
    })

    it('rejects password shorter than 10 chars', async () => {
      const UserService = await getService()
      dbMock.mockSelect.mockResolvedValueOnce([])

      await expect(UserService.createPortalUser({
        companyId: 'c1',
        firstName: 'Max',
        lastName: 'Muster',
        email: 'max@kunde.de',
        method: 'password',
        password: 'short',
      })).rejects.toThrow(/10 Zeichen/i)
    })
  })

  describe('acceptInvite', () => {
    it('sets password, clears token, stamps firstLoginAt on valid token', async () => {
      const UserService = await getService()
      const futureDate = new Date(Date.now() + 1000 * 60 * 60)
      dbMock.mockSelect.mockResolvedValueOnce([{
        id: 'u1',
        email: 'p@k.de',
        inviteToken: 'tok',
        inviteTokenExpiresAt: futureDate,
      }])
      dbMock.mockUpdate.mockResolvedValueOnce([{
        id: 'u1',
        email: 'p@k.de',
        inviteToken: null,
        firstLoginAt: new Date(),
      }])

      const user = await UserService.acceptInvite('tok', 'NewSecret123')
      expect(user.id).toBe('u1')
      expect(user.inviteToken).toBeNull()
    })

    it('rejects expired token', async () => {
      const UserService = await getService()
      dbMock.mockSelect.mockResolvedValueOnce([{
        id: 'u1',
        inviteToken: 'tok',
        inviteTokenExpiresAt: new Date(Date.now() - 1000),  // past
      }])

      await expect(UserService.acceptInvite('tok', 'NewSecret123'))
        .rejects.toThrow(/abgelaufen/i)
    })

    it('rejects unknown token', async () => {
      const UserService = await getService()
      dbMock.mockSelect.mockResolvedValueOnce([])

      await expect(UserService.acceptInvite('nope', 'NewSecret123'))
        .rejects.toThrow(/Ungueltig/i)
    })
  })

  describe('regenerateInviteToken', () => {
    it('updates token + expiry and returns updated row', async () => {
      const UserService = await getService()
      dbMock.mockUpdate.mockResolvedValueOnce([{
        id: 'u1',
        inviteToken: 'newtok',
        inviteTokenExpiresAt: new Date(Date.now() + 1000),
      }])

      const user = await UserService.regenerateInviteToken('u1')
      expect(user?.inviteToken).toBe('newtok')
    })
  })
})
