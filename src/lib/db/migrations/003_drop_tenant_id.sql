-- ============================================================
-- Migration 003: DROP tenant_id from all 67 tables
-- IRREVERSIBEL — Single-Tenant-Umbau abschliessen
--
-- Reihenfolge: 1) FK-Constraints droppen  2) Indexes droppen  3) Spalten droppen
-- Idempotent: IF EXISTS auf allen Statements
-- ============================================================

-- ============================================================
-- 1. FK-Constraints zu tenants-Tabelle entfernen
-- ============================================================
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_tenant_id_tenants_id_fk;
ALTER TABLE ai_logs DROP CONSTRAINT IF EXISTS ai_logs_tenant_id_tenants_id_fk;
ALTER TABLE ai_prompt_templates DROP CONSTRAINT IF EXISTS ai_prompt_templates_tenant_id_tenants_id_fk;
ALTER TABLE ai_providers DROP CONSTRAINT IF EXISTS ai_providers_tenant_id_tenants_id_fk;
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_tenant_id_tenants_id_fk;
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_tenant_id_tenants_id_fk;
ALTER TABLE business_documents DROP CONSTRAINT IF EXISTS business_documents_tenant_id_tenants_id_fk;
ALTER TABLE business_profiles DROP CONSTRAINT IF EXISTS business_profiles_tenant_id_tenants_id_fk;
ALTER TABLE chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_tenant_id_tenants_id_fk;
ALTER TABLE cockpit_systems DROP CONSTRAINT IF EXISTS cockpit_systems_tenant_id_tenants_id_fk;
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_tenant_id_tenants_id_fk;
ALTER TABLE company_researches DROP CONSTRAINT IF EXISTS company_researches_tenant_id_tenants_id_fk;
ALTER TABLE contract_clauses DROP CONSTRAINT IF EXISTS contract_clauses_tenant_id_tenants_id_fk;
ALTER TABLE contract_templates DROP CONSTRAINT IF EXISTS contract_templates_tenant_id_tenants_id_fk;
ALTER TABLE deliverable_modules DROP CONSTRAINT IF EXISTS deliverable_modules_tenant_id_tenants_id_fk;
ALTER TABLE deliverables DROP CONSTRAINT IF EXISTS deliverables_tenant_id_tenants_id_fk;
ALTER TABLE din_answers DROP CONSTRAINT IF EXISTS din_answers_tenant_id_tenants_id_fk;
ALTER TABLE din_audit_sessions DROP CONSTRAINT IF EXISTS din_audit_sessions_tenant_id_tenants_id_fk;
ALTER TABLE document_items DROP CONSTRAINT IF EXISTS document_items_tenant_id_tenants_id_fk;
ALTER TABLE document_templates DROP CONSTRAINT IF EXISTS document_templates_tenant_id_tenants_id_fk;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_tenant_id_tenants_id_fk;
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_tenant_id_tenants_id_fk;
ALTER TABLE eos_issues DROP CONSTRAINT IF EXISTS eos_issues_tenant_id_tenants_id_fk;
ALTER TABLE execution_logs DROP CONSTRAINT IF EXISTS execution_logs_tenant_id_tenants_id_fk;
ALTER TABLE feedback_forms DROP CONSTRAINT IF EXISTS feedback_forms_tenant_id_tenants_id_fk;
ALTER TABLE firecrawl_researches DROP CONSTRAINT IF EXISTS firecrawl_researches_tenant_id_tenants_id_fk;
ALTER TABLE generated_images DROP CONSTRAINT IF EXISTS generated_images_tenant_id_tenants_id_fk;
ALTER TABLE grundschutz_answers DROP CONSTRAINT IF EXISTS grundschutz_answers_tenant_id_tenants_id_fk;
ALTER TABLE grundschutz_asset_controls DROP CONSTRAINT IF EXISTS grundschutz_asset_controls_tenant_id_tenants_id_fk;
ALTER TABLE grundschutz_asset_relations DROP CONSTRAINT IF EXISTS grundschutz_asset_relations_tenant_id_tenants_id_fk;
ALTER TABLE grundschutz_assets DROP CONSTRAINT IF EXISTS grundschutz_assets_tenant_id_tenants_id_fk;
ALTER TABLE grundschutz_audit_sessions DROP CONSTRAINT IF EXISTS grundschutz_audit_sessions_tenant_id_tenants_id_fk;
ALTER TABLE ideas DROP CONSTRAINT IF EXISTS ideas_tenant_id_tenants_id_fk;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_tenant_id_tenants_id_fk;
ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_tenant_id_tenants_id_fk;
ALTER TABLE marketing_tasks DROP CONSTRAINT IF EXISTS marketing_tasks_tenant_id_tenants_id_fk;
ALTER TABLE marketing_templates DROP CONSTRAINT IF EXISTS marketing_templates_tenant_id_tenants_id_fk;
ALTER TABLE media_uploads DROP CONSTRAINT IF EXISTS media_uploads_tenant_id_tenants_id_fk;
ALTER TABLE meeting_sessions DROP CONSTRAINT IF EXISTS meeting_sessions_tenant_id_tenants_id_fk;
ALTER TABLE n8n_connections DROP CONSTRAINT IF EXISTS n8n_connections_tenant_id_tenants_id_fk;
ALTER TABLE n8n_workflow_logs DROP CONSTRAINT IF EXISTS n8n_workflow_logs_tenant_id_tenants_id_fk;
ALTER TABLE newsletter_campaigns DROP CONSTRAINT IF EXISTS newsletter_campaigns_tenant_id_tenants_id_fk;
ALTER TABLE newsletter_subscribers DROP CONSTRAINT IF EXISTS newsletter_subscribers_tenant_id_tenants_id_fk;
ALTER TABLE okr_cycles DROP CONSTRAINT IF EXISTS okr_cycles_tenant_id_tenants_id_fk;
ALTER TABLE okr_objectives DROP CONSTRAINT IF EXISTS okr_objectives_tenant_id_tenants_id_fk;
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_tenant_id_tenants_id_fk;
ALTER TABLE persons DROP CONSTRAINT IF EXISTS persons_tenant_id_tenants_id_fk;
ALTER TABLE process_tasks DROP CONSTRAINT IF EXISTS process_tasks_tenant_id_tenants_id_fk;
ALTER TABLE processes DROP CONSTRAINT IF EXISTS processes_tenant_id_tenants_id_fk;
ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_tenant_id_tenants_id_fk;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tenant_id_tenants_id_fk;
ALTER TABLE project_tasks DROP CONSTRAINT IF EXISTS project_tasks_tenant_id_tenants_id_fk;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_tenant_id_tenants_id_fk;
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_tenant_id_tenants_id_fk;
ALTER TABLE rocks DROP CONSTRAINT IF EXISTS rocks_tenant_id_tenants_id_fk;
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_tenant_id_tenants_id_fk;
ALTER TABLE scorecard_metrics DROP CONSTRAINT IF EXISTS scorecard_metrics_tenant_id_tenants_id_fk;
ALTER TABLE social_media_posts DROP CONSTRAINT IF EXISTS social_media_posts_tenant_id_tenants_id_fk;
ALTER TABLE social_media_topics DROP CONSTRAINT IF EXISTS social_media_topics_tenant_id_tenants_id_fk;
ALTER TABLE sop_documents DROP CONSTRAINT IF EXISTS sop_documents_tenant_id_tenants_id_fk;
ALTER TABLE task_queue DROP CONSTRAINT IF EXISTS task_queue_tenant_id_tenants_id_fk;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_tenant_id_tenants_id_fk;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_id_tenants_id_fk;
ALTER TABLE vto DROP CONSTRAINT IF EXISTS vto_tenant_id_tenants_id_fk;
ALTER TABLE webhooks DROP CONSTRAINT IF EXISTS webhooks_tenant_id_tenants_id_fk;
ALTER TABLE wiba_answers DROP CONSTRAINT IF EXISTS wiba_answers_tenant_id_tenants_id_fk;
ALTER TABLE wiba_audit_sessions DROP CONSTRAINT IF EXISTS wiba_audit_sessions_tenant_id_tenants_id_fk;

