import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError, parsePaginationParams } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { isValidTable, OWNER_ONLY_TABLES } from '@/lib/db/table-whitelist'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

type Row = Record<string, unknown>

function toRows(result: unknown): Row[] {
  return result as Row[]
}

interface RouteContext {
  params: Promise<{ tableName: string }>
}

// GET /api/v1/admin/database/tables/[tableName] - Read table data
export async function GET(request: NextRequest, context: RouteContext) {
  return withPermission(request, 'database', 'read', async (auth) => {
    const { tableName } = await context.params

    if (!(await isValidTable(tableName))) {
      return apiError('INVALID_TABLE', `Tabelle "${tableName}" existiert nicht`, 400)
    }

    try {
      const { searchParams } = new URL(request.url)
      const { page, limit } = parsePaginationParams(searchParams)
      const offset = ((page ?? 1) - 1) * (limit ?? 20)

      // Get column metadata
      const columnsRaw = toRows(await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `))

      const columns = columnsRaw.map((row) => ({
        name: row.column_name as string,
        type: row.data_type as string,
        nullable: row.is_nullable === 'YES',
        default: row.column_default as string | null,
      }))

      const tableIdent = sql.identifier(tableName)

      const countRows = toRows(await db.execute(sql`
        SELECT COUNT(*) as total FROM ${tableIdent}
      `))
      const dataRows = toRows(await db.execute(sql`
        SELECT * FROM ${tableIdent}
        LIMIT ${limit} OFFSET ${offset}
      `))

      const total = Number(countRows[0]?.total ?? 0)
      const totalPages = Math.ceil(total / (limit ?? 20))

      // Mask sensitive fields (passwords, secrets, tokens)
      const SENSITIVE_PATTERNS = /password|secret|token|api_key|private_key|credential/i
      const maskedRows = dataRows.map((row) => {
        const masked: Row = {}
        for (const [key, value] of Object.entries(row)) {
          if (SENSITIVE_PATTERNS.test(key) && value && typeof value === 'string') {
            masked[key] = '••••••••'
          } else {
            masked[key] = value
          }
        }
        return masked
      })

      return apiSuccess(
        { columns, rows: maskedRows },
        { page: page ?? 1, limit: limit ?? 20, total, totalPages }
      )
    } catch (error) {
      logger.error(`Database table read error (${tableName})`, error, { module: 'AdminDatabaseTablesAPI' })
      return apiServerError('Fehler beim Laden der Tabellendaten')
    }
  })
}

// PUT /api/v1/admin/database/tables/[tableName] - Update a row
export async function PUT(request: NextRequest, context: RouteContext) {
  return withPermission(request, 'database', 'update', async (auth) => {
    const { tableName } = await context.params

    if (!(await isValidTable(tableName))) {
      return apiError('INVALID_TABLE', `Tabelle "${tableName}" existiert nicht`, 400)
    }

    // Global tables can only be modified by owners
    if (OWNER_ONLY_TABLES.has(tableName) && auth.role !== 'owner') {
      return apiError('FORBIDDEN', 'Nur Owner duerfen globale Tabellen aendern', 403)
    }

    try {
      const body = await request.json()
      const { id, ...updates } = body

      if (!id) {
        return apiError('MISSING_ID', 'ID ist erforderlich', 400)
      }

      // Get allowed column names for this table
      const colRows = toRows(await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
      `))
      const allowedColumns = new Set(colRows.map((r) => r.column_name as string))

      // Filter to only valid columns
      const validUpdates = Object.entries(updates).filter(([key]) => allowedColumns.has(key))
      if (validUpdates.length === 0) {
        return apiError('NO_VALID_COLUMNS', 'Keine gültigen Spalten zum Aktualisieren', 400)
      }

      const tableIdent = sql.identifier(tableName)

      // Build SET clause with parameterized values
      const setClauses = validUpdates.map(([col, val]) =>
        sql`${sql.identifier(col)} = ${val}`
      )
      const setClause = sql.join(setClauses, sql`, `)

      const result = toRows(await db.execute(sql`
        UPDATE ${tableIdent}
        SET ${setClause}
        WHERE id = ${id}
        RETURNING *
      `))

      if (result.length === 0) {
        return apiError('NOT_FOUND', 'Datensatz nicht gefunden', 404)
      }

      return apiSuccess(result[0])
    } catch (error) {
      logger.error(`Database table update error (${tableName})`, error, { module: 'AdminDatabaseTablesAPI' })
      return apiServerError('Fehler beim Aktualisieren des Datensatzes')
    }
  })
}

// DELETE /api/v1/admin/database/tables/[tableName] - Delete a row
export async function DELETE(request: NextRequest, context: RouteContext) {
  return withPermission(request, 'database', 'delete', async (auth) => {
    const { tableName } = await context.params

    if (!(await isValidTable(tableName))) {
      return apiError('INVALID_TABLE', `Tabelle "${tableName}" existiert nicht`, 400)
    }

    // Global tables can only be modified by owners
    if (OWNER_ONLY_TABLES.has(tableName) && auth.role !== 'owner') {
      return apiError('FORBIDDEN', 'Nur Owner duerfen globale Tabellen aendern', 403)
    }

    try {
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')

      if (!id) {
        return apiError('MISSING_ID', 'ID ist erforderlich', 400)
      }

      const tableIdent = sql.identifier(tableName)

      const result = toRows(await db.execute(sql`
        DELETE FROM ${tableIdent} WHERE id = ${id}
        RETURNING id
      `))

      if (result.length === 0) {
        return apiError('NOT_FOUND', 'Datensatz nicht gefunden', 404)
      }

      return apiSuccess({ deleted: true, id })
    } catch (error) {
      logger.error(`Database table delete error (${tableName})`, error, { module: 'AdminDatabaseTablesAPI' })
      return apiServerError('Fehler beim Loeschen des Datensatzes')
    }
  })
}
