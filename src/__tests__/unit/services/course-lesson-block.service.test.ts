import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'
const BLOCK_ID  = '00000000-0000-0000-0000-0000000000b1'

function blockFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: BLOCK_ID, lessonId: LESSON_ID, position: 1, kind: 'markdown',
    markdownBody: '# Hi', blockType: null, content: {}, settings: {},
    isVisible: true, createdAt: new Date(), updatedAt: new Date(), ...overrides,
  }
}

describe('CourseLessonBlockService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function getSvc() {
    const mod = await import('@/lib/services/course-lesson-block.service')
    return mod.CourseLessonBlockService
  }

  describe('listByLesson', () => {
    it('returns sorted list', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([blockFixture()])
      const svc = await getSvc()
      const result = await svc.listByLesson(LESSON_ID)
      expect(result).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('creates markdown block with auto position', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([{ max: 2 }])
      dbMock.mockInsert.mockResolvedValue([blockFixture({ position: 3 })])
      const svc = await getSvc()
      const result = await svc.create(LESSON_ID,
        { kind: 'markdown', markdownBody: '# Hi' },
        { userId: TEST_USER_ID, userRole: 'admin' })
      expect(result.kind).toBe('markdown')
    })

    it('creates cms_block with content', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([{ max: 0 }])
      dbMock.mockInsert.mockResolvedValue([blockFixture({
        kind: 'cms_block', markdownBody: null, blockType: 'course-callout',
        content: { variant: 'tip', body: 'x' },
      })])
      const svc = await getSvc()
      const result = await svc.create(LESSON_ID,
        { kind: 'cms_block', blockType: 'course-callout', content: { variant: 'tip', body: 'x' } },
        { userId: TEST_USER_ID, userRole: 'admin' })
      expect(result.blockType).toBe('course-callout')
    })

    it('respects explicit position', async () => {
      dbMock.mockInsert.mockResolvedValue([blockFixture({ position: 5 })])
      const svc = await getSvc()
      const result = await svc.create(LESSON_ID,
        { kind: 'markdown', markdownBody: 'x', position: 5 },
        { userId: TEST_USER_ID, userRole: 'admin' })
      expect(result.position).toBe(5)
    })
  })

  describe('update', () => {
    it('updates markdownBody', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([blockFixture()])
      dbMock.mockUpdate.mockResolvedValue([blockFixture({ markdownBody: '# Updated' })])
      const svc = await getSvc()
      const result = await svc.update(BLOCK_ID,
        { markdownBody: '# Updated' },
        { userId: TEST_USER_ID, userRole: 'admin' })
      expect(result.markdownBody).toBe('# Updated')
    })

    it('throws NOT_FOUND when block missing', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      await expect(svc.update(BLOCK_ID, { markdownBody: 'x' },
        { userId: TEST_USER_ID, userRole: 'admin' }))
        .rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })

  describe('delete', () => {
    it('deletes block', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([blockFixture()])
      dbMock.mockDelete.mockResolvedValue(undefined)
      const svc = await getSvc()
      await svc.delete(BLOCK_ID, { userId: TEST_USER_ID, userRole: 'admin' })
      expect(dbMock.db.delete).toHaveBeenCalled()
    })
  })

  describe('reorder', () => {
    it('updates positions in transaction', async () => {
      dbMock.mockUpdate.mockResolvedValue(undefined)
      const svc = await getSvc()
      await svc.reorder(LESSON_ID,
        [{ id: BLOCK_ID, position: 2 }],
        { userId: TEST_USER_ID, userRole: 'admin' })
      expect(dbMock.mockTransaction).toHaveBeenCalled()
    })
  })
})
