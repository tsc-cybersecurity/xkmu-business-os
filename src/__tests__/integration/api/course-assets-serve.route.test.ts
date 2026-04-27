import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

describe('GET /api/v1/courses/assets/serve/[...path]', () => {
  let tmpDir: string
  let testFile: string

  beforeEach(async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/utils/course-asset-acl', () => ({
      checkAssetAccess: vi.fn().mockResolvedValue({ allowed: true }),
      invalidateAssetAccess: vi.fn(),
      invalidateAssetAccessByCourse: vi.fn(),
    }))
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'serve-'))
    process.env.COURSE_ASSET_DIR = tmpDir
    testFile = path.join(tmpDir, 'a', 'b.bin')
    await fs.mkdir(path.dirname(testFile), { recursive: true })
    await fs.writeFile(testFile, Buffer.alloc(1000, 1))
  })

  it('returns 200 + full body without Range header', async () => {
    const req = new Request('http://x/')
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const res = await GET(req as never, { params: createTestParams({ path: ['a', 'b.bin'] }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-length')).toBe('1000')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
  })

  it('returns 206 + correct Content-Range with Range header', async () => {
    const req = new Request('http://x/', { headers: { range: 'bytes=0-99' } })
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const res = await GET(req as never, { params: createTestParams({ path: ['a', 'b.bin'] }) })
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 0-99/1000')
    expect(res.headers.get('content-length')).toBe('100')
  })

  it('rejects path traversal with 400', async () => {
    const req = new Request('http://x/')
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const res = await GET(req as never, {
      params: createTestParams({ path: ['..', '..', 'etc', 'passwd'] }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 for missing file', async () => {
    const req = new Request('http://x/')
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const res = await GET(req as never, {
      params: createTestParams({ path: ['a', 'missing.bin'] }),
    })
    expect(res.status).toBe(404)
  })
})
