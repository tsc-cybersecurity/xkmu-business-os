/**
 * Shared table whitelist for admin database operations and exports.
 * Single source of truth - used by both admin/database routes and export route.
 */

// Tables that have a tenant_id column (filtered by tenant)
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
  'cms_pages',
  'cms_blocks',
  'cms_block_templates',
  'cms_navigation_items',
  'blog_posts',
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
]

// Tables without tenant_id that reference a tenant-scoped parent (exported via JOIN)
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
]

// Tables with tenant_id column but globally accessible (no tenant filter in queries)
// These were made global so all users (e.g. Designer role) can access them
export const GLOBAL_WITH_TENANT_ID = new Set([
  'cms_pages',
  'cms_blocks',
  'cms_block_templates',
  'cms_navigation_items',
  'blog_posts',
])

// Global tables (no tenant_id column at all, exported completely)
export const GLOBAL_TABLES = [
  'din_requirements',
  'din_grants',
  'wiba_requirements',
  'cms_block_type_definitions',
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
]

// All allowed tables (union of tenant + global + join)
export const ALLOWED_TABLES = new Set([
  'tenants',
  ...TENANT_TABLES,
  ...JOIN_TABLES.map((j) => j.table),
  ...GLOBAL_TABLES,
])

// Tables that only owners can modify (no tenant_id)
export const OWNER_ONLY_TABLES = new Set([
  'tenants',
  ...JOIN_TABLES.map((j) => j.table),
  ...GLOBAL_TABLES,
])

// Set version for quick lookups
export const TENANT_TABLES_SET = new Set(TENANT_TABLES)
