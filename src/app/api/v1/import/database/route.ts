import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { ALLOWED_TABLES as WHITELIST } from '@/lib/db/table-whitelist'
import { TENANT_ID } from '@/lib/constants/tenant'

export const dynamic = 'force-dynamic'

// Import-Reihenfolge (Parents vor Children wegen Foreign Keys)
const IMPORT_ORDER = [
  // Grundstruktur
  'tenants', 'roles', 'role_permissions', 'users', 'api_keys',
  // Kontakte & Katalog
  'companies', 'persons', 'leads', 'opportunities', 'product_categories', 'products',
  // KI & Integrationen
  'ai_providers', 'ai_logs', 'ai_prompt_templates', 'n8n_connections', 'n8n_workflow_logs',
  // Allgemein
  'ideas', 'activities', 'webhooks', 'audit_log',
  'documents', 'document_items', 'document_templates', 'email_templates',
  // Management Framework v2
  'deliverable_modules', 'deliverables', 'execution_logs',
  // Prozesse & Projekte
  'processes', 'process_tasks', 'projects', 'project_tasks',
  // Zeiterfassung & Finance
  'time_entries', 'task_queue', 'receipts',
  // DIN & WiBA
  'din_requirements', 'din_grants', 'din_audit_sessions', 'din_answers',
  'wiba_requirements', 'wiba_audit_sessions', 'wiba_answers',
  // CMS & Blog
  'cms_block_type_definitions', 'cms_pages', 'cms_blocks', 'cms_block_templates', 'cms_navigation_items',
  'blog_posts', 'media_uploads', 'generated_images',
  // Business Intelligence
  'company_researches', 'firecrawl_researches', 'business_documents', 'business_profiles',
  // Marketing & Social Media
  'marketing_campaigns', 'marketing_tasks', 'marketing_templates',
  'social_media_topics', 'social_media_posts',
  // Newsletter & Feedback
  'newsletter_subscribers', 'newsletter_campaigns',
  'feedback_forms', 'feedback_responses',
  // Chat & Cockpit
  'chat_conversations', 'chat_messages',
  'cockpit_systems', 'cockpit_credentials',
]

// Löschreihenfolge = umgekehrt (Children vor Parents)
const DELETE_ORDER = [...IMPORT_ORDER].reverse()

interface ParsedInsert {
  table: string
  columns: string[]
  values: unknown[]
}

/**
 * Parse a comma-separated VALUES string into an array of JS values.
 * Handles: NULL, TRUE/FALSE, 'quoted strings' (with '' escaping),
 * '...'::jsonb (JSON objects), ISO date strings, and bare numbers.
 */
