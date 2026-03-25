import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest, hasPermission } from '@/lib/auth/api-key'
import { db } from '@/lib/db'
import { TENANT_TABLES, GLOBAL_TABLES, JOIN_TABLES } from '@/lib/db/table-whitelist'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

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

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    const isAdmin = session.user.role === 'owner' || session.user.role === 'admin'
    if (!isAdmin) return { error: 'forbidden' as const }
    return { tenantId: session.user.tenantId }
  }

  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      if (!hasPermission(payload, 'read')) return { error: 'forbidden' as const }
      return { tenantId: payload.tenantId }
    }
  }

  return { error: 'unauthorized' as const }
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)

  if ('error' in auth) {
    if (auth.error === 'unauthorized') {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }

  const tenantId = auth.tenantId

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const write = (text: string) => controller.enqueue(encoder.encode(text))

      // Write header
      write(`-- SQL Export fuer Tenant: ${tenantId}\n`)
      write(`-- Erstellt am: ${new Date().toISOString()}\n`)
      write(`-- =============================================\n\n`)

      try {
        // 1. Tenant selbst (WHERE id = ...)
        try {
          const rows = await db.execute<Record<string, unknown>>(
            sql`SELECT * FROM tenants WHERE id = ${tenantId}`
          )
          write(exportRows(rows as unknown as Record<string, unknown>[], 'tenants'))
        } catch (error) {
          logger.error('Fehler beim Export der Tabelle tenants', error, { module: 'ExportDatabaseAPI' })
        }

        // 2. Tenant-spezifische Tabellen (WHERE tenant_id = ...)
        for (const table of TENANT_TABLES) {
          try {
            const rows = await db.execute<Record<string, unknown>>(
              sql`SELECT * FROM ${sql.identifier(table)} WHERE tenant_id = ${tenantId}`
            )
            write(exportRows(rows as unknown as Record<string, unknown>[], table))
          } catch (error) {
            logger.error(`Fehler beim Export der Tabelle ${table}`, error, { module: 'ExportDatabaseAPI' })
          }
        }

        // 3. JOIN-Tabellen (kein tenant_id, aber ueber Parent verknuepft)
        for (const jt of JOIN_TABLES) {
          try {
            const rows = await db.execute<Record<string, unknown>>(
              sql`SELECT t.* FROM ${sql.identifier(jt.table)} t INNER JOIN ${sql.identifier(jt.parentTable)} p ON t.${sql.identifier(jt.foreignKey)} = p.${sql.identifier(jt.parentForeignKey)} WHERE p.tenant_id = ${tenantId}`
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
}
