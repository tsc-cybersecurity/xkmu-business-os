/**
 * Auto-Migrator — fuehrt pendende SQL-Migrationen bei App-Start aus.
 *
 * Wird von instrumentation.ts aufgerufen, noch bevor Cron-Jobs starten.
 * Tracked ausgefuehrte Migrationen in der _migrations-Tabelle.
 */
import { sql } from 'drizzle-orm'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { MIGRATIONS } from './migrations'

const MIGRATIONS_DIR = join(process.cwd(), 'src/lib/db/migrations')

const ENSURE_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ DEFAULT NOW()
  )
`

export async function runPendingMigrations() {
  // Lazy import — db/logger werden nur zur Laufzeit geladen
  const { db } = await import('@/lib/db')
  const { logger } = await import('@/lib/utils/logger')

  const MOD = 'Migrator'

  try {
    // Tracking-Tabelle sicherstellen
    await db.execute(sql.raw(ENSURE_TRACKING_TABLE))

    // Bereits ausgefuehrte Migrationen laden
    const executed = await db.execute(
      sql`SELECT name FROM _migrations`
    ) as unknown as { name: string }[]
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
