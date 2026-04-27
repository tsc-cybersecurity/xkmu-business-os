/**
 * Auto-Migrator — fuehrt pendende SQL-Migrationen bei App-Start aus.
 *
 * Wird von instrumentation.ts aufgerufen, noch bevor Cron-Jobs starten.
 * Tracked ausgefuehrte Migrationen in der _migrations-Tabelle.
 *
 * Bootstrap (Sub-2d): Wenn _migrations leer ist UND die DB bereits Daten hat
 * (users-Tabelle ist nicht leer), markieren wir alle bekannten Migrationen
 * als applied — ohne sie auszufuehren. Hintergrund: drizzle-kit push --force
 * droppt _migrations bei jedem Deploy (jetzt durch Schema-Eintrag fixed,
 * aber bestehende DBs haben den Drop bereits hinter sich), und der Migrator
 * stirbt deterministisch auf Legacy-001 (`tenant_id`-Refs nach 003-Drop).
 */
import { sql } from 'drizzle-orm'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { MIGRATIONS, type Migration } from './migrations'

const MIGRATIONS_DIR = join(process.cwd(), 'src/lib/db/migrations')

const ENSURE_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ DEFAULT NOW()
  )
`

export interface MigratorDeps {
  db: {
    execute: (query: unknown) => Promise<unknown>
  }
  logger: {
    info: (msg: string, ctx?: Record<string, unknown>) => void
    error: (msg: string, err: unknown, ctx?: Record<string, unknown>) => void
    warn: (msg: string, ctx?: Record<string, unknown>) => void
  }
  migrations: Migration[]
  readMigrationFile: (name: string) => Promise<string>
}

/**
 * Bootstrap: bei leerem _migrations-Tracking + bereits etablierter DB alle
 * bekannten Migrationen als applied markieren. Idempotent.
 *
 * Established-Marker: users-Tabelle hat >=1 Row. Bei einem fresh-DB-Install
 * (Schema von drizzle-kit push, Daten von seed-check) gibt's noch keine
 * users → wir machen nichts und der Migrator laeuft normal weiter.
 */
export async function bootstrapMigrationTracking(deps: MigratorDeps): Promise<{
  marked: number
  reason: 'fresh-db' | 'already-tracked' | 'bootstrapped'
}> {
  const { db, logger, migrations } = deps
  const MOD = 'Migrator'

  await db.execute(sql.raw(ENSURE_TRACKING_TABLE))

  const trackingRows = (await db.execute(
    sql`SELECT name FROM _migrations`
  )) as unknown as Array<{ name: string }>

  if (trackingRows.length > 0) {
    return { marked: 0, reason: 'already-tracked' }
  }

  // _migrations leer — etablierte DB? Marker: users-Tabelle hat Rows.
  let userCount = 0
  try {
    const userRows = (await db.execute(
      sql`SELECT COUNT(*)::int AS c FROM users`
    )) as unknown as Array<{ c: number }>
    userCount = userRows[0]?.c ?? 0
  } catch {
    // users-Tabelle existiert nicht → fresh DB ohne Schema → nicht bootstrappen
    return { marked: 0, reason: 'fresh-db' }
  }

  if (userCount === 0) {
    return { marked: 0, reason: 'fresh-db' }
  }

  // Etablierte DB mit leerem Tracking → alle bekannten Migrationen als applied markieren.
  for (const m of migrations) {
    await db.execute(
      sql`INSERT INTO _migrations (name) VALUES (${m.name}) ON CONFLICT (name) DO NOTHING`
    )
  }

  logger.info(
    `Bootstrap: marked ${migrations.length} migration(s) as applied (DB had data but tracking was empty)`,
    { module: MOD },
  )

  return { marked: migrations.length, reason: 'bootstrapped' }
}

export async function runPendingMigrations() {
  const { db } = await import('@/lib/db')
  const { logger } = await import('@/lib/utils/logger')

  const MOD = 'Migrator'

  try {
    // Bootstrap zuerst: markiert alte Migrationen ggf. als applied.
    await bootstrapMigrationTracking({
      db: db as MigratorDeps['db'],
      logger,
      migrations: MIGRATIONS,
      readMigrationFile: (name) => readFile(join(MIGRATIONS_DIR, name), 'utf-8'),
    })

    // Bereits ausgefuehrte Migrationen laden
    const executed = (await db.execute(
      sql`SELECT name FROM _migrations`
    )) as unknown as { name: string }[]
    const executedSet = new Set(executed.map((r) => r.name))

    // Pendende Migrationen filtern
    const pending = MIGRATIONS.filter((m) => !executedSet.has(m.name))

    if (pending.length === 0) {
      logger.info('Keine pendenden Migrationen', { module: MOD })
      return { executed: 0, total: MIGRATIONS.length }
    }

    logger.info(`${pending.length} Migration(en) gefunden, starte...`, { module: MOD })

    let successCount = 0

    for (const migration of pending) {
      const filePath = join(MIGRATIONS_DIR, migration.name)
      try {
        const content = await readFile(filePath, 'utf-8')

        logger.info(`Migration: ${migration.name} — ${migration.description}`, { module: MOD })
        await db.execute(sql.raw(content))

        // Als ausgefuehrt markieren
        await db.execute(
          sql`INSERT INTO _migrations (name) VALUES (${migration.name})`
        )

        successCount++
        logger.info(`✓ ${migration.name} erfolgreich`, { module: MOD })
      } catch (error) {
        logger.error(`✗ ${migration.name} fehlgeschlagen`, error, { module: MOD })
        // Abbrechen — keine weiteren Migrationen ausfuehren
        throw error
      }
    }

    logger.info(`Alle ${successCount} Migration(en) erfolgreich`, { module: MOD })
    return { executed: successCount, total: MIGRATIONS.length }
  } catch (error) {
    logger.error('Migration fehlgeschlagen — App startet trotzdem', error, { module: MOD })
    return { executed: 0, total: MIGRATIONS.length, error }
  }
}
