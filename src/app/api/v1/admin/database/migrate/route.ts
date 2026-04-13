import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

const MIGRATIONS_DIR = join(process.cwd(), 'src/lib/db/migrations')

// Tracking-Tabelle fuer ausgefuehrte Migrationen
const ENSURE_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ DEFAULT NOW()
  )
`

// GET /api/v1/admin/database/migrate — Liste aller Migrationen + Status
export async function GET(request: NextRequest) {
  return withPermission(request, 'database', 'read', async () => {
    try {
      await db.execute(sql.raw(ENSURE_TRACKING_TABLE))

      // Bereits ausgefuehrte Migrationen
      const executed = await db.execute(
        sql`SELECT name, executed_at FROM _migrations ORDER BY name`
      ) as unknown as { name: string; executed_at: string }[]
      const executedSet = new Set(executed.map((r) => r.name))

      // Verfuegbare .sql-Dateien
      let files: string[] = []
      try {
        const all = await readdir(MIGRATIONS_DIR)
        files = all.filter((f) => f.endsWith('.sql')).sort()
      } catch {
        // Verzeichnis existiert nicht
      }

      const migrations = files.map((f) => ({
        name: f,
        executed: executedSet.has(f),
        executedAt: executed.find((r) => r.name === f)?.executed_at ?? null,
      }))

      return apiSuccess({
        migrations,
        pending: migrations.filter((m) => !m.executed).length,
        total: migrations.length,
      })
    } catch (error) {
      logger.error('Migration list error', error, { module: 'MigrateAPI' })
      return apiServerError(error)
    }
  })
}

// POST /api/v1/admin/database/migrate — Ausfuehren pendender Migrationen
// Body: { name?: string } — optional: nur eine bestimmte Migration ausfuehren
export async function POST(request: NextRequest) {
  return withPermission(request, 'database', 'create', async () => {
    try {
      await db.execute(sql.raw(ENSURE_TRACKING_TABLE))

      const body = await request.json().catch(() => ({}))
      const targetName = (body as { name?: string }).name

      // Bereits ausgefuehrte
      const executed = await db.execute(
        sql`SELECT name FROM _migrations`
      ) as unknown as { name: string }[]
      const executedSet = new Set(executed.map((r) => r.name))

      // Verfuegbare Dateien
      let files: string[] = []
      try {
        const all = await readdir(MIGRATIONS_DIR)
        files = all.filter((f) => f.endsWith('.sql')).sort()
      } catch {
        return apiError('Migrations-Verzeichnis nicht gefunden', 404)
      }

      // Filtern
      const pending = targetName
        ? files.filter((f) => f === targetName && !executedSet.has(f))
        : files.filter((f) => !executedSet.has(f))

      if (pending.length === 0) {
        return apiSuccess({
          message: targetName
            ? `Migration ${targetName} bereits ausgefuehrt oder nicht gefunden`
            : 'Keine pendenden Migrationen',
          executed: [],
        })
      }

      const results: { name: string; success: boolean; error?: string }[] = []

      for (const file of pending) {
        const filePath = join(MIGRATIONS_DIR, file)
        try {
          const content = await readFile(filePath, 'utf-8')

          // SQL ausfuehren (raw, da DDL-Statements)
          await db.execute(sql.raw(content))

          // Als ausgefuehrt markieren
          await db.execute(
            sql`INSERT INTO _migrations (name) VALUES (${file})`
          )

          results.push({ name: file, success: true })
          logger.info(`Migration ${file} erfolgreich`, { module: 'MigrateAPI' })
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          results.push({ name: file, success: false, error: msg })
          logger.error(`Migration ${file} fehlgeschlagen`, error, { module: 'MigrateAPI' })
          // Abbrechen bei Fehler
          break
        }
      }

      const allSuccess = results.every((r) => r.success)

      return apiSuccess({
        message: allSuccess
          ? `${results.length} Migration(en) erfolgreich ausgefuehrt`
          : 'Migration mit Fehler abgebrochen',
        executed: results,
      })
    } catch (error) {
      logger.error('Migration execution error', error, { module: 'MigrateAPI' })
      return apiServerError(error)
    }
  })
}
