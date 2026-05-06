import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, handler) => handler({ userId: 'u1', role: 'owner' })),
}))

const accountSvc = { disconnect: vi.fn() }
vi.mock('@/lib/services/social/social-account.service', () => ({ SocialAccountService: accountSvc }))

const audit = { log: vi.fn() }
vi.mock('@/lib/services/audit-log.service', () => ({ AuditLogService: audit }))

beforeEach(() => {
  vi.resetModules()
  accountSvc.disconnect.mockReset()
  audit.log.mockReset()
})

describe('DELETE /api/v1/social/accounts/[id]', () => {
  it('marks account as revoked and writes audit log on success', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'acc1', provider: 'facebook', externalAccountId: 'p1', status: 'connected' }])
    accountSvc.disconnect.mockResolvedValue(undefined)
    audit.log.mockResolvedValue(undefined)

    const { DELETE } = await import('@/app/api/v1/social/accounts/[id]/route')
    const res = await DELETE(
      new Request('https://app/api/v1/social/accounts/acc1', { method: 'DELETE' }) as any,
      { params: Promise.resolve({ id: 'acc1' }) }
    )
    expect(res.status).toBe(200)
    expect(accountSvc.disconnect).toHaveBeenCalledWith('acc1')
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_account_revoked',
      entityType: 'social_oauth_accounts',
      entityId: 'acc1',
      payload: expect.objectContaining({ provider: 'facebook' }),
    }))
  })

  it('returns 404 if account not found / already revoked', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([])

    const { DELETE } = await import('@/app/api/v1/social/accounts/[id]/route')
    const res = await DELETE(
      new Request('https://app/api/v1/social/accounts/nonexistent', { method: 'DELETE' }) as any,
      { params: Promise.resolve({ id: 'nonexistent' }) }
    )
    expect(res.status).toBe(404)
    expect(accountSvc.disconnect).not.toHaveBeenCalled()
    expect(audit.log).not.toHaveBeenCalled()
  })

  it('audit log payload includes provider and externalAccountId for instagram accounts', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'acc2', provider: 'instagram', externalAccountId: 'ig_42', status: 'connected' }])
    accountSvc.disconnect.mockResolvedValue(undefined)
    audit.log.mockResolvedValue(undefined)

    const { DELETE } = await import('@/app/api/v1/social/accounts/[id]/route')
    const res = await DELETE(
      new Request('https://app/api/v1/social/accounts/acc2', { method: 'DELETE' }) as any,
      { params: Promise.resolve({ id: 'acc2' }) }
    )
    expect(res.status).toBe(200)
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_account_revoked',
      entityId: 'acc2',
      payload: expect.objectContaining({ provider: 'instagram', externalAccountId: 'ig_42' }),
    }))
  })
})
