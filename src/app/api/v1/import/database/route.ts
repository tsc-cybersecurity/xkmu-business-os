import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest, hasPermission } from '@/lib/auth/api-key'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

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
      if (!hasPermission(payload, 'write')) return { error: 'forbidden' as const }
      return { tenantId: payload.tenantId }
    }
  }

  return { error: 'unauthorized' as const }
}

// Erlaubte Tabellen für den Import (Reihenfolge wichtig wegen Foreign Keys)
const ALLOWED_TABLES = [
  // Grundstruktur
  'tenants',
  'roles',
  'role_permissions',
  'users',
  'api_keys',
  // Kontakte & Katalog
  'companies',
  'persons',
  'leads',
  'product_categories',
  'products',
  // KI & Integrationen
  'ai_providers',
  'ai_logs',
  'ai_prompt_templates',
  'n8n_connections',
  'n8n_workflow_logs',
  // Allgemein
  'ideas',
  'activities',
  'webhooks',
  'audit_log',
  'documents',
  'document_items',
  // DIN SPEC 27076
  'din_requirements',
  'din_grants',
  'din_audit_sessions',
  'din_answers',
  // BSI WiBA
  'wiba_requirements',
  'wiba_audit_sessions',
  'wiba_answers',
  // CMS & Blog
  'cms_block_type_definitions',
  'cms_pages',
  'cms_blocks',
  'cms_block_templates',
  'cms_navigation_items',
  'blog_posts',
  'media_uploads',
  // Business Intelligence
  'company_researches',
  'firecrawl_researches',
  'business_documents',
  'business_profiles',
  // Marketing & Social Media
  'marketing_campaigns',
  'marketing_tasks',
  'marketing_templates',
  'social_media_topics',
  'social_media_posts',
]

// Tabellen in umgekehrter Reihenfolge löschen (wegen Foreign Keys)
const DELETE_ORDER = [
  // Social Media & Marketing
  'social_media_posts',
  'social_media_topics',
  'marketing_templates',
  'marketing_tasks',
  'marketing_campaigns',
  // Business Intelligence
  'business_profiles',
  'business_documents',
  'firecrawl_researches',
  'company_researches',
  // CMS & Blog
  'media_uploads',
  'blog_posts',
  'cms_navigation_items',
  'cms_block_templates',
  'cms_blocks',
  'cms_pages',
  // BSI WiBA
  'wiba_answers',
  'wiba_audit_sessions',
  // DIN SPEC 27076
  'din_answers',
  'din_audit_sessions',
  // Allgemein
  'document_items',
  'documents',
  'audit_log',
  'webhooks',
  'activities',
  'ideas',
  // KI & Integrationen
  'n8n_workflow_logs',
  'n8n_connections',
  'ai_prompt_templates',
  'ai_logs',
  'ai_providers',
  // Katalog & Kontakte
  'products',
  'product_categories',
  'leads',
  'persons',
  'companies',
  // Grundstruktur
  'api_keys',
  'role_permissions',
  'users',
  'roles',
  'tenants',
]

interface ParsedInsert {
  table: string
  statement: string
}

function parseInsertStatements(sqlContent: string): ParsedInsert[] {
  const lines = sqlContent.split('\n')
  const inserts: ParsedInsert[] = []

  let currentStatement = ''

  for (const line of lines) {
    const trimmed = line.trim()

    // Kommentare und leere Zeilen überspringen
    if (!trimmed || trimmed.startsWith('--')) {
      continue
    }

    currentStatement += (currentStatement ? '\n' : '') + trimmed

    // Statement endet mit Semikolon
    if (currentStatement.endsWith(';')) {
      // Nur INSERT-Statements erlauben
      const insertMatch = currentStatement.match(
        /^INSERT\s+INTO\s+(\w+)\s*\(/i
      )

      if (insertMatch) {
        const table = insertMatch[1].toLowerCase()

        if (ALLOWED_TABLES.includes(table)) {
          inserts.push({
            table,
            statement: currentStatement,
          })
        }
      }

      currentStatement = ''
    }
  }

  return inserts
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)

    if ('error' in auth) {
      if (auth.error === 'unauthorized') {
        return NextResponse.json(
          { error: 'Nicht authentifiziert' },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }

    const tenantId = auth.tenantId

    // FormData mit SQL-Datei lesen
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const mode = (formData.get('mode') as string) || 'merge'

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.sql')) {
      return NextResponse.json(
        { error: 'Nur .sql-Dateien werden akzeptiert' },
        { status: 400 }
      )
    }

    // Dateigröße prüfen (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Datei ist zu groß (max. 50MB)' },
        { status: 400 }
      )
    }

    const sqlContent = await file.text()

    // SQL-Statements parsen
    const inserts = parseInsertStatements(sqlContent)

    if (inserts.length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen INSERT-Statements in der Datei gefunden' },
        { status: 400 }
      )
    }

    // Statistiken sammeln
    const stats: Record<string, number> = {}
    let totalInserted = 0
    let errors: string[] = []

    // Alles in einer Transaktion ausführen
    await db.transaction(async (tx) => {
      if (mode === 'replace') {
        // Bei Replace-Modus: bestehende Daten löschen
        for (const table of DELETE_ORDER) {
          try {
            if (table === 'tenants') {
              // Tenant-Datensatz nicht löschen, nur aktualisieren
              continue
            }
            await tx.execute(
              sql.raw(
                `DELETE FROM ${table} WHERE tenant_id = '${tenantId}'`
              )
            )
          } catch {
            // Tabelle existiert evtl. nicht oder hat keine tenant_id
          }
        }
      }

      // INSERT-Statements nach Tabellenreihenfolge sortieren
      const sortedInserts = [...inserts].sort((a, b) => {
        return (
          ALLOWED_TABLES.indexOf(a.table) - ALLOWED_TABLES.indexOf(b.table)
        )
      })

      for (const insert of sortedInserts) {
        try {
          let statement = insert.statement

          if (mode === 'merge') {
            // Bei Merge: ON CONFLICT DO NOTHING anfügen
            statement = statement.replace(/;\s*$/, ' ON CONFLICT DO NOTHING;')
          }

          await tx.execute(sql.raw(statement))

          stats[insert.table] = (stats[insert.table] || 0) + 1
          totalInserted++
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          errors.push(`${insert.table}: ${msg}`)

          // Bei Replace-Modus bei Fehler abbrechen
          if (mode === 'replace') {
            throw new Error(
              `Import abgebrochen bei Tabelle ${insert.table}: ${msg}`
            )
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Import erfolgreich abgeschlossen',
      stats: {
        totalStatements: inserts.length,
        totalInserted,
        tablesAffected: Object.keys(stats).length,
        perTable: stats,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
      },
    })
  } catch (error) {
    logger.error('Database import error', error, { module: 'ImportDatabaseAPI' })
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Import fehlgeschlagen',
      },
      { status: 500 }
    )
  }
}
