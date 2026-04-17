import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { TENANT_TABLES, GLOBAL_TABLES, JOIN_TABLES } from '@/lib/db/table-whitelist'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export const dynamic = 'force-dynamic'

// JOIN-Tabellen werden dynamisch aus table-whitelist geladen

function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
  }
  return String(value)
}

function exportRows(rows: Record<string, unknown>[], table: string): string {
  if (rows.length === 0) return ''

  let dump = `-- Tabelle: ${table}\n`
  dump += `-- Anzahl Datensaetze: ${rows.length}\n`
  dump += `-- =============================================\n\n`

  const columns = Object.keys(rows[0])

  for (const row of rows) {
    const values = columns.map((col) => formatSqlValue(row[col]))
    dump += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`
  }

  dump += '\n\n'
  return dump
}

export async function GET(request: NextRequest) {
<<<<<<< HEAD
  return withPermission(request, 'database', 'read', async (auth) => {
  const tenantId = TENANT_ID

=======
  return withPermission(request, 'database', 'read', async (_auth) => {
>>>>>>> 9e30423 (feat(05-02): handle special cases — export, import, tenant routes)
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const write = (text: string) => controller.enqueue(encoder.encode(text))

      // Write header
      write(`-- SQL Export der xKMU-Instanz\n`)
      write(`-- Erstellt am: ${new Date().toISOString()}\n`)
      write(`-- =============================================\n\n`)

      try {
        // 1. Tenant selbst (WHERE id = TENANT_ID)
        try {
          const rows = await db.execute<Record<string, unknown>>(
            sql`SELECT * FROM tenants WHERE id = ${TENANT_ID}`
          )
          write(exportRows(rows as unknown as Record<string, unknown>[], 'tenants'))
        } catch (error) {
          logger.error('Fehler beim Export der Tabelle tenants', error, { module: 'ExportDatabaseAPI' })
        }

        // 2. Tenant-spezifische Tabellen (alle Zeilen, kein Tenant-Filter)
        for (const table of TENANT_TABLES) {
          try {
            const rows = await db.execute<Record<string, unknown>>(
              sql`SELECT * FROM ${sql.identifier(table)}`
            )
            write(exportRows(rows as unknown as Record<string, unknown>[], table))
          } catch (error) {
            logger.error(`Fehler beim Export der Tabelle ${table}`, error, { module: 'ExportDatabaseAPI' })
          }
        }

        // 3. JOIN-Tabellen (alle Zeilen, kein Tenant-Filter)
        for (const jt of JOIN_TABLES) {
          try {
            const rows = await db.execute<Record<string, unknown>>(
              sql`SELECT * FROM ${sql.identifier(jt.table)}`
            )
            write(exportRows(rows as unknown as Record<string, unknown>[], jt.table))
          } catch (error) {
            logger.error(`Fehler beim Export der Tabelle ${jt.table}`, error, { module: 'ExportDatabaseAPI' })
          }
        }

        // 4. Globale Tabellen (komplett, ohne Filter)
        for (const table of GLOBAL_TABLES) {
          try {
            const rows = await db.execute<Record<string, unknown>>(
              sql`SELECT * FROM ${sql.identifier(table)}`
            )
            write(exportRows(rows as unknown as Record<string, unknown>[], table))
          } catch (error) {
            logger.error(`Fehler beim Export der Tabelle ${table}`, error, { module: 'ExportDatabaseAPI' })
          }
        }

        write(`-- Export abgeschlossen\n`)
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="database-export-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.sql"`,
      'Transfer-Encoding': 'chunked',
    },
  })
  })
}
