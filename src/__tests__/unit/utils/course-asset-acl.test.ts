import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

const ASSET_ID = '00000000-0000-0000-0000-0000000000a1'
const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const PATH = `${COURSE_ID}/${ASSET_ID}.mp4`

describe('checkAssetAccess', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getAcl() {
    const mod = await import('@/lib/utils/course-asset-acl')
    mod.__resetCacheForTests()
    return mod
  }

  it('returns 404 when path cannot be parsed', async () => {
    const { checkAssetAccess } = await getAcl()
    const result = await checkAssetAccess('garbage', null)
    expect(result).toEqual({ allowed: false, status: 404 })
  })

  it('returns 404 when asset row missing', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    const { checkAssetAccess } = await getAcl()
    const result = await checkAssetAccess(PATH, null)
    expect(result).toEqual({ allowed: false, status: 404 })
  })

  it('returns 404 when course is draft', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([
      { courseId: COURSE_ID, visibility: 'public', status: 'draft' },
    ])
    const { checkAssetAccess } = await getAcl()
    const result = await checkAssetAccess(PATH, null)
    expect(result).toEqual({ allowed: false, status: 404 })
  })

  it('returns 404 when course is archived', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([
      { courseId: COURSE_ID, visibility: 'public', status: 'archived' },
    ])
    const { checkAssetAccess } = await getAcl()
    const result = await checkAssetAccess(PATH, null)
    expect(result).toEqual({ allowed: false, status: 404 })
  })

  it('allows anonymous access for visibility=public + published', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([
      { courseId: COURSE_ID, visibility: 'public', status: 'published' },
    ])
    const { checkAssetAccess } = await getAcl()
    const result = await checkAssetAccess(PATH, null)
    expect(result).toEqual({ allowed: true })
  })

  it('allows anonymous access for visibility=both + published', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([
      { courseId: COURSE_ID, visibility: 'both', status: 'published' },
    ])
    const { checkAssetAccess } = await getAcl()
    const result = await checkAssetAccess(PATH, null)
    expect(result).toEqual({ allowed: true })
  })

  it('returns 403 for visibility=portal without session', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([
      { courseId: COURSE_ID, visibility: 'portal', status: 'published' },
    ])
    const { checkAssetAccess } = await getAcl()
    const result = await checkAssetAccess(PATH, null)
    expect(result).toEqual({ allowed: false, status: 403 })
  })

  it('allows visibility=portal with session', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([
      { courseId: COURSE_ID, visibility: 'portal', status: 'published' },
    ])
    const { checkAssetAccess } = await getAcl()
    const result = await checkAssetAccess(PATH, { user: { id: 'u1' } })
    expect(result).toEqual({ allowed: true })
  })

  it('caches DB lookup — second call hits cache', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([
      { courseId: COURSE_ID, visibility: 'public', status: 'published' },
    ])
    const { checkAssetAccess } = await getAcl()
    const r1 = await checkAssetAccess(PATH, null)
    const r2 = await checkAssetAccess(PATH, null)
    expect(r1).toEqual({ allowed: true })
    expect(r2).toEqual({ allowed: true })
    expect(dbMock.db.select).toHaveBeenCalledTimes(1)
  })

  it('invalidateAssetAccess forces re-fetch on next call', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([
      { courseId: COURSE_ID, visibility: 'public', status: 'published' },
    ])
    const { checkAssetAccess, invalidateAssetAccess } = await getAcl()
    const r1 = await checkAssetAccess(PATH, null)
    expect(r1).toEqual({ allowed: true })

    invalidateAssetAccess(ASSET_ID)

    dbMock.mockSelect.mockResolvedValueOnce([
      { courseId: COURSE_ID, visibility: 'portal', status: 'published' },
    ])
    const r2 = await checkAssetAccess(PATH, null)
    expect(r2).toEqual({ allowed: false, status: 403 })
    expect(dbMock.db.select).toHaveBeenCalledTimes(2)
  })
})
