import { describe, it, expect, vi } from 'vitest'
import { bootstrapMigrationTracking, type MigratorDeps } from '@/lib/db/migrator'

function buildDb(initialState: {
  trackingRows?: Array<{ name: string }>
  userCount?: number | 'table-missing'
}) {
  const insertedNames: string[] = []
  let trackingRows = initialState.trackingRows ?? []
  const userCount = initialState.userCount ?? 0

  const dbExecute = vi.fn(async (raw: unknown) => {
    const queries = (raw as { queryChunks?: Array<{ value?: string[] }> }).queryChunks
    const queryText = queries
      ? queries
          .map((c) => (Array.isArray(c.value) ? c.value.join('') : ''))
          .join('?')
      : JSON.stringify(raw)

    if (/CREATE TABLE IF NOT EXISTS _migrations/i.test(queryText)) {
      return undefined
    }
    if (/SELECT name FROM _migrations/i.test(queryText)) {
      return trackingRows
    }
    if (/FROM users/i.test(queryText)) {
      if (userCount === 'table-missing') {
        throw new Error('relation "users" does not exist')
      }
      return [{ c: userCount }]
    }
    if (/INSERT INTO _migrations/i.test(queryText)) {
      const m = /VALUES \(([^)]*)\)/.exec(queryText)
      const name = m?.[1]?.replace(/['"]/g, '') ?? '<unknown>'
      insertedNames.push(name)
      trackingRows = [...trackingRows, { name }]
      return undefined
    }
    return undefined
  })

  const db = { execute: dbExecute }
  return { db, insertedNames }
}

function buildLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }
}

const FAKE_MIGRATIONS = [
  { name: '001_first.sql', description: 'first' },
  { name: '002_second.sql', description: 'second' },
  { name: '003_third.sql', description: 'third' },
]

function buildDeps(overrides: {
  trackingRows?: Array<{ name: string }>
  userCount?: number | 'table-missing'
}): { deps: MigratorDeps; insertedNames: string[]; loggerInfo: ReturnType<typeof vi.fn> } {
  const { db, insertedNames } = buildDb(overrides)
  const logger = buildLogger()
  return {
    deps: {
      db,
      logger,
      migrations: FAKE_MIGRATIONS,
      readMigrationFile: vi.fn(async () => ''),
    },
    insertedNames,
    loggerInfo: logger.info,
  }
}

describe('bootstrapMigrationTracking', () => {
  it('does nothing when _migrations already populated', async () => {
    const { deps, insertedNames } = buildDeps({
      trackingRows: [{ name: '001_first.sql' }],
      userCount: 5,
    })

    const result = await bootstrapMigrationTracking(deps)

    expect(result).toEqual({ marked: 0, reason: 'already-tracked' })
    expect(insertedNames).toEqual([])
  })

  it('marks all migrations as applied on established DB with empty tracking', async () => {
    const { deps, insertedNames, loggerInfo } = buildDeps({
      trackingRows: [],
      userCount: 5,
    })

    const result = await bootstrapMigrationTracking(deps)

    expect(result).toEqual({ marked: 3, reason: 'bootstrapped' })
    expect(insertedNames).toHaveLength(3)
    expect(loggerInfo).toHaveBeenCalledWith(
      expect.stringContaining('marked 3 migration(s)'),
      expect.any(Object),
    )
  })

  it('does not bootstrap on fresh DB (users table empty)', async () => {
    const { deps, insertedNames } = buildDeps({
      trackingRows: [],
      userCount: 0,
    })

    const result = await bootstrapMigrationTracking(deps)

    expect(result).toEqual({ marked: 0, reason: 'fresh-db' })
    expect(insertedNames).toEqual([])
  })

  it('does not bootstrap when users table does not exist', async () => {
    const { deps, insertedNames } = buildDeps({
      trackingRows: [],
      userCount: 'table-missing',
    })

    const result = await bootstrapMigrationTracking(deps)

    expect(result).toEqual({ marked: 0, reason: 'fresh-db' })
    expect(insertedNames).toEqual([])
  })

  it('ensures _migrations table exists before reading', async () => {
    const { deps } = buildDeps({ trackingRows: [{ name: 'x' }], userCount: 0 })

    await bootstrapMigrationTracking(deps)

    const calls = (deps.db.execute as ReturnType<typeof vi.fn>).mock.calls
    const firstCallArg = calls[0]?.[0]
    const stringified = JSON.stringify(firstCallArg)
    expect(stringified).toMatch(/CREATE TABLE IF NOT EXISTS _migrations/i)
  })
})
