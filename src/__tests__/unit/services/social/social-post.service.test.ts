import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

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
  it('throws deprecated_use_legacy_publish_route (P2A service superseded by legacy route)', async () => {
    setupDbMock()
    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.publish('p1', actor)).rejects.toThrow(/deprecated_use_legacy_publish_route/)
  })
})
