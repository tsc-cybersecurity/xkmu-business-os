import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError, parsePaginationParams } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

type Row = Record<string, unknown>

// Whitelist of allowed table names (all pgTable names from schema.ts)
const ALLOWED_TABLES = new Set([
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
  'documents',
  'document_items',
  'din_requirements',
  'din_audit_sessions',
  'din_answers',
  'din_grants',
  'wiba_requirements',
  'wiba_audit_sessions',
  'wiba_answers',
  'n8n_connections',
  'n8n_workflow_logs',
  'cms_pages',
  'cms_blocks',
  'cms_block_templates',
  'cms_navigation_items',
  'cms_block_type_definitions',
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
])

// Tables that have a tenant_id column
// Excluded: tenants, role_permissions, din_requirements, din_grants, wiba_requirements, cms_block_type_definitions (no tenant_id)
const TENANT_TABLES = new Set([
  'users',
  'roles',
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
])

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

    if (!ALLOWED_TABLES.has(tableName)) {
      return apiError('INVALID_TABLE', `Tabelle "${tableName}" ist nicht erlaubt`, 400)
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

      // Build query with tenant filter if applicable
      const hasTenantId = TENANT_TABLES.has(tableName)
      const tableIdent = sql.identifier(tableName)

      let countRows: Row[]
      let dataRows: Row[]

      if (hasTenantId) {
        countRows = toRows(await db.execute(sql`
          SELECT COUNT(*) as total FROM ${tableIdent} WHERE tenant_id = ${auth.tenantId}
        `))
        dataRows = toRows(await db.execute(sql`
          SELECT * FROM ${tableIdent} WHERE tenant_id = ${auth.tenantId}
          LIMIT ${limit} OFFSET ${offset}
        `))
      } else {
        countRows = toRows(await db.execute(sql`
          SELECT COUNT(*) as total FROM ${tableIdent}
        `))
        dataRows = toRows(await db.execute(sql`
          SELECT * FROM ${tableIdent}
          LIMIT ${limit} OFFSET ${offset}
        `))
      }

      const total = Number(countRows[0]?.total ?? 0)
      const totalPages = Math.ceil(total / (limit ?? 20))

      return apiSuccess(
        { columns, rows: dataRows, hasTenantId },
        { page: page ?? 1, limit: limit ?? 20, total, totalPages }
      )
    } catch (error) {
      console.error(`Database table read error (${tableName}):`, error)
      return apiServerError('Fehler beim Laden der Tabellendaten')
    }
  })
}

// PUT /api/v1/admin/database/tables/[tableName] - Update a row
export async function PUT(request: NextRequest, context: RouteContext) {
  return withPermission(request, 'database', 'update', async (auth) => {
    const { tableName } = await context.params

    if (!ALLOWED_TABLES.has(tableName)) {
      return apiError('INVALID_TABLE', `Tabelle "${tableName}" ist nicht erlaubt`, 400)
    }

    // Global tables can only be modified by owners
    if (GLOBAL_TABLES.has(tableName) && auth.role !== 'owner') {
      return apiError('FORBIDDEN', 'Nur Owner duerfen globale Tabellen aendern', 403)
    }

    try {
      const body = await request.json()
      const { id, ...updates } = body

      if (!id) {
        return apiError('MISSING_ID', 'ID ist erforderlich', 400)
      }

      // Prevent changing tenant_id
      delete updates.tenant_id
      delete updates.tenantId

      // Get allowed column names for this table
      const colRows = toRows(await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
      `))
      const allowedColumns = new Set(colRows.map((r) => r.column_name as string))

      // Filter to only valid columns
      const validUpdates = Object.entries(updates).filter(([key]) => allowedColumns.has(key))
      if (validUpdates.length === 0) {
        return apiError('NO_VALID_COLUMNS', 'Keine gueltigen Spalten zum Aktualisieren', 400)
      }

      // Verify tenant ownership if applicable
      const hasTenantId = TENANT_TABLES.has(tableName)
      const tableIdent = sql.identifier(tableName)

      if (hasTenantId) {
        const existing = toRows(await db.execute(sql`
          SELECT tenant_id FROM ${tableIdent} WHERE id = ${id}
        `))
        if (existing.length === 0) {
          return apiError('NOT_FOUND', 'Datensatz nicht gefunden', 404)
        }
        if (existing[0].tenant_id !== auth.tenantId) {
          return apiError('FORBIDDEN', 'Kein Zugriff auf diesen Datensatz', 403)
        }
      }

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
      console.error(`Database table update error (${tableName}):`, error)
      return apiServerError('Fehler beim Aktualisieren des Datensatzes')
    }
  })
}

// Global tables (no tenant_id) - only owner can modify
const GLOBAL_TABLES = new Set([
  'tenants',
  'role_permissions',
  'din_requirements',
  'din_grants',
  'wiba_requirements',
  'cms_block_type_definitions',
])

// DELETE /api/v1/admin/database/tables/[tableName] - Delete a row
export async function DELETE(request: NextRequest, context: RouteContext) {
  return withPermission(request, 'database', 'delete', async (auth) => {
    const { tableName } = await context.params

    if (!ALLOWED_TABLES.has(tableName)) {
      return apiError('INVALID_TABLE', `Tabelle "${tableName}" ist nicht erlaubt`, 400)
    }

    // Global tables can only be modified by owners
    if (GLOBAL_TABLES.has(tableName) && auth.role !== 'owner') {
      return apiError('FORBIDDEN', 'Nur Owner duerfen globale Tabellen aendern', 403)
    }

    try {
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')

      if (!id) {
        return apiError('MISSING_ID', 'ID ist erforderlich', 400)
      }

      const hasTenantId = TENANT_TABLES.has(tableName)
      const tableIdent = sql.identifier(tableName)

      // Verify tenant ownership if applicable
      if (hasTenantId) {
        const existing = toRows(await db.execute(sql`
          SELECT tenant_id FROM ${tableIdent} WHERE id = ${id}
        `))
        if (existing.length === 0) {
          return apiError('NOT_FOUND', 'Datensatz nicht gefunden', 404)
        }
        if (existing[0].tenant_id !== auth.tenantId) {
          return apiError('FORBIDDEN', 'Kein Zugriff auf diesen Datensatz', 403)
        }
      }

      const result = toRows(await db.execute(sql`
        DELETE FROM ${tableIdent} WHERE id = ${id}
        RETURNING id
      `))

      if (result.length === 0) {
        return apiError('NOT_FOUND', 'Datensatz nicht gefunden', 404)
      }

      return apiSuccess({ deleted: true, id })
    } catch (error) {
      console.error(`Database table delete error (${tableName}):`, error)
      return apiServerError('Fehler beim Loeschen des Datensatzes')
    }
  })
}
