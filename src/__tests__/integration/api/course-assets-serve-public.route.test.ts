import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestParams } from '../../helpers/mock-request'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

describe('GET /api/v1/courses/assets/serve/[...path] (public/portal)', () => {
  let tmpDir: string
  let testFile: string
  const courseId = '00000000-0000-0000-0000-0000000000c1'
  const assetId  = '00000000-0000-0000-0000-0000000000a1'

  beforeEach(async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(null) // anonymous
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'serve-pub-'))
    process.env.COURSE_ASSET_DIR = tmpDir
    testFile = path.join(tmpDir, courseId, `${assetId}.mp4`)
    await fs.mkdir(path.dirname(testFile), { recursive: true })
    await fs.writeFile(testFile, Buffer.alloc(100, 1))
  })

  it('returns 200 for anonymous user on public asset', async () => {
    vi.doMock('@/lib/utils/course-asset-acl', () => ({
      checkAssetAccess: vi.fn().mockResolvedValue({ allowed: true }),
      invalidateAssetAccess: vi.fn(),
      invalidateAssetAccessByCourse: vi.fn(),
    }))
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const req = new Request('http://x/')
    const res = await GET(req as never, { params: createTestParams({ path: [courseId, `${assetId}.mp4`] }) })
    expect(res.status).toBe(200)
  })

  it('returns 403 for anonymous user on portal-only asset', async () => {
    vi.doMock('@/lib/utils/course-asset-acl', () => ({
      checkAssetAccess: vi.fn().mockResolvedValue({ allowed: false, status: 403 }),
      invalidateAssetAccess: vi.fn(),
      invalidateAssetAccessByCourse: vi.fn(),
    }))
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const req = new Request('http://x/')
    const res = await GET(req as never, { params: createTestParams({ path: [courseId, `${assetId}.mp4`] }) })
    expect(res.status).toBe(403)
  })

  it('returns 404 for anonymous user on draft asset', async () => {
    vi.doMock('@/lib/utils/course-asset-acl', () => ({
      checkAssetAccess: vi.fn().mockResolvedValue({ allowed: false, status: 404 }),
      invalidateAssetAccess: vi.fn(),
      invalidateAssetAccessByCourse: vi.fn(),
    }))
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const req = new Request('http://x/')
    const res = await GET(req as never, { params: createTestParams({ path: [courseId, `${assetId}.mp4`] }) })
    expect(res.status).toBe(404)
  })

  it('serves Range request for anonymous public asset', async () => {
    vi.doMock('@/lib/utils/course-asset-acl', () => ({
      checkAssetAccess: vi.fn().mockResolvedValue({ allowed: true }),
      invalidateAssetAccess: vi.fn(),
      invalidateAssetAccessByCourse: vi.fn(),
    }))
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const req = new Request('http://x/', { headers: { range: 'bytes=0-49' } })
    const res = await GET(req as never, { params: createTestParams({ path: [courseId, `${assetId}.mp4`] }) })
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 0-49/100')
  })
})
