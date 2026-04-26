import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'
const ASSET_ID  = '00000000-0000-0000-0000-0000000000f1'

function assetFixture(o: Record<string, unknown> = {}) {
  return {
    id: ASSET_ID, courseId: COURSE_ID, lessonId: LESSON_ID,
    kind: 'video', filename: 'abc.mp4', originalName: 'lesson.mp4',
    mimeType: 'video/mp4', sizeBytes: 1024,
    path: `${COURSE_ID}/${ASSET_ID}.mp4`,
    label: null, position: null, uploadedBy: TEST_USER_ID,
    createdAt: new Date(), ...o,
  }
}

function fakeFile(name: string, type: string, size = 1024): File {
  const buf = new Uint8Array(size)
  return new File([buf], name, { type })
}

describe('CourseAssetService', () => {
  let dbMock: ReturnType<typeof setupDbMock>
  let tmpDir: string

  beforeEach(async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'course-assets-'))
    process.env.COURSE_ASSET_DIR = tmpDir
    delete process.env.COURSE_ASSET_VIDEO_MAX_MB
    delete process.env.COURSE_ASSET_DOC_MAX_MB
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function getService() {
    return (await import('@/lib/services/course-asset.service')).CourseAssetService
  }

  it('rejects video with unsupported MIME', async () => {
    const svc = await getService()
    await expect(svc.uploadForLesson(LESSON_ID, COURSE_ID,
      fakeFile('x.exe', 'application/x-msdownload'), 'video', undefined,
      { userId: TEST_USER_ID, userRole: 'admin' }))
      .rejects.toMatchObject({ code: 'INVALID_MIME' })
  })

  it('rejects file too large', async () => {
    process.env.COURSE_ASSET_VIDEO_MAX_MB = '0'
    const svc = await getService()
    await expect(svc.uploadForLesson(LESSON_ID, COURSE_ID,
      fakeFile('x.mp4', 'video/mp4'), 'video', undefined,
      { userId: TEST_USER_ID, userRole: 'admin' }))
      .rejects.toMatchObject({ code: 'FILE_TOO_LARGE' })
  })

  it('writes file to disk + DB row on valid upload', async () => {
    dbMock.mockInsert.mockResolvedValue([assetFixture()])
    const svc = await getService()
    const result = await svc.uploadForLesson(LESSON_ID, COURSE_ID,
      fakeFile('lesson.mp4', 'video/mp4'), 'video', undefined,
      { userId: TEST_USER_ID, userRole: 'admin' })
    expect(result.id).toBe(ASSET_ID)
    expect(dbMock.db.insert).toHaveBeenCalled()
  })

  it('resolveAbsolutePath rejects path traversal', async () => {
    const svc = await getService()
    expect(() => svc.resolveAbsolutePath(assetFixture({ path: '../../etc/passwd' }) as never))
      .toThrow(/PATH_TRAVERSAL/)
  })

  it('delete removes DB row + file (no throw on missing file)', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([assetFixture()])
    dbMock.mockDelete.mockResolvedValue(undefined)
    const svc = await getService()
    await svc.delete(ASSET_ID, { userId: TEST_USER_ID, userRole: 'admin' })
    expect(dbMock.db.delete).toHaveBeenCalled()
  })
})
