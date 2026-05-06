import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/social/crypto-config', () => ({
  getSocialTokenKey: vi.fn().mockResolvedValue('a'.repeat(64)),
}))
vi.mock('@/lib/crypto/token-crypto', () => ({
  decryptToken: vi.fn().mockReturnValue('decrypted_ig_token'),
}))

const pubClient = { publishImage: vi.fn() }
vi.mock('@/lib/services/social/instagram-publish.client', () => ({ InstagramPublishClient: pubClient }))

beforeEach(() => {
  vi.resetModules()
  pubClient.publishImage.mockReset()
})

describe('InstagramProvider.publish', () => {
  it('publishes an instagram post via InstagramPublishClient', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{
      provider: 'instagram', externalAccountId: 'ig_user_42', accessTokenEnc: 'iv:ct:tag', status: 'connected',
    }])
    pubClient.publishImage.mockResolvedValue({ ok: true, externalPostId: 'media_99', externalUrl: null })

    const { InstagramProvider } = await import('@/lib/services/social/instagram-provider')
    const r = await InstagramProvider.publish({
      platform: 'instagram', content: 'caption', imageUrl: 'https://cdn/x.jpg',
    } as any)
    expect(r).toEqual({ ok: true, externalPostId: 'media_99', externalUrl: null })
    expect(pubClient.publishImage).toHaveBeenCalledWith({
      igUserId: 'ig_user_42',
      accessToken: 'decrypted_ig_token',
      caption: 'caption',
      imageUrl: 'https://cdn/x.jpg',
    })
  })

  it('returns no_connected_account when no instagram row', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([])
    const { InstagramProvider } = await import('@/lib/services/social/instagram-provider')
    const r = await InstagramProvider.publish({ platform: 'instagram', content: 'x', imageUrl: 'https://cdn/y.jpg' } as any)
    expect(r).toEqual({ ok: false, error: 'no_connected_account', revokeAccount: false })
    expect(pubClient.publishImage).not.toHaveBeenCalled()
  })

  it('throws on non-instagram post', async () => {
    const { InstagramProvider } = await import('@/lib/services/social/instagram-provider')
    await expect(InstagramProvider.publish({ platform: 'facebook' } as any))
      .rejects.toThrow(/only_instagram_posts/)
  })

  it('passes imageUrl=null when not set on post', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{
      provider: 'instagram', externalAccountId: 'ig1', accessTokenEnc: 'iv:ct:tag', status: 'connected',
    }])
    pubClient.publishImage.mockResolvedValue({ ok: false, error: 'instagram_requires_image', revokeAccount: false })

    const { InstagramProvider } = await import('@/lib/services/social/instagram-provider')
    const r = await InstagramProvider.publish({ platform: 'instagram', content: 'no img', imageUrl: null } as any)
    expect(r.ok).toBe(false)
    expect(pubClient.publishImage).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: null }))
  })
})
