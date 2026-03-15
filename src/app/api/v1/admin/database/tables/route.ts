import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/admin/database/tables - List all tables with row counts
export async function GET(request: NextRequest) {
  return withPermission(request, 'database', 'read', async () => {
    try {
      const result = await db.execute(sql`
        SELECT
          t.table_name,
          COALESCE(s.n_live_tup, 0) as estimated_rows
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
      `)

      const rows = result as unknown as Record<string, unknown>[]
      const tables = rows.map((row) => ({
        name: row.table_name as string,
        estimatedRows: Number(row.estimated_rows || 0),
      }))

      return apiSuccess(tables)
    } catch (error) {
      logger.error('Database tables list error', error, { module: 'AdminDatabaseTablesAPI' })
      return apiServerError('Fehler beim Laden der Tabellenliste')
    }
  })
}