-- ============================================================
-- 2. Indexes mit tenant_id entfernen (nur reine tenant-Indexes)
-- Composite-Indexes werden durch DROP COLUMN automatisch entfernt
-- ============================================================
DROP INDEX IF EXISTS idx_activities_tenant_id;
DROP INDEX IF EXISTS idx_ai_logs_tenant_id;
DROP INDEX IF EXISTS idx_ai_providers_tenant_id;
DROP INDEX IF EXISTS idx_api_keys_tenant_id;
DROP INDEX IF EXISTS idx_audit_log_tenant_id;
DROP INDEX IF EXISTS idx_business_documents_tenant;
DROP INDEX IF EXISTS idx_business_profiles_tenant;
DROP INDEX IF EXISTS idx_cockpit_systems_tenant;
DROP INDEX IF EXISTS idx_companies_tenant_id;
DROP INDEX IF EXISTS idx_company_researches_tenant;
DROP INDEX IF EXISTS idx_contract_clauses_tenant;
DROP INDEX IF EXISTS idx_contract_templates_tenant;
DROP INDEX IF EXISTS idx_deliverable_modules_tenant;
DROP INDEX IF EXISTS idx_deliverables_tenant;
DROP INDEX IF EXISTS idx_din_audit_sessions_tenant;
DROP INDEX IF EXISTS idx_document_templates_tenant;
DROP INDEX IF EXISTS idx_email_templates_tenant;
DROP INDEX IF EXISTS idx_execution_logs_tenant;
DROP INDEX IF EXISTS idx_feedback_forms_tenant;
DROP INDEX IF EXISTS idx_firecrawl_researches_tenant;
DROP INDEX IF EXISTS idx_generated_images_tenant;
DROP INDEX IF EXISTS idx_grundschutz_sessions_tenant;
DROP INDEX IF EXISTS idx_gs_assets_tenant;
DROP INDEX IF EXISTS idx_ideas_tenant_id;
DROP INDEX IF EXISTS idx_leads_tenant_id;
DROP INDEX IF EXISTS idx_marketing_campaigns_tenant;
DROP INDEX IF EXISTS idx_marketing_tasks_tenant;
DROP INDEX IF EXISTS idx_marketing_templates_tenant;
DROP INDEX IF EXISTS idx_media_uploads_tenant;
DROP INDEX IF EXISTS idx_n8n_connections_tenant_id;
DROP INDEX IF EXISTS idx_n8n_workflow_logs_tenant_id;
DROP INDEX IF EXISTS idx_newsletter_campaigns_tenant;
DROP INDEX IF EXISTS idx_newsletter_subs_tenant;
DROP INDEX IF EXISTS idx_opportunities_tenant;

