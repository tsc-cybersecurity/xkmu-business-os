import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

vi.mock('@/lib/services/user.service', () => ({
  UserService: {
    createPortalUser: vi.fn(),
  },
}))

describe('PersonService.createPortalAccess', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    dbMock = setupDbMock()
  })

  async function getSvc() {
    const mod = await import('@/lib/services/person.service')
    return mod.PersonService
  }

  it('rejects when person not found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    const svc = await getSvc()
    await expect(svc.createPortalAccess('p1', { method: 'invite' }))
      .rejects.toThrow(/nicht gefunden/i)
  })

  it('rejects when person has no companyId', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([{
      id: 'p1', companyId: null, email: 'x@y.de', firstName: 'X', lastName: 'Y', portalUserId: null,
    }])
    const svc = await getSvc()
    await expect(svc.createPortalAccess('p1', { method: 'invite' }))
      .rejects.toThrow(/ohne Firma/i)
  })

  it('rejects when person has no email', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([{
      id: 'p1', companyId: 'c1', email: null, firstName: 'X', lastName: 'Y', portalUserId: null,
    }])
    const svc = await getSvc()
    await expect(svc.createPortalAccess('p1', { method: 'invite' }))
      .rejects.toThrow(/ohne E-Mail/i)
  })

  it('rejects when person already has portal access', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([{
      id: 'p1', companyId: 'c1', email: 'x@y.de', firstName: 'X', lastName: 'Y', portalUserId: 'u-existing',
    }])
    const svc = await getSvc()
    await expect(svc.createPortalAccess('p1', { method: 'invite' }))
      .rejects.toThrow(/bereits/i)
  })

  it('creates portal user + links person on happy path', async () => {
    const { UserService } = await import('@/lib/services/user.service')
    ;(UserService.createPortalUser as any).mockResolvedValueOnce({
      id: 'u-new', email: 'x@y.de', role: 'portal_user', status: 'active',
      inviteToken: 'abc', companyId: 'c1',
    })
    dbMock.mockSelect.mockResolvedValueOnce([{
      id: 'p1', companyId: 'c1', email: 'x@y.de', firstName: 'Max', lastName: 'Muster', portalUserId: null,
    }])
    dbMock.mockUpdate.mockResolvedValueOnce([{
      id: 'p1', companyId: 'c1', email: 'x@y.de', firstName: 'Max', lastName: 'Muster', portalUserId: 'u-new',
    }])
    const svc = await getSvc()
    const result = await svc.createPortalAccess('p1', { method: 'invite' })
    expect(result.user.id).toBe('u-new')
    expect(result.person.portalUserId).toBe('u-new')
    expect(UserService.createPortalUser).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'c1', email: 'x@y.de', firstName: 'Max', lastName: 'Muster', method: 'invite',
    }))
  })
})
