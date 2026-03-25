import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/admin/database/tables - List all tables with exact row counts
export async function GET(request: NextRequest) {
  return withPermission(request, 'database', 'read', async () => {
    try {
      // Tabellennamen holen
      const tableResult = await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)

      const tableNames = (tableResult as unknown as Record<string, unknown>[]).map(
        (r) => r.table_name as string
      )

      // Exakte Zählung pro Tabelle
      const tables = await Promise.all(
        tableNames.map(async (name) => {
          try {
            const countResult = await db.execute(
              sql`SELECT COUNT(*) as cnt FROM ${sql.identifier(name)}`
            )
            const rows = countResult as unknown as Record<string, unknown>[]
            return { name, estimatedRows: Number(rows[0]?.cnt || 0) }
          } catch {
            return { name, estimatedRows: 0 }
          }
        })
      )

      return apiSuccess(tables)
    } catch (error) {
      logger.error('Database tables list error', error, { module: 'AdminDatabaseTablesAPI' })
      return apiServerError('Fehler beim Laden der Tabellenliste')
    }
  })
}
