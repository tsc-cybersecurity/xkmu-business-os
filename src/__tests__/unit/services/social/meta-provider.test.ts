import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/social/crypto-config', () => ({
  getSocialTokenKey: vi.fn().mockResolvedValue('a'.repeat(64)),
}))

vi.mock('@/lib/crypto/token-crypto', () => ({
  decryptToken: vi.fn().mockReturnValue('decrypted_page_token'),
}))

const pubClient = {
  publishToFacebookPage: vi.fn(),
  publishToInstagram: vi.fn(),
}
vi.mock('@/lib/services/social/meta-publish.client', () => ({ MetaPublishClient: pubClient }))

beforeEach(() => {
  vi.resetModules()
  pubClient.publishToFacebookPage.mockReset()
  pubClient.publishToInstagram.mockReset()
})

describe('MetaProvider.publish', () => {
  it('routes facebook target to publishToFacebookPage with decrypted token + master body', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{
      provider: 'facebook', externalAccountId: 'page_42', accessTokenEnc: 'iv:ct:tag', status: 'connected',
    }])
    pubClient.publishToFacebookPage.mockResolvedValue({ ok: true, externalPostId: 'p_99', externalUrl: 'https://www.facebook.com/p_99' })

    const { MetaProvider } = await import('@/lib/services/social/meta-provider')
    const r = await MetaProvider.publish(
      { id: 't1', postId: 'pst1', provider: 'facebook', bodyOverride: null } as any,
      { id: 'pst1', masterBody: 'Hello world', masterImagePath: null } as any,
    )
    expect(r).toEqual({ ok: true, externalPostId: 'p_99', externalUrl: 'https://www.facebook.com/p_99' })
    expect(pubClient.publishToFacebookPage).toHaveBeenCalledWith({
      pageId: 'page_42',
      pageAccessToken: 'decrypted_page_token',
      message: 'Hello world',
      imageUrl: null,
    })
  })

  it('routes instagram target to publishToInstagram with caption + image url', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{
      provider: 'instagram', externalAccountId: 'ig_user_77', accessTokenEnc: 'iv:ct:tag', status: 'connected',
    }])
    pubClient.publishToInstagram.mockResolvedValue({ ok: true, externalPostId: 'media_1', externalUrl: null })

    const { MetaProvider } = await import('@/lib/services/social/meta-provider')
    const r = await MetaProvider.publish(
      { provider: 'instagram', bodyOverride: 'IG-only caption' } as any,
      { masterBody: 'master', masterImagePath: 'https://cdn/x.jpg' } as any,
    )
    expect(r.ok).toBe(true)
    expect(pubClient.publishToInstagram).toHaveBeenCalledWith({
      igUserId: 'ig_user_77',
      pageAccessToken: 'decrypted_page_token',
      caption: 'IG-only caption',
      imageUrl: 'https://cdn/x.jpg',
    })
  })

  it('returns failure when no connected account exists for provider', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([])
    const { MetaProvider } = await import('@/lib/services/social/meta-provider')
    const r = await MetaProvider.publish(
      { provider: 'facebook' } as any,
      { masterBody: 'x', masterImagePath: null } as any,
    )
    expect(r).toEqual({ ok: false, error: 'no_connected_account', revokeAccount: false })
    expect(pubClient.publishToFacebookPage).not.toHaveBeenCalled()
  })

  it('rejects unsupported provider with throw (programmer error)', async () => {
    const { MetaProvider } = await import('@/lib/services/social/meta-provider')
    await expect(MetaProvider.publish({ provider: 'x' } as any, {} as any))
      .rejects.toThrow(/unsupported_provider_for_meta/)
  })
})
