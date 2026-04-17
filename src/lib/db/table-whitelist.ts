/**
 * Dynamic table whitelist — alle Tabellen aus information_schema zulassen.
 *
 * Die App laeuft als Single-Organization-Instanz. Eine hardcoded Tabellen-
 * Whitelist ist nicht mehr noetig — jede existierende Tabelle in `public`
 * darf vom Admin eingesehen werden.
 *
 * Die DATA_TABLES/GLOBAL_TABLES-Klassifikation bleibt vorerst fuer
 * Export/Import, wird aber nur noch als Referenz genutzt — nicht mehr
 * als Sicherheitsgrenze.
 */
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// ============================================================
// Dynamic whitelist: alle Public-Tabellen
// ============================================================

let _tableCache: Set<string> | null = null
let _tableCacheExpiry = 0
const CACHE_TTL_MS = 60_000 // 1 Minute

/**
 * Gibt alle Tabellen in schema `public` zurueck. Ergebnis ist gecached
 * fuer 1 Minute um DB-Queries bei haeufigen Admin-Zugriffen zu reduzieren.
 */
export async function getAllTables(): Promise<Set<string>> {
  if (_tableCache && Date.now() < _tableCacheExpiry) {
    return _tableCache
  }
  const rows = await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `) as unknown as { table_name: string }[]
  _tableCache = new Set(rows.map((r) => r.table_name))
  _tableCacheExpiry = Date.now() + CACHE_TTL_MS
  return _tableCache
}

/** Prueft ob eine Tabelle existiert (via Cache). */
export async function isValidTable(tableName: string): Promise<boolean> {
  const all = await getAllTables()
  return all.has(tableName)
}

/** Cache invalidieren (nach DDL-Aenderungen). */
export function invalidateTableCache() {
  _tableCache = null
  _tableCacheExpiry = 0
}

// ============================================================
// Legacy: statische Klassifikation (wird in spaeteren Phasen entfernt)
// ============================================================

// Data tables — contain organization-specific rows (used for Import/Export workflows)
// Legacy name; all tables listed here just carry organization data now.
export const TENANT_TABLES = [
  'roles',
  'users',
  'api_keys',
  'companies',
  'persons',
  'leads',
  'opportunities',
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
  'document_templates',
  'email_templates',
  'din_audit_sessions',
  'din_answers',
  'wiba_audit_sessions',
  'wiba_answers',
  'n8n_connections',
  'n8n_workflow_logs',
  'media_uploads',
  'generated_images',
  'company_researches',
  'firecrawl_researches',
  'business_documents',
  'business_profiles',
  'marketing_campaigns',
  'marketing_tasks',
  'marketing_templates',
  'social_media_topics',
  'social_media_posts',
  'newsletter_subscribers',
  'newsletter_campaigns',
  'feedback_forms',
  'processes',
  'process_tasks',
  'projects',
  'project_tasks',
  'time_entries',
  'task_queue',
  'receipts',
  'chat_conversations',
  'cockpit_systems',
  'grundschutz_audit_sessions',
  'grundschutz_answers',
  'contract_templates',
  'contract_clauses',
  'deliverable_modules',
  'deliverables',
  'execution_logs',
  'vto',
  'rocks',
  'scorecard_metrics',
  'eos_issues',
  'meeting_sessions',
  'okr_cycles',
  'okr_objectives',
  'sop_documents',
  'grundschutz_assets',
]

// Join/child tables that reference a parent (exported via JOIN)
export const JOIN_TABLES: Array<{
  table: string
  parentTable: string
  foreignKey: string
  parentForeignKey: string
}> = [
  { table: 'role_permissions', parentTable: 'roles', foreignKey: 'role_id', parentForeignKey: 'id' },
  { table: 'chat_messages', parentTable: 'chat_conversations', foreignKey: 'conversation_id', parentForeignKey: 'id' },
  { table: 'cockpit_credentials', parentTable: 'cockpit_systems', foreignKey: 'system_id', parentForeignKey: 'id' },
  { table: 'feedback_responses', parentTable: 'feedback_forms', foreignKey: 'form_id', parentForeignKey: 'id' },
  { table: 'rock_milestones', parentTable: 'rocks', foreignKey: 'rock_id', parentForeignKey: 'id' },
  { table: 'scorecard_entries', parentTable: 'scorecard_metrics', foreignKey: 'metric_id', parentForeignKey: 'id' },
  { table: 'okr_key_results', parentTable: 'okr_objectives', foreignKey: 'objective_id', parentForeignKey: 'id' },
  { table: 'okr_checkins', parentTable: 'okr_key_results', foreignKey: 'key_result_id', parentForeignKey: 'id' },
  { table: 'sop_steps', parentTable: 'sop_documents', foreignKey: 'sop_id', parentForeignKey: 'id' },
  { table: 'sop_versions', parentTable: 'sop_documents', foreignKey: 'sop_id', parentForeignKey: 'id' },
  { table: 'grundschutz_asset_controls', parentTable: 'grundschutz_assets', foreignKey: 'asset_id', parentForeignKey: 'id' },
  { table: 'grundschutz_asset_relations', parentTable: 'grundschutz_assets', foreignKey: 'source_asset_id', parentForeignKey: 'id' },
  { table: 'grundschutz_control_links', parentTable: 'grundschutz_assets', foreignKey: 'asset_id', parentForeignKey: 'id' },
]

// Legacy bucket — unused now
export const GLOBAL_WITH_TENANT_ID = new Set<string>([])

// Global reference tables (exported completely)
export const GLOBAL_TABLES = [
  'cms_pages',
  'cms_blocks',
  'cms_block_templates',
  'cms_navigation_items',
  'cms_settings',
  'cms_block_type_definitions',
  'blog_posts',
  'email_accounts',
  'emails',
  'workflows',
  'workflow_runs',
  'din_requirements',
  'din_grants',
  'wiba_requirements',
  'grundschutz_groups',
  'grundschutz_controls',
  'grundschutz_catalog_meta',
  'ir_scenarios',
  'ir_detection_indicators',
  'ir_actions',
  'ir_escalation_levels',
  'ir_escalation_recipients',
  'ir_recovery_steps',
  'ir_checklist_items',
  'ir_lessons_learned',
  'ir_references',
  'cron_jobs',
  '_migrations',
]

// Legacy: ALLOWED_TABLES bleibt fuer Abwaertskompatibilitaet, wird aber
// durch die dynamische Pruefung (isValidTable) in den Routen ersetzt.
export const ALLOWED_TABLES = new Set([
  'organization',
  ...TENANT_TABLES,
  ...JOIN_TABLES.map((j) => j.table),
  ...GLOBAL_TABLES,
])

// Tables that only owners can modify (safety net)
export const OWNER_ONLY_TABLES = new Set([
  'organization',
  '_migrations',
  ...JOIN_TABLES.map((j) => j.table),
  ...GLOBAL_TABLES,
])

export const TENANT_TABLES_SET = new Set(TENANT_TABLES)
