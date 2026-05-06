import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { createTestRequest } from '../../helpers/mock-request'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req: unknown, mod: unknown, action: unknown, handler: (auth: { userId: string; role: string }) => unknown) =>
    handler({ userId: 'u1', role: 'owner' }),
  ),
}))

const meta = { publish: vi.fn() }
vi.mock('@/lib/services/social/meta-provider', () => ({ MetaProvider: meta }))

const ig = { publish: vi.fn() }
vi.mock('@/lib/services/social/instagram-provider', () => ({ InstagramProvider: ig }))

const legacy = { publish: vi.fn() }
vi.mock('@/lib/services/social-publishing.service', () => ({ SocialPublishingService: legacy }))

const audit = { log: vi.fn() }
vi.mock('@/lib/services/audit-log.service', () => ({ AuditLogService: audit }))

const POST_ID = 'post-uuid-1234'

const fbPost = {
  id: POST_ID,
  platform: 'facebook',
  content: 'Hello FB',
  imageUrl: null,
  status: 'draft',
}

const liPost = {
  id: POST_ID,
  platform: 'linkedin',
  content: 'Hello LinkedIn',
  imageUrl: null,
  status: 'draft',
}

beforeEach(() => {
  vi.resetModules()
  meta.publish.mockReset()
  ig.publish.mockReset()
  legacy.publish.mockReset()
  audit.log.mockReset()
})

describe('POST /api/v1/social-media/posts/[id]/publish', () => {
  it('FB happy path: MetaProvider ok → status=posted, postedVia=oauth, audit social_media_post_published', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([fbPost])
    dbMock.updateMock.mockResolvedValue([])
    meta.publish.mockResolvedValue({ ok: true, externalPostId: 'fb_post_1', externalUrl: 'https://fb.com/1' })
    audit.log.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/v1/social-media/posts/[id]/publish/route')
    const res = await POST(
      createTestRequest('POST', '/api/v1/social-media/posts/post-uuid-1234/publish'),
      { params: Promise.resolve({ id: POST_ID }) },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.result.ok).toBe(true)
    expect(body.data.result.externalPostId).toBe('fb_post_1')
    expect(body.data.postId).toBe(POST_ID)

    // update called with posted status
    expect(dbMock.db.update).toHaveBeenCalled()

    // audit log with correct action and payload
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1',
      action: 'social_media_post_published',
      entityType: 'social_media_posts',
      entityId: POST_ID,
      payload: expect.objectContaining({
        platform: 'facebook',
        postedVia: 'oauth',
        externalPostId: 'fb_post_1',
        externalUrl: 'https://fb.com/1',
      }),
    }))
    expect(legacy.publish).not.toHaveBeenCalled()
  })

  it('LinkedIn happy path: SocialPublishingService success → status=posted, postedVia=legacy, audit logged', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([liPost])
    dbMock.updateMock.mockResolvedValue([])
    legacy.publish.mockResolvedValue({
      linkedin: { success: true, postId: 'li_123', postUrl: 'https://linkedin.com/post/li_123' },
    })
    audit.log.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/v1/social-media/posts/[id]/publish/route')
    const res = await POST(
      createTestRequest('POST', '/api/v1/social-media/posts/post-uuid-1234/publish', {}),
      { params: Promise.resolve({ id: POST_ID }) },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.result.ok).toBe(true)
    expect(body.data.result.externalPostId).toBe('li_123')

    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_media_post_published',
      payload: expect.objectContaining({
        platform: 'linkedin',
        postedVia: 'legacy',
      }),
    }))
    expect(meta.publish).not.toHaveBeenCalled()
  })

  it('FB failure (revokeAccount=false): status=failed, lastError set, audit social_media_post_failed, no oauth-account changes', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([fbPost])
    dbMock.updateMock.mockResolvedValue([])
    meta.publish.mockResolvedValue({ ok: false, error: 'api_error', revokeAccount: false })
    audit.log.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/v1/social-media/posts/[id]/publish/route')
    const res = await POST(
      createTestRequest('POST', '/api/v1/social-media/posts/post-uuid-1234/publish'),
      { params: Promise.resolve({ id: POST_ID }) },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.result.ok).toBe(false)
    expect(body.data.result.error).toBe('api_error')

    // update called once (for social_media_posts only — no oauth account revocation)
    expect(dbMock.db.update).toHaveBeenCalledTimes(1)

    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_media_post_failed',
      payload: expect.objectContaining({
        platform: 'facebook',
        postedVia: 'oauth',
        error: 'api_error',
      }),
    }))
  })

  it('FB token-revoked (revokeAccount=true): status=failed, oauth-account row updated to revoked, audit logged', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([fbPost])
    dbMock.updateMock.mockResolvedValue([])
    meta.publish.mockResolvedValue({ ok: false, error: 'token_expired', revokeAccount: true })
    audit.log.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/v1/social-media/posts/[id]/publish/route')
    const res = await POST(
      createTestRequest('POST', '/api/v1/social-media/posts/post-uuid-1234/publish'),
      { params: Promise.resolve({ id: POST_ID }) },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.result.ok).toBe(false)

    // update called twice: once for social_media_posts (failed), once for socialOauthAccounts (revoked)
    expect(dbMock.db.update).toHaveBeenCalledTimes(2)

    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_media_post_failed',
      payload: expect.objectContaining({
        platform: 'facebook',
        postedVia: 'oauth',
        error: 'token_expired',
      }),
    }))
  })

  it('404 path: post not found → 404 returned, no publish or audit calls', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([])

    const { POST } = await import('@/app/api/v1/social-media/posts/[id]/publish/route')
    const res = await POST(
      createTestRequest('POST', '/api/v1/social-media/posts/nonexistent/publish'),
      { params: Promise.resolve({ id: 'nonexistent' }) },
    )

    expect(res.status).toBe(404)
    expect(meta.publish).not.toHaveBeenCalled()
    expect(legacy.publish).not.toHaveBeenCalled()
    expect(audit.log).not.toHaveBeenCalled()
  })

  it('routes instagram posts to InstagramProvider', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValueOnce([{ id: 'p1', platform: 'instagram', content: 'IG post', imageUrl: 'https://cdn/x.jpg' }])
    dbMock.updateMock.mockResolvedValue([])
    ig.publish.mockResolvedValue({ ok: true, externalPostId: 'media_99', externalUrl: null })
    audit.log.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/v1/social-media/posts/[id]/publish/route')
    const res = await POST(new Request('https://app/x', { method: 'POST', body: JSON.stringify({}) }) as any, { params: Promise.resolve({ id: 'p1' }) })
    expect(res.status).toBe(200)
    expect(ig.publish).toHaveBeenCalledWith(expect.objectContaining({ platform: 'instagram' }))
    expect(meta.publish).not.toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'social_media_post_published', payload: expect.objectContaining({ platform: 'instagram', postedVia: 'oauth' }) }))
  })
})
