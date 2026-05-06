import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/social/crypto-config', () => ({
  getSocialTokenKey: vi.fn().mockResolvedValue('a'.repeat(64)),
}))

vi.mock('@/lib/services/social/meta-oauth.client', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

describe('SocialAccountService.connectMeta', () => {
  it('happy path: persists 1 fb + 1 ig row when ig is linked', async () => {
    const dbMock = setupDbMock()
    dbMock.insertMock.mockResolvedValue([{ id: 'row1' }])

    const { SocialAccountService } = await import('@/lib/services/social/social-account.service')
    const r = await SocialAccountService.connectMeta({
      page: { pageId: 'p1', pageName: 'xKMU FB', pageAccessToken: 'pageTok', igUserId: 'ig1', igUsername: 'xkmu_ig' },
      expiresInSec: 5184000,
      userId: 'u1',
    })

    expect(r.connected).toEqual([
      expect.objectContaining({ provider: 'facebook', externalAccountId: 'p1' }),
      expect.objectContaining({ provider: 'instagram', externalAccountId: 'ig1' }),
    ])
    expect(dbMock.db.insert).toHaveBeenCalledTimes(2)
    expect(dbMock.db.update).toHaveBeenCalledTimes(2)  // revoke fb + revoke ig
  })

  it('persists only fb when no ig is linked (FB-only page)', async () => {
    const dbMock = setupDbMock()
    dbMock.insertMock.mockResolvedValue([{ id: 'row1' }])

    const { SocialAccountService } = await import('@/lib/services/social/social-account.service')
    const r = await SocialAccountService.connectMeta({
      page: { pageId: 'p1', pageName: 'xKMU FB', pageAccessToken: 'pageTok', igUserId: null, igUsername: null },
      expiresInSec: 5184000,
      userId: 'u1',
    })
    expect(r.connected).toHaveLength(1)
    expect(r.connected[0].provider).toBe('facebook')
    expect(dbMock.db.update).toHaveBeenCalledTimes(2)  // revoke fb + revoke ig (always both)
  })

  it('sets tokenExpiresAt to null when expiresInSec is 0', async () => {
    const dbMock = setupDbMock()
    dbMock.insertMock.mockResolvedValue([{ id: 'row1' }])

    const { SocialAccountService } = await import('@/lib/services/social/social-account.service')
    const r = await SocialAccountService.connectMeta({
      page: { pageId: 'p2', pageName: 'FB Only', pageAccessToken: 'tok', igUserId: null, igUsername: null },
      expiresInSec: 0,
      userId: 'u2',
    })

    expect(r.connected).toHaveLength(1)
    expect(r.connected[0].tokenExpiresAt).toBeNull()
  })
})
