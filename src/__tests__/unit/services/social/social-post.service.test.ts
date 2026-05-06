import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

const metaProvider = { publish: vi.fn() }
vi.mock('@/lib/services/social/meta-provider', () => ({ MetaProvider: metaProvider }))

const audit = { log: vi.fn() }
vi.mock('@/lib/services/audit-log.service', () => ({ AuditLogService: audit }))

const actor = { userId: 'u1', userRole: 'owner' }

beforeEach(() => { vi.resetModules(); audit.log.mockReset() })

describe('SocialPostService.create', () => {
  it('inserts post with provided body + creates one target per provider', async () => {
    const dbMock = setupDbMock()
    dbMock.insertMock
      .mockResolvedValueOnce([{ id: 'post1' }])
      .mockResolvedValueOnce([{ id: 't1' }])
      .mockResolvedValueOnce([{ id: 't2' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    const r = await SocialPostService.create({
      masterBody: 'Hello',
      masterImagePath: null,
      providers: ['facebook', 'instagram'],
      createdBy: 'u1',
      actor,
    })
    expect(r).toEqual({ id: 'post1' })
    expect(dbMock.db.insert).toHaveBeenCalledTimes(3)
    expect(audit.log).toHaveBeenCalledOnce()
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_post_created',
      entityType: 'social_posts',
      entityId: 'post1',
      payload: expect.objectContaining({ providers: ['facebook', 'instagram'], hasImage: false }),
    }))
  })

  it('rejects when providers array is empty', async () => {
    setupDbMock()
    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.create({
      masterBody: 'x', masterImagePath: null, providers: [], createdBy: 'u1', actor,
    })).rejects.toThrow(/at_least_one_provider/)
  })
})

describe('SocialPostService.approve', () => {
  it('transitions draft to approved', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'draft' }])
    dbMock.updateMock.mockResolvedValue([{ id: 'p1', status: 'approved' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await SocialPostService.approve('p1', actor)
    expect(dbMock.db.update).toHaveBeenCalledOnce()
    expect(audit.log).toHaveBeenCalledOnce()
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_post_approved',
      entityType: 'social_posts',
      entityId: 'p1',
    }))
  })

  it('rejects when post is already approved', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'approved' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.approve('p1', actor)).rejects.toThrow(/invalid_transition/)
  })

  it('rejects when post not found', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.approve('p1', actor)).rejects.toThrow(/not_found/)
  })
})

describe('SocialPostService.discard', () => {
  it('deletes draft post (cascade removes targets)', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'draft' }])
    dbMock.deleteMock.mockResolvedValue([{ id: 'p1' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await SocialPostService.discard('p1', actor)
    expect(dbMock.db.delete).toHaveBeenCalledOnce()
    expect(audit.log).toHaveBeenCalledOnce()
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_post_discarded',
      entityType: 'social_posts',
      entityId: 'p1',
      payload: { status: 'draft' },
    }))
  })

  it('rejects discard on non-draft post', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'posted' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.discard('p1', actor)).rejects.toThrow(/only_drafts/)
  })
})

describe('SocialPostService.publish', () => {
  beforeEach(() => metaProvider.publish.mockReset())

  it('publishes all targets, sets all to posted, post → posted', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'hi', masterImagePath: null }])
      .mockResolvedValueOnce([
        { id: 't1', postId: 'p1', provider: 'facebook', publishStatus: 'pending', retryCount: 0 },
        { id: 't2', postId: 'p1', provider: 'instagram', publishStatus: 'pending', retryCount: 0 },
      ])
    metaProvider.publish
      .mockResolvedValueOnce({ ok: true, externalPostId: 'fb_1', externalUrl: 'https://www.facebook.com/fb_1' })
      .mockResolvedValueOnce({ ok: true, externalPostId: 'ig_1', externalUrl: null })

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    const r = await SocialPostService.publish('p1', actor)
    expect(r.status).toBe('posted')
    expect(metaProvider.publish).toHaveBeenCalledTimes(2)
    expect(dbMock.db.update).toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledOnce()
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_post_published',
      entityType: 'social_posts',
      entityId: 'p1',
      payload: expect.objectContaining({
        targets: expect.arrayContaining([
          expect.objectContaining({ provider: 'facebook', externalPostId: 'fb_1' }),
          expect.objectContaining({ provider: 'instagram', externalPostId: 'ig_1' }),
        ]),
      }),
    }))
  })

  it('partial failure → post status partially_failed', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'hi', masterImagePath: null }])
      .mockResolvedValueOnce([
        { id: 't1', provider: 'facebook', retryCount: 0 },
        { id: 't2', provider: 'instagram', retryCount: 0 },
      ])
    metaProvider.publish
      .mockResolvedValueOnce({ ok: true, externalPostId: 'fb_1', externalUrl: '...' })
      .mockResolvedValueOnce({ ok: false, error: 'rate_limited', revokeAccount: false })

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    const r = await SocialPostService.publish('p1', actor)
    expect(r.status).toBe('partially_failed')
    expect(audit.log).toHaveBeenCalledOnce()
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_post_failed',
      payload: expect.objectContaining({
        overallStatus: 'partially_failed',
        failedProviders: expect.arrayContaining([
          expect.objectContaining({ provider: 'instagram', error: 'rate_limited' }),
        ]),
      }),
    }))
  })

  it('all targets fail → post status failed', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'hi', masterImagePath: null }])
      .mockResolvedValueOnce([{ id: 't1', provider: 'facebook', retryCount: 0 }])
    metaProvider.publish.mockResolvedValueOnce({ ok: false, error: 'server_down', revokeAccount: false })

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    const r = await SocialPostService.publish('p1', actor)
    expect(r.status).toBe('failed')
    expect(audit.log).toHaveBeenCalledOnce()
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'social_post_failed',
      payload: expect.objectContaining({
        overallStatus: 'failed',
        failedProviders: expect.arrayContaining([
          expect.objectContaining({ provider: 'facebook', error: 'server_down' }),
        ]),
      }),
    }))
  })

  it('marks oauth-account revoked when revokeAccount=true', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'x', masterImagePath: null }])
      .mockResolvedValueOnce([{ id: 't1', provider: 'facebook', retryCount: 0 }])
    metaProvider.publish.mockResolvedValueOnce({ ok: false, error: 'token expired', revokeAccount: true })

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await SocialPostService.publish('p1', actor)
    // multiple update calls expected: target 'publishing', target 'failed', oauth-account 'revoked', post 'failed'
    expect(dbMock.db.update.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('rejects when post is in draft', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValueOnce([{ id: 'p1', status: 'draft' }])
    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.publish('p1', actor)).rejects.toThrow(/invalid_state_for_publish/)
  })

  it('rejects when post is already posted', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValueOnce([{ id: 'p1', status: 'posted' }])
    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.publish('p1', actor)).rejects.toThrow(/invalid_state_for_publish/)
  })

  it('handles unexpected provider throw as target failure', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'x', masterImagePath: null }])
      .mockResolvedValueOnce([{ id: 't1', provider: 'facebook', retryCount: 0 }])
    metaProvider.publish.mockRejectedValueOnce(new Error('connection refused'))

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    const r = await SocialPostService.publish('p1', actor)
    expect(r.status).toBe('failed')
  })
})
