import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestParams } from '../../helpers/mock-request'
import { authFixture, TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-4000-8000-0000000000c1'
const LESSON_ID = '00000000-0000-4000-8000-0000000000e1'
const ASSET_ID = '00000000-0000-4000-8000-0000000000f1'

describe('POST /api/v1/courses/[id]/assets', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns 201 on valid video upload', async () => {
    vi.doMock('@/lib/services/course-asset.service', () => ({
      CourseAssetService: {
        uploadForLesson: vi.fn().mockResolvedValue({
          id: ASSET_ID,
          courseId: COURSE_ID,
          lessonId: LESSON_ID,
          kind: 'video',
          filename: 'x.mp4',
          originalName: 'x.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 1024,
          path: `${COURSE_ID}/${ASSET_ID}.mp4`,
          uploadedBy: TEST_USER_ID,
          createdAt: new Date(),
        }),
      },
      CourseAssetError: class extends Error {
        constructor(public code: string, m: string) { super(m) }
      },
    }))
    const fd = new FormData()
    fd.append('file', new File([new Uint8Array(10)], 'x.mp4', { type: 'video/mp4' }))
    fd.append('kind', 'video')
    fd.append('lessonId', LESSON_ID)
    const req = new Request('http://x/', { method: 'POST', body: fd })
    const { POST } = await import('@/app/api/v1/courses/[id]/assets/route')
    const res = await POST(req as never, { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(201)
  })

  it('returns 413 when file exceeds limit', async () => {
    class AssetErr extends Error {
      constructor(public code: string, m: string) { super(m) }
    }
    vi.doMock('@/lib/services/course-asset.service', () => ({
      CourseAssetService: {
        uploadForLesson: vi.fn().mockRejectedValue(new AssetErr('FILE_TOO_LARGE', 'too big')),
      },
      CourseAssetError: AssetErr,
    }))
    const fd = new FormData()
    fd.append('file', new File([new Uint8Array(10)], 'x.mp4', { type: 'video/mp4' }))
    fd.append('kind', 'video')
    fd.append('lessonId', LESSON_ID)
    const req = new Request('http://x/', { method: 'POST', body: fd })
    const { POST } = await import('@/app/api/v1/courses/[id]/assets/route')
    const res = await POST(req as never, { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(413)
  })

  it('returns 400 on missing file', async () => {
    vi.doMock('@/lib/services/course-asset.service', () => ({
      CourseAssetService: { uploadForLesson: vi.fn() },
      CourseAssetError: class extends Error {
        constructor(public code: string, m: string) { super(m) }
      },
    }))
    const fd = new FormData()
    fd.append('kind', 'video')
    fd.append('lessonId', LESSON_ID)
    const req = new Request('http://x/', { method: 'POST', body: fd })
    const { POST } = await import('@/app/api/v1/courses/[id]/assets/route')
    const res = await POST(req as never, { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/v1/courses/[id]/assets/[assetId]', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns 200 on success', async () => {
    vi.doMock('@/lib/services/course-asset.service', () => ({
      CourseAssetService: { delete: vi.fn().mockResolvedValue(undefined) },
      CourseAssetError: class extends Error {
        constructor(public code: string, m: string) { super(m) }
      },
    }))
    const req = new Request('http://x/', { method: 'DELETE' })
    const { DELETE } = await import('@/app/api/v1/courses/[id]/assets/[assetId]/route')
    const res = await DELETE(req as never, {
      params: createTestParams({ id: COURSE_ID, assetId: ASSET_ID }),
    })
    expect(res.status).toBe(200)
  })

  it('returns 404 when not found', async () => {
    class AssetErr extends Error {
      constructor(public code: string, m: string) { super(m) }
    }
    vi.doMock('@/lib/services/course-asset.service', () => ({
      CourseAssetService: { delete: vi.fn().mockRejectedValue(new AssetErr('NOT_FOUND', 'x')) },
      CourseAssetError: AssetErr,
    }))
    const req = new Request('http://x/', { method: 'DELETE' })
    const { DELETE } = await import('@/app/api/v1/courses/[id]/assets/[assetId]/route')
    const res = await DELETE(req as never, {
      params: createTestParams({ id: COURSE_ID, assetId: ASSET_ID }),
    })
    expect(res.status).toBe(404)
  })
})