-- ============================================================
-- 3. tenant_id Spalte aus allen 67 Tabellen entfernen
-- CASCADE entfernt automatisch verbleibende Composite-Indexes
-- ============================================================
ALTER TABLE activities DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE ai_logs DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE ai_prompt_templates DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE ai_providers DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE api_keys DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE audit_log DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE business_documents DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE chat_conversations DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cockpit_systems DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE company_researches DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE contract_clauses DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE contract_templates DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE deliverable_modules DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE deliverables DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE din_answers DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE din_audit_sessions DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE document_items DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE document_templates DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE documents DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE email_templates DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE eos_issues DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE feedback_forms DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE firecrawl_researches DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE generated_images DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE grundschutz_answers DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE grundschutz_asset_controls DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE grundschutz_asset_relations DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE grundschutz_assets DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE grundschutz_audit_sessions DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE ideas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE leads DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE marketing_campaigns DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE marketing_tasks DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE marketing_templates DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE media_uploads DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE meeting_sessions DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE n8n_connections DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE n8n_workflow_logs DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE newsletter_campaigns DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE newsletter_subscribers DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE okr_cycles DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE okr_objectives DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE opportunities DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE persons DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE process_tasks DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE processes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE product_categories DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE products DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE project_tasks DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE projects DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE receipts DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE rocks DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE roles DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE scorecard_metrics DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE social_media_posts DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE social_media_topics DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE sop_documents DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE task_queue DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE time_entries DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE vto DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE webhooks DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE wiba_answers DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE wiba_audit_sessions DROP COLUMN IF EXISTS tenant_id CASCADE;
