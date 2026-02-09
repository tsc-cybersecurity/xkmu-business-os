import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Nur Admins dürfen exportieren
    const isAdmin = session.user.role === 'owner' || session.user.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const tenantId = session.user.tenantId

    // Liste aller Tabellen des Schemas
    const tables = [
      'tenants',
      'roles',
      'role_permissions',
      'users',
      'api_keys',
      'companies',
      'persons',
      'leads',
      'product_categories',
      'products',
      'ai_providers',
      'ai_logs',
      'ai_prompt_templates',
      'ideas',
      'activities',
      'webhooks',
      'audit_log',
    ]

    let sqlDump = `-- SQL Export für Tenant: ${tenantId}\n`
    sqlDump += `-- Erstellt am: ${new Date().toISOString()}\n`
    sqlDump += `-- =============================================\n\n`

    // Für jede Tabelle Daten exportieren
    for (const table of tables) {
      try {
        // Daten für diesen Tenant abrufen
        const rows = await db.execute<Record<string, unknown>>(
          sql.raw(`SELECT * FROM ${table} WHERE tenant_id = '${tenantId}'`)
        )

        if (rows.length > 0) {
          sqlDump += `-- Tabelle: ${table}\n`
          sqlDump += `-- Anzahl Datensätze: ${rows.length}\n`
          sqlDump += `-- =============================================\n\n`

          // Spalten ermitteln
          const columns = Object.keys(rows[0])

          // INSERT Statements generieren
          for (const row of rows) {
            const values = columns.map((col) => {
              const value = row[col]

              if (value === null || value === undefined) {
                return 'NULL'
              }

              if (typeof value === 'string') {
                // String escapen für SQL
                return `'${value.replace(/'/g, "''")}'`
              }

              if (typeof value === 'boolean') {
                return value ? 'TRUE' : 'FALSE'
              }

              if (typeof value === 'object') {
                // JSON Objekte/Arrays
                return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
              }

              if (value instanceof Date) {
                return `'${value.toISOString()}'`
              }

              // Zahlen und andere Werte
              return String(value)
            })

            sqlDump += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`
          }

          sqlDump += '\n\n'
        }
      } catch (error) {
        // Falls Tabelle keine tenant_id Spalte hat (z.B. tenants selbst), speziell behandeln
        if (table === 'tenants') {
          try {
            const rows = await db.execute<Record<string, unknown>>(
              sql.raw(`SELECT * FROM ${table} WHERE id = '${tenantId}'`)
            )

            if (rows.length > 0) {
              sqlDump += `-- Tabelle: ${table}\n`
              sqlDump += `-- =============================================\n\n`

              const columns = Object.keys(rows[0])

              for (const row of rows) {
                const values = columns.map((col) => {
                  const value = row[col]

                  if (value === null || value === undefined) {
                    return 'NULL'
                  }

                  if (typeof value === 'string') {
                    return `'${value.replace(/'/g, "''")}'`
                  }

                  if (typeof value === 'boolean') {
                    return value ? 'TRUE' : 'FALSE'
                  }

                  if (typeof value === 'object') {
                    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
                  }

                  if (value instanceof Date) {
                    return `'${value.toISOString()}'`
                  }

                  return String(value)
                })

                sqlDump += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`
              }

              sqlDump += '\n\n'
            }
          } catch (innerError) {
            console.error(`Fehler beim Export der Tabelle ${table}:`, innerError)
          }
        }
      }
    }

    sqlDump += `-- Export abgeschlossen\n`

    // SQL als Datei zurückgeben
    return new NextResponse(sqlDump, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="database-export-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.sql"`,
      },
    })
  } catch (error) {
    console.error('Database export error:', error)
    return NextResponse.json(
      { error: 'Export fehlgeschlagen' },
      { status: 500 }
    )
  }
}
