import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

const metaProvider = { publish: vi.fn() }
vi.mock('@/lib/services/social/meta-provider', () => ({ MetaProvider: metaProvider }))

beforeEach(() => { vi.resetModules() })

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
    })
    expect(r).toEqual({ id: 'post1' })
    expect(dbMock.db.insert).toHaveBeenCalledTimes(3)
  })

  it('rejects when providers array is empty', async () => {
    setupDbMock()
    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.create({
      masterBody: 'x', masterImagePath: null, providers: [], createdBy: 'u1',
    })).rejects.toThrow(/at_least_one_provider/)
  })
})

describe('SocialPostService.approve', () => {
  it('transitions draft to approved', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'draft' }])
    dbMock.updateMock.mockResolvedValue([{ id: 'p1', status: 'approved' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await SocialPostService.approve('p1', 'u1')
    expect(dbMock.db.update).toHaveBeenCalledOnce()
  })

  it('rejects when post is already approved', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'approved' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.approve('p1', 'u1')).rejects.toThrow(/invalid_transition/)
  })

  it('rejects when post not found', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.approve('p1', 'u1')).rejects.toThrow(/not_found/)
  })
})

describe('SocialPostService.discard', () => {
  it('deletes draft post (cascade removes targets)', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'draft' }])
    dbMock.deleteMock.mockResolvedValue([{ id: 'p1' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await SocialPostService.discard('p1')
    expect(dbMock.db.delete).toHaveBeenCalledOnce()
  })

  it('rejects discard on non-draft post', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'posted' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.discard('p1')).rejects.toThrow(/only_drafts/)
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
    const r = await SocialPostService.publish('p1')
    expect(r.status).toBe('posted')
    expect(metaProvider.publish).toHaveBeenCalledTimes(2)
    expect(dbMock.db.update).toHaveBeenCalled()
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
    const r = await SocialPostService.publish('p1')
    expect(r.status).toBe('partially_failed')
  })

  it('all targets fail → post status failed', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'hi', masterImagePath: null }])
      .mockResolvedValueOnce([{ id: 't1', provider: 'facebook', retryCount: 0 }])
    metaProvider.publish.mockResolvedValueOnce({ ok: false, error: 'server_down', revokeAccount: false })

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    const r = await SocialPostService.publish('p1')
    expect(r.status).toBe('failed')
  })

  it('marks oauth-account revoked when revokeAccount=true', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'x', masterImagePath: null }])
      .mockResolvedValueOnce([{ id: 't1', provider: 'facebook', retryCount: 0 }])
    metaProvider.publish.mockResolvedValueOnce({ ok: false, error: 'token expired', revokeAccount: true })

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await SocialPostService.publish('p1')
    // multiple update calls expected: target 'publishing', target 'failed', oauth-account 'revoked', post 'failed'
    expect(dbMock.db.update.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('rejects when post is in draft', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValueOnce([{ id: 'p1', status: 'draft' }])
    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.publish('p1')).rejects.toThrow(/invalid_state_for_publish/)
  })

  it('rejects when post is already posted', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValueOnce([{ id: 'p1', status: 'posted' }])
    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.publish('p1')).rejects.toThrow(/invalid_state_for_publish/)
  })

  it('handles unexpected provider throw as target failure', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'x', masterImagePath: null }])
      .mockResolvedValueOnce([{ id: 't1', provider: 'facebook', retryCount: 0 }])
    metaProvider.publish.mockRejectedValueOnce(new Error('connection refused'))

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    const r = await SocialPostService.publish('p1')
    expect(r.status).toBe('failed')
  })
})
