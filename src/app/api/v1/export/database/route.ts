import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest, hasPermission } from '@/lib/auth/api-key'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// Tabellen mit tenant_id Spalte (gefiltert nach Tenant)
const TENANT_TABLES = [
  'roles',
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
  'documents',
  'document_items',
  'din_audit_sessions',
  'din_answers',
  'wiba_audit_sessions',
  'wiba_answers',
  'n8n_connections',
  'n8n_workflow_logs',
  'cms_pages',
  'cms_blocks',
  'cms_block_templates',
  'cms_navigation_items',
  'blog_posts',
  'media_uploads',
  'company_researches',
  'firecrawl_researches',
  'business_documents',
  'business_profiles',
  'marketing_campaigns',
  'marketing_tasks',
  'marketing_templates',
  'social_media_topics',
  'social_media_posts',
]

// Globale Tabellen (ohne tenant_id, komplett exportiert)
const GLOBAL_TABLES = [
  'din_requirements',
  'din_grants',
  'wiba_requirements',
  'cms_block_type_definitions',
]

// role_permissions hat kein tenant_id, aber roleId -> export ueber JOIN
const ROLE_PERMISSIONS_TABLE = 'role_permissions'

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
          console.error('Fehler beim Export der Tabelle tenants:', error)
        }

        // 2. Tenant-spezifische Tabellen (WHERE tenant_id = ...)
        for (const table of TENANT_TABLES) {
          try {
            const rows = await db.execute<Record<string, unknown>>(
              sql`SELECT * FROM ${sql.identifier(table)} WHERE tenant_id = ${tenantId}`
            )
            write(exportRows(rows as unknown as Record<string, unknown>[], table))
          } catch (error) {
            console.error(`Fehler beim Export der Tabelle ${table}:`, error)
          }
        }

        // 3. role_permissions (ueber roles.tenant_id verknuepft)
        try {
          const rows = await db.execute<Record<string, unknown>>(
            sql`SELECT rp.* FROM ${sql.identifier(ROLE_PERMISSIONS_TABLE)} rp INNER JOIN roles r ON rp.role_id = r.id WHERE r.tenant_id = ${tenantId}`
          )
          write(exportRows(rows as unknown as Record<string, unknown>[], ROLE_PERMISSIONS_TABLE))
        } catch (error) {
          console.error('Fehler beim Export der Tabelle role_permissions:', error)
        }

        // 4. Globale Tabellen (komplett, ohne Filter)
        for (const table of GLOBAL_TABLES) {
          try {
            const rows = await db.execute<Record<string, unknown>>(
              sql`SELECT * FROM ${sql.identifier(table)}`
            )
            write(exportRows(rows as unknown as Record<string, unknown>[], table))
          } catch (error) {
            console.error(`Fehler beim Export der Tabelle ${table}:`, error)
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
