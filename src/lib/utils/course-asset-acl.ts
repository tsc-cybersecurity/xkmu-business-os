import { db } from '@/lib/db'
import { courseAssets, courses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface SessionLike {
  user?: { id: string } | null
}

export type AssetAccessResult =
  | { allowed: true }
  | { allowed: false; status: 403 | 404 }

interface CachedAccess {
  courseId: string
  visibility: 'public' | 'portal' | 'both'
  status: 'draft' | 'published' | 'archived'
  cachedAt: number
}

const TTL_MS = 5 * 60 * 1000
const MAX_ENTRIES = 500
// FIFO + TTL cache. Insertion order = age. evictIfFull() drops the oldest insertion.
// Note: not LRU on read — a hot cache hit does not move the entry. This is acceptable
// for Range-Request workloads (one cold start, then many hits on the same entry).
const cache = new Map<string, CachedAccess>()

function isStale(entry: CachedAccess): boolean {
  return Date.now() - entry.cachedAt > TTL_MS
}

function evictIfFull(): void {
  while (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (!oldestKey) break
    cache.delete(oldestKey)
  }
}

const ASSET_PATH_RE = /^[0-9a-f-]{36}\/([0-9a-f-]{36})\.[a-zA-Z0-9]+$/

function extractAssetId(path: string): string | null {
  const m = ASSET_PATH_RE.exec(path)
  return m ? m[1] : null
}

async function loadAssetAccessFromDb(assetId: string): Promise<Omit<CachedAccess, 'cachedAt'> | null> {
  const rows = await db
    .select({
      courseId: courseAssets.courseId,
      visibility: courses.visibility,
      status: courses.status,
    })
    .from(courseAssets)
    .leftJoin(courses, eq(courseAssets.courseId, courses.id))
    .where(eq(courseAssets.id, assetId))
    .limit(1)
  const row = rows[0]
  if (!row || !row.courseId || !row.visibility || !row.status) return null
  return {
    courseId: row.courseId,
    visibility: row.visibility as CachedAccess['visibility'],
    status: row.status as CachedAccess['status'],
  }
}

export async function checkAssetAccess(
  assetPath: string,
  session: SessionLike | null,
): Promise<AssetAccessResult> {
  const assetId = extractAssetId(assetPath)
  if (!assetId) return { allowed: false, status: 404 }

  let entry = cache.get(assetId)
  if (!entry || isStale(entry)) {
    const fresh = await loadAssetAccessFromDb(assetId)
    if (!fresh) return { allowed: false, status: 404 }
    entry = { ...fresh, cachedAt: Date.now() }
    evictIfFull()
    // On stale-refresh: re-insert to move the entry to the end of insertion order
    // (so eviction picks the actually-oldest entry next time, not this freshly-loaded one).
    cache.delete(assetId)
    cache.set(assetId, entry)
  }

  if (entry.status !== 'published') return { allowed: false, status: 404 }
  if (entry.visibility === 'public' || entry.visibility === 'both') return { allowed: true }
  if (session?.user) return { allowed: true }
  return { allowed: false, status: 403 }
}

export function invalidateAssetAccess(assetId: string): void {
  cache.delete(assetId)
}

export function invalidateAssetAccessByCourse(courseId: string): void {
  for (const [key, value] of cache.entries()) {
    if (value.courseId === courseId) cache.delete(key)
  }
}

export function __resetCacheForTests(): void {
  cache.clear()
}
