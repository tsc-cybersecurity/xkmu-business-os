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
]
