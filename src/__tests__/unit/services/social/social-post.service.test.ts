import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

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
