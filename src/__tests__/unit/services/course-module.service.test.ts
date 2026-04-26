import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const MOD_ID    = '00000000-0000-0000-0000-0000000000d1'

function modFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: MOD_ID, courseId: COURSE_ID, position: 1, title: 'Modul 1',
    description: null,
    createdAt: new Date('2026-04-26T00:00:00Z'),
    updatedAt: new Date('2026-04-26T00:00:00Z'),
    ...overrides,
  }
}

describe('CourseModuleService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function getService() {
    return (await import('@/lib/services/course-module.service')).CourseModuleService
  }

  it('creates a module appended at next position', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([{ max: 2 }])
    dbMock.mockInsert.mockResolvedValue([modFixture({ position: 3 })])
    const svc = await getService()
    const r = await svc.create(COURSE_ID, { title: 'Modul 1' }, { userId: TEST_USER_ID, userRole: 'admin' })
    expect(r.position).toBe(3)
  })

  it('lists modules for a course', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([modFixture(), modFixture({ id: 'x', position: 2 })])
    const svc = await getService()
    const r = await svc.listByCourse(COURSE_ID)
    expect(r).toHaveLength(2)
  })

  it('reorder calls update once per item in transaction', async () => {
    dbMock.mockTransaction.mockImplementation(async (cb: any) => cb(dbMock.db))
    dbMock.mockUpdate.mockResolvedValue(undefined)
    const svc = await getService()
    await svc.reorder(COURSE_ID, [{ id: MOD_ID, position: 1 }, { id: 'x', position: 2 }],
      { userId: TEST_USER_ID, userRole: 'admin' })
    expect(dbMock.db.update).toHaveBeenCalledTimes(2)
  })
})
