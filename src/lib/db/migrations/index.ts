/**
 * Migration Registry — zentrale Liste aller DB-Migrationen.
 *
 * Neue Migration hinzufuegen:
 * 1. SQL-Datei in src/lib/db/migrations/ anlegen (z.B. 002_feature_x.sql)
 * 2. Hier als Eintrag registrieren
 * 3. Bei naechstem App-Start wird sie automatisch ausgefuehrt
 *
 * Regeln:
 * - Jede Migration muss idempotent sein (IF NOT EXISTS, IF NOT EXISTS)
 * - Reihenfolge bestimmt Ausfuehrungsreihenfolge
 * - Einmal ausgefuehrt, nie wieder (Tracking via _migrations Tabelle)
 */

export interface Migration {
  /** Eindeutiger Name — identisch mit Dateiname */
  name: string
  /** Kurzbeschreibung fuer Logs */
  description: string
}

export const MIGRATIONS: Migration[] = [
  {
    name: '001_framework_v2.sql',
    description: 'Deliverable-Module, Deliverables, Execution Logs + SOP-Erweiterungen',
  },
  {
    name: '002_tenant_consolidation.sql',
    description: 'Tenant-Konsolidierung: default -> xkmu (Option B: CRM-Seed verwerfen)',
  },
  {
    name: '003_drop_tenant_id.sql',
    description: 'IRREVERSIBEL: DROP tenant_id aus 67 Tabellen, FKs + Indexes entfernt',
  },
  {
    name: '004_rename_tenants_to_organization.sql',
    description: 'Tabelle tenants → organization inkl. Indexes und Constraints',
  },
  {
    name: '005_custom_ai_prompts.sql',
    description: 'Neue Tabelle custom_ai_prompts für user-defined KI-Prompts',
  },
  {
    name: '006_email_account_signature.sql',
    description: 'email_accounts.signature — HTML-Signatur pro Account',
  },
  {
    name: '007_blog_categories.sql',
    description: 'Neue Tabelle blog_categories für verwaltbare Blog-Kategorien',
  },
  {
    name: '008_portal_users.sql',
    description: 'users.companyId + Invite-Flow Felder + Rolle portal_user',
  },
  {
    name: '009_audit_logs.sql',
    description: 'Revisionssichere Audit-Trail (audit_logs + Indexe)',
  },
  {
    name: '010_company_change_requests.sql',
    description: 'Portal P2: Firmendaten-Antrags-Workflow (company_change_requests + Indexe)',
  },
  {
    name: '011_orders.sql',
    description: 'Portal P4: orders + order_categories + Default-Kategorien (Seed)',
  },
  {
    name: '012_chat_messages.sql',
    description: 'Portal P5: chat_messages für Kunden-Admin-Chat (eine Thread pro Firma)',
  },
  {
    name: '013_portal_documents.sql',
    description: 'Portal P6 — portal_documents + portal_document_categories + seed',
  },
  {
    name: '014_persons_portal_user.sql',
    description: 'persons.portal_user_id nullable FK + Backfill per (email, companyId)-Match',
  },
  {
    name: '015_workflow_schedule.sql',
    description: 'workflows.schedule jsonb column for scheduled triggers (interval + dailyAt)',
  },
  {
    name: '016_courses.sql',
    description: 'Onlinekurse: courses, modules, lessons, assets',
  },
  {
    name: '017_course_lesson_blocks.sql',
    description: 'Onlinekurse Sub-3 prep: lesson content blocks (markdown + cms-block refs) + 6 course block types',
  },
]
