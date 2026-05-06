import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/social/crypto-config', () => ({
  getSocialTokenKey: vi.fn().mockResolvedValue('a'.repeat(64)),
}))

const meta = {
  exchangeCode: vi.fn(),
  exchangeForLongLived: vi.fn(),
  listPagesWithIg: vi.fn(),
}
vi.mock('@/lib/services/social/meta-oauth.client', () => ({ MetaOAuthClient: meta }))

beforeEach(() => {
  vi.resetModules()
  Object.values(meta).forEach(fn => fn.mockReset())
})

describe('SocialAccountService.connectMeta', () => {
  it('happy path: persists 1 fb + 1 ig row when ig is linked', async () => {
    const dbMock = setupDbMock()
    meta.exchangeCode.mockResolvedValue({ accessToken: 'short', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'longUser', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([
      { pageId: 'p1', pageName: 'xKMU FB', pageAccessToken: 'pageTok', igUserId: 'ig1', igUsername: 'xkmu_ig' },
    ])
    dbMock.insertMock.mockResolvedValue([{ id: 'row1' }])

    const { SocialAccountService } = await import('@/lib/services/social/social-account.service')
    const r = await SocialAccountService.connectMeta({
      code: 'CODE', selectedPageId: 'p1', userId: 'u1',
    })

    expect(r.connected).toEqual([
      expect.objectContaining({ provider: 'facebook', externalAccountId: 'p1' }),
      expect.objectContaining({ provider: 'instagram', externalAccountId: 'ig1' }),
    ])
    expect(dbMock.db.insert).toHaveBeenCalledTimes(2)
    expect(dbMock.db.update).toHaveBeenCalledTimes(2)  // revoke fb + revoke ig
  })

  it('persists only fb when no ig is linked', async () => {
    const dbMock = setupDbMock()
    meta.exchangeCode.mockResolvedValue({ accessToken: 'short', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'longUser', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([
      { pageId: 'p1', pageName: 'xKMU FB', pageAccessToken: 'pageTok', igUserId: null, igUsername: null },
    ])
    dbMock.insertMock.mockResolvedValue([{ id: 'row1' }])

    const { SocialAccountService } = await import('@/lib/services/social/social-account.service')
    const r = await SocialAccountService.connectMeta({ code: 'C', selectedPageId: 'p1', userId: 'u1' })
    expect(r.connected).toHaveLength(1)
    expect(r.connected[0].provider).toBe('facebook')
    expect(dbMock.db.update).toHaveBeenCalledTimes(2)  // revoke fb + revoke ig (always both)
  })

  it('throws when selectedPageId not found in user pages', async () => {
    setupDbMock()
    meta.exchangeCode.mockResolvedValue({ accessToken: 'short', expiresInSec: 3600 })
    meta.exchangeForLongLived.mockResolvedValue({ accessToken: 'longUser', expiresInSec: 5184000 })
    meta.listPagesWithIg.mockResolvedValue([{ pageId: 'pX', pageName: 'X', pageAccessToken: 't', igUserId: null, igUsername: null }])

    const { SocialAccountService } = await import('@/lib/services/social/social-account.service')
    await expect(SocialAccountService.connectMeta({ code: 'C', selectedPageId: 'p1', userId: 'u1' }))
      .rejects.toThrow(/page_not_found/)
  })
})