function parseValuesList(valuesStr: string): unknown[] {
  const results: unknown[] = []
  let i = 0
  const len = valuesStr.length

  while (i < len) {
    // Skip leading whitespace
    while (i < len && /\s/.test(valuesStr[i])) i++
    if (i >= len) break

    if (valuesStr[i] === "'") {
      // Quoted string — parse until closing unescaped single quote
      i++ // skip opening quote
      let str = ''
      while (i < len) {
        if (valuesStr[i] === "'" && valuesStr[i + 1] === "'") {
          // Escaped single quote
          str += "'"
          i += 2
        } else if (valuesStr[i] === "'") {
          i++ // skip closing quote
          break
        } else {
          str += valuesStr[i]
          i++
        }
      }

      // Check for ::jsonb cast
      const castMatch = valuesStr.slice(i).match(/^\s*::jsonb/)
      if (castMatch) {
        i += castMatch[0].length
        try {
          results.push(JSON.parse(str))
        } catch {
          results.push(str)
        }
      } else if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
        // ISO date string
        results.push(new Date(str))
      } else {
        results.push(str)
      }
    } else {
      // Bare token (NULL, TRUE, FALSE, or a number)
      let token = ''
      while (i < len && valuesStr[i] !== ',') {
        token += valuesStr[i]
        i++
      }
      token = token.trim()

      if (token.toUpperCase() === 'NULL') {
        results.push(null)
      } else if (token.toUpperCase() === 'TRUE') {
        results.push(true)
      } else if (token.toUpperCase() === 'FALSE') {
        results.push(false)
      } else {
        results.push(Number(token))
      }
    }

    // Skip whitespace and comma separator
    while (i < len && /\s/.test(valuesStr[i])) i++
    if (i < len && valuesStr[i] === ',') i++
  }

  return results
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

        if (WHITELIST.has(table)) {
          // Reject multi-row INSERT (multiple VALUES clauses)
          if (/\)\s*,\s*\(/.test(currentStatement)) {
            logger.warn(`Multi-row INSERT for table ${table} skipped — not supported`, { module: 'ImportDatabaseAPI' })
            currentStatement = ''
            continue
          }

          // Extract columns
          const colMatch = currentStatement.match(/\(([^)]+)\)\s+VALUES\s+\(/i)
          if (!colMatch) {
            currentStatement = ''
            continue
          }
          const columns = colMatch[1].split(',').map((c) => c.trim())

          // Extract values string: content between VALUES ( and final )
          // Find the start of the values portion
          const valuesStartIdx = currentStatement.search(/VALUES\s+\(/i)
          if (valuesStartIdx === -1) {
            currentStatement = ''
            continue
          }
          const afterValues = currentStatement.slice(valuesStartIdx)
          const parenOpen = afterValues.indexOf('(')
          if (parenOpen === -1) {
            currentStatement = ''
            continue
          }

          // Find the matching closing paren (accounting for nested parens in strings)
          const valuesContent = afterValues.slice(parenOpen + 1)
          let depth = 1
          let j = 0
          let inString = false
          for (; j < valuesContent.length && depth > 0; j++) {
            const ch = valuesContent[j]
            if (inString) {
              if (ch === "'" && valuesContent[j + 1] === "'") {
                j++ // skip escaped quote
              } else if (ch === "'") {
                inString = false
              }
            } else {
              if (ch === "'") inString = true
              else if (ch === '(') depth++
              else if (ch === ')') depth--
            }
          }
          const valuesStr = valuesContent.slice(0, j - 1)

          const values = parseValuesList(valuesStr)

          inserts.push({ table, columns, values })
        }
      }

      currentStatement = ''
    }
  }

  return inserts
}

export async function POST(request: NextRequest): Promise<Response> {
  return withPermission(request, 'database', 'create', async (auth) => {
    try {
      const tenantId = TENANT_ID

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
      const errors: string[] = []

      // Alles in einer Transaktion ausführen
      await db.transaction(async (tx) => {
        if (mode === 'replace') {
          // Bei Replace-Modus: bestehende Daten löschen
          // Tabellen ohne tenant_id (referenziert ueber Parent)
          const noTenantTables = new Set(['tenants', 'role_permissions', 'chat_messages', 'cockpit_credentials', 'feedback_responses', 'din_requirements', 'din_grants', 'wiba_requirements', 'cms_block_type_definitions'])
          for (const table of DELETE_ORDER) {
            try {
              if (table === 'tenants') continue
              if (noTenantTables.has(table)) continue // Globale/Join-Tabellen nicht loeschen
              // Parameterized DELETE — safe against SQL injection
              await tx.execute(
                sql`DELETE FROM ${sql.identifier(table)} WHERE tenant_id = ${tenantId}`
              )
            } catch {
              // Tabelle existiert evtl. nicht
            }
          }
        }

        // INSERT-Statements nach Tabellenreihenfolge sortieren
        const sortedInserts = [...inserts].sort((a, b) => {
          const ai = IMPORT_ORDER.indexOf(a.table)
          const bi = IMPORT_ORDER.indexOf(b.table)
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
        })

        for (const insert of sortedInserts) {
          try {
            // Enforce tenant isolation: overwrite tenant_id with the authenticated tenant
            const tenantIdIdx = insert.columns.indexOf('tenant_id')
            if (tenantIdIdx !== -1) {
              insert.values[tenantIdIdx] = tenantId
            }

            const columnsSql = sql.join(
              insert.columns.map((c) => sql.identifier(c)),
              sql`, `
            )
            const valuesSql = sql.join(
              insert.values.map((v) => sql`${v}`),
              sql`, `
            )
            const conflictClause = mode === 'merge' ? sql` ON CONFLICT DO NOTHING` : sql``

            await tx.execute(
              sql`INSERT INTO ${sql.identifier(insert.table)} (${columnsSql}) VALUES (${valuesSql})${conflictClause}`
            )

            stats[insert.table] = (stats[insert.table] || 0) + 1
            totalInserted++
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            errors.push(`${insert.table}: ${msg}`)
            if (mode === 'replace') {
              throw new Error(`Import abgebrochen bei Tabelle ${insert.table}: ${msg}`)
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
  })
}
