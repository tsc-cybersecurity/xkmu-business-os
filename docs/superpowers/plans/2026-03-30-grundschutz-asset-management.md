# Grundschutz++ IT-Asset-Management & Strukturmodellierung

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** IT-Assets (Server, Anwendungen, Netze, Raeume, Personen) pro Firma erfassen, Schutzbedarf festlegen, und Assets mit Grundschutz++ Controls verknuepfen — damit aus dem generischen Katalog ein firmenspezifisches Anforderungspaket wird.

**Architecture:** Neue `grundschutz_assets`-Tabelle mit hierarchischen Zielobjektkategorien (aus BSI CSV), Schutzbedarf (C/I/A), und Beziehungsgraph zwischen Assets. Neue `grundschutz_asset_controls`-Tabelle verknuepft Assets mit Controls aus dem bestehenden Katalog. Die bestehende `cockpit_systems`-Tabelle bleibt separat (IT-Betrieb), Assets sind fuer die Grundschutz-Modellierung. Eine Audit-Session wird um einen Scope (welche Assets) erweitert.

**Tech Stack:** Next.js App Router, Drizzle ORM, PostgreSQL, Zod, shadcn/ui

---

## Kontext: BSI Grundschutz++ Modellierung

Die BSI-Methodik (Praktik STM = Strukturmodellierung) verlangt:

1. **Informationsverbund definieren** — Scope/Geltungsbereich der Firma
2. **Assets erfassen** — alle IT-Systeme, Anwendungen, Netze, Raeume, Personen
3. **Zielobjektkategorien zuordnen** — jedes Asset bekommt eine BSI-Kategorie (z.B. "Hostsysteme", "Webanwendungen", "Serverraeume")
4. **Schutzbedarf festlegen** — Vertraulichkeit/Integritaet/Verfuegbarkeit je Asset (normal/hoch/sehr_hoch)
5. **Schutzbedarfsvererbung** — Geschaeftsprozess -> Anwendung -> IT-System -> Netz -> Raum (Maximumprinzip)
6. **Anforderungen zuordnen** — Controls aus dem Katalog auf Assets mappen basierend auf Kategorie + SecLevel

### Zielobjektkategorien (aus BSI CSV, 42 Eintraege)

Hierarchischer Baum mit UUID-Verweisen. Top-Level-Typen:
- **Organisatorisch**: Nutzende (Mitarbeitende, Admins, Fuehrungskraefte), Standorte (Gebaeude, Raeume, Serverraeume), Einkaeufe (IT-Produkte, Dienstleistungen, Cloud)
- **Technisch**: IT-Systeme (Hostsysteme, Endgeraete, Mobiltelefone, Fahrzeuge), Anwendungen (Web, E-Mail, Office, DNS, VK, ...), Netze (Interne Segmente, WLANs, Externe)
- **Informationen**: Informationen, Daten

---

## File Structure

### Neue Dateien

| Datei | Verantwortung |
|-------|---------------|
| `src/lib/db/schema.ts` (modify) | 3 neue Tabellen: `grundschutz_assets`, `grundschutz_asset_relations`, `grundschutz_asset_controls` |
| `src/lib/services/grundschutz-asset.service.ts` (create) | CRUD Assets, Schutzbedarf, Relationen, Control-Zuordnung |
| `src/app/api/v1/grundschutz/assets/route.ts` (create) | GET (list), POST (create) |
| `src/app/api/v1/grundschutz/assets/[id]/route.ts` (create) | GET, PUT, DELETE einzelnes Asset |
| `src/app/api/v1/grundschutz/assets/categories/route.ts` (create) | GET Zielobjektkategorien-Baum |
| `src/app/api/v1/grundschutz/assets/[id]/controls/route.ts` (create) | GET/POST Control-Zuordnungen |
| `src/app/intern/(dashboard)/cybersecurity/grundschutz/assets/page.tsx` (create) | Asset-Uebersicht pro Firma |
| `src/app/intern/(dashboard)/cybersecurity/grundschutz/assets/[id]/page.tsx` (create) | Asset-Detail mit Schutzbedarf + Controls |

### Bestehende Dateien (modify)

| Datei | Aenderung |
|-------|-----------|
| `src/lib/db/schema.ts` | Neue Tabellen + Relations + Indexes |
| `src/components/layout/sidebar.tsx` | Navigation: "Assets" unter Grundschutz++ |
| `src/app/intern/(dashboard)/cybersecurity/grundschutz/page.tsx` | Link zu Assets-Seite |
| `src/app/intern/(dashboard)/cybersecurity/grundschutz/audit/[id]/page.tsx` | Asset-Scope bei Audit anzeigen |

---

## Task 1: Datenbank-Schema (3 neue Tabellen)

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Tabelle `grundschutz_assets` hinzufuegen**

Nach dem Block `grundschutzAnswersRelations` (ca. Zeile 1180) einfuegen:

```typescript
// ============================================
// Grundschutz++ Asset Management (Strukturmodellierung)
// ============================================

export const grundschutzAssets = pgTable('grundschutz_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  // Asset-Identifikation
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  // BSI Zielobjektkategorie
  categoryType: varchar('category_type', { length: 50 }).notNull(), // Nutzende, IT-Systeme, Anwendungen, Netze, Standorte, Einkaeufe, Informationen
  categoryName: varchar('category_name', { length: 100 }).notNull(), // z.B. "Hostsysteme", "Webanwendungen", "Serverraeume"
  categoryUuid: varchar('category_uuid', { length: 40 }), // UUID aus BSI target_object_categories.csv
  // Schutzbedarf (C/I/A)
  vertraulichkeit: varchar('vertraulichkeit', { length: 20 }).default('normal'), // normal, hoch, sehr_hoch
  integritaet: varchar('integritaet', { length: 20 }).default('normal'),
  verfuegbarkeit: varchar('verfuegbarkeit', { length: 20 }).default('normal'),
  schutzbedarfBegruendung: text('schutzbedarf_begruendung'),
  // Verantwortlichkeit
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  // Betriebsinfos
  status: varchar('status', { length: 20 }).default('active'), // active, planned, decommissioned
  location: varchar('location', { length: 255 }), // Freitext oder Verweis auf Standort-Asset
  // Zusatzinfos
  tags: jsonb('tags').default([]),
  notes: text('notes'),
  customFields: jsonb('custom_fields').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_gs_assets_tenant').on(table.tenantId),
  index('idx_gs_assets_company').on(table.tenantId, table.companyId),
  index('idx_gs_assets_category').on(table.tenantId, table.categoryType),
  index('idx_gs_assets_status').on(table.tenantId, table.status),
])
```

- [ ] **Step 2: Tabelle `grundschutz_asset_relations` hinzufuegen**

```typescript
export const grundschutzAssetRelations_table = pgTable('grundschutz_asset_relations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  sourceAssetId: uuid('source_asset_id').notNull().references(() => grundschutzAssets.id, { onDelete: 'cascade' }),
  targetAssetId: uuid('target_asset_id').notNull().references(() => grundschutzAssets.id, { onDelete: 'cascade' }),
  relationType: varchar('relation_type', { length: 30 }).notNull(), // supports, runs_on, connected_to, housed_in, uses, managed_by
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_gs_asset_rel_source').on(table.sourceAssetId),
  index('idx_gs_asset_rel_target').on(table.targetAssetId),
])
```

- [ ] **Step 3: Tabelle `grundschutz_asset_controls` hinzufuegen**

```typescript
export const grundschutzAssetControls = pgTable('grundschutz_asset_controls', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  assetId: uuid('asset_id').notNull().references(() => grundschutzAssets.id, { onDelete: 'cascade' }),
  controlId: varchar('control_id', { length: 30 }).notNull(), // Verweis auf grundschutz_controls.id (z.B. "ASST.2.2")
  applicability: varchar('applicability', { length: 20 }).default('applicable'), // applicable, not_applicable
  justification: text('justification'), // Begruendung bei not_applicable
  implementationStatus: varchar('implementation_status', { length: 20 }).default('offen'), // offen, geplant, umgesetzt, teilweise, nicht_umgesetzt
  implementationNotes: text('implementation_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_gs_asset_ctrl_asset').on(table.assetId),
  index('idx_gs_asset_ctrl_control').on(table.controlId),
  index('idx_gs_asset_ctrl_tenant_company').on(table.tenantId),
])
```

- [ ] **Step 4: Drizzle Relations hinzufuegen**

```typescript
export const grundschutzAssetsRelations = relations(grundschutzAssets, ({ one, many }) => ({
  tenant: one(tenants, { fields: [grundschutzAssets.tenantId], references: [tenants.id] }),
  company: one(companies, { fields: [grundschutzAssets.companyId], references: [companies.id] }),
  owner: one(users, { fields: [grundschutzAssets.ownerId], references: [users.id] }),
  controlMappings: many(grundschutzAssetControls),
}))

export const grundschutzAssetControlsRelations = relations(grundschutzAssetControls, ({ one }) => ({
  asset: one(grundschutzAssets, { fields: [grundschutzAssetControls.assetId], references: [grundschutzAssets.id] }),
}))

export type GrundschutzAsset = typeof grundschutzAssets.$inferSelect
export type GrundschutzAssetRelation = typeof grundschutzAssetRelations_table.$inferSelect
export type GrundschutzAssetControl = typeof grundschutzAssetControls.$inferSelect
```

- [ ] **Step 5: Migration generieren**

```bash
npx drizzle-kit generate
```

Erwartung: Neue Migration mit CREATE TABLE fuer 3 Tabellen + Indexes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts drizzle/migrations/
git commit -m "feat: Grundschutz++ Asset-Management Schema (3 Tabellen)"
```

---

## Task 2: Zielobjektkategorien-API

**Files:**
- Create: `src/app/api/v1/grundschutz/assets/categories/route.ts`

Die BSI-Zielobjektkategorien werden statisch aus der CSV als Konstante bereitgestellt (42 Eintraege, aendern sich selten).

- [ ] **Step 1: Kategorien-Konstante und API-Route erstellen**

```typescript
import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'

// BSI Zielobjektkategorien aus target_object_categories.csv
// Hierarchie: parentUuid -> uuid
const ZIELOBJEKT_KATEGORIEN = [
  // --- Organisatorisch ---
  { uuid: '38125c38-8895-493c-ba73-77ac1029d02d', name: 'Nutzende', type: 'Nutzende', category: 'Organisatorisch', parentUuid: null },
  { uuid: '9d0465aa-a31f-465f-99c8-7a383322b2a4', name: 'Mitarbeitende', type: 'Nutzende', category: 'Organisatorisch', parentUuid: '38125c38-8895-493c-ba73-77ac1029d02d' },
  { uuid: '4779a07f-e7fd-4837-a920-7ab9254b0dd5', name: 'Fuehrungskraefte', type: 'Nutzende', category: 'Organisatorisch', parentUuid: '9d0465aa-a31f-465f-99c8-7a383322b2a4' },
  { uuid: 'd3343f0a-974f-43c5-b101-4522403422ce', name: 'Institutionsleitung', type: 'Nutzende', category: 'Organisatorisch', parentUuid: '4779a07f-e7fd-4837-a920-7ab9254b0dd5' },
  { uuid: 'efd76832-f5a1-432a-836d-c8d5c6d212cc', name: 'Administrierende', type: 'Nutzende', category: 'Organisatorisch', parentUuid: '9d0465aa-a31f-465f-99c8-7a383322b2a4' },
  { uuid: 'df3978e8-775d-4aa6-8be7-fd2a6f12315d', name: 'Standorte', type: 'Standorte', category: 'Organisatorisch', parentUuid: null },
  { uuid: '422401b2-2c71-4ea5-a71c-6f386ba16cfc', name: 'Gebaeude', type: 'Standorte', category: 'Organisatorisch', parentUuid: 'df3978e8-775d-4aa6-8be7-fd2a6f12315d' },
  { uuid: '09517106-2c2c-411e-a06c-65736363286f', name: 'Raeume', type: 'Standorte', category: 'Organisatorisch', parentUuid: 'df3978e8-775d-4aa6-8be7-fd2a6f12315d' },
  { uuid: '564530dd-29ce-4988-9192-3b4dbfef061c', name: 'Raeume fuer technische Infrastruktur', type: 'Standorte', category: 'Organisatorisch', parentUuid: '09517106-2c2c-411e-a06c-65736363286f' },
  { uuid: '3a894eaa-7b42-4f59-9961-76c9a3ec2837', name: 'Serverraeume', type: 'Standorte', category: 'Organisatorisch', parentUuid: '564530dd-29ce-4988-9192-3b4dbfef061c' },
  { uuid: 'dfd8e05b-a028-4403-9776-255b968cc4a6', name: 'Datentraegerarchiv', type: 'Standorte', category: 'Organisatorisch', parentUuid: '09517106-2c2c-411e-a06c-65736363286f' },
  { uuid: '5f59b23c-8d18-4d5f-ad96-c02ffad10daf', name: 'Einkaeufe', type: 'Einkaeufe', category: 'Organisatorisch', parentUuid: null },
  { uuid: '23ea0f81-17ed-4b31-be13-955b46b5a905', name: 'IT-Produkte', type: 'Einkaeufe', category: 'Technisch', parentUuid: '5f59b23c-8d18-4d5f-ad96-c02ffad10daf' },
  { uuid: '04d5e0fa-7b1a-48d5-b87c-1ee0060a4c2d', name: 'Dienstleistungen', type: 'Einkaeufe', category: 'Organisatorisch', parentUuid: '5f59b23c-8d18-4d5f-ad96-c02ffad10daf' },
  { uuid: 'ff3b07f0-1d19-44fb-ac2c-dea97010c5b8', name: 'Outsourcing', type: 'Einkaeufe', category: 'Organisatorisch', parentUuid: '04d5e0fa-7b1a-48d5-b87c-1ee0060a4c2d' },
  { uuid: 'd2a23b62-9c66-4f72-98e2-17518d5dbe0f', name: 'Cloud-Dienste', type: 'Einkaeufe', category: 'Technisch', parentUuid: 'ff3b07f0-1d19-44fb-ac2c-dea97010c5b8' },
  // --- Technisch: IT-Systeme ---
  { uuid: '427da6dd-d744-4b2b-88b7-f0a695f21e14', name: 'IT-Systeme', type: 'IT-Systeme', category: 'Technisch', parentUuid: null },
  { uuid: '19c946fc-e991-44ee-87c5-7bbe5d5aaf55', name: 'Hostsysteme', type: 'IT-Systeme', category: 'Technisch', parentUuid: '427da6dd-d744-4b2b-88b7-f0a695f21e14' },
  { uuid: '837781a4-7b47-4695-9545-a3310eac7a66', name: 'Endgeraete', type: 'IT-Systeme', category: 'Technisch', parentUuid: '427da6dd-d744-4b2b-88b7-f0a695f21e14' },
  { uuid: '9f9c827a-1933-46fd-a0c6-f990990745df', name: 'Mobiltelefone', type: 'IT-Systeme', category: 'Technisch', parentUuid: '837781a4-7b47-4695-9545-a3310eac7a66' },
  { uuid: '39147c55-a952-4c34-8e2e-b8ac02a2eae7', name: 'Fahrzeuge', type: 'IT-Systeme', category: 'Technisch', parentUuid: '837781a4-7b47-4695-9545-a3310eac7a66' },
  // --- Technisch: Anwendungen ---
  { uuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871', name: 'Anwendungen', type: 'Anwendungen', category: 'Technisch', parentUuid: null },
  { uuid: '36cb0d6b-2f90-43bc-b625-9870112cf847', name: 'Webanwendungen', type: 'Anwendungen', category: 'Technisch', parentUuid: 'b1411d0f-ffd1-45b7-837b-cd97ba4ed9e7' },
  { uuid: 'b1411d0f-ffd1-45b7-837b-cd97ba4ed9e7', name: 'Webserver', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: '7aa03e0c-a417-4b08-a6d5-b89bd63c6a83', name: 'E-Mail', type: 'Anwendungen', category: 'Technisch', parentUuid: '047aa523-6955-423d-924e-8376fb1d5722' },
  { uuid: '047aa523-6955-423d-924e-8376fb1d5722', name: 'Interpersonelle Kommunikation', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: 'b5f9e5ce-d90e-4da5-8ee7-32eae4829e55', name: 'Office-Anwendungen', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: 'f88fd07b-f918-45b5-80a5-59fcea43a99c', name: 'DNS-Server', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: 'eb65007a-2247-4346-a258-c242e066a10f', name: 'Dateiserver', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: '7a2b2665-c790-4395-9980-867c900be347', name: 'Verzeichnisdienste', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: '38167a3c-ee3e-4261-9c44-994c15a31d2c', name: 'Virtualisierungsloesungen', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: '67f74abf-162d-4e47-a24a-6ff53e9b124d', name: 'TK-Anwendungen', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: 'e0f11cba-1d72-4c30-a1e9-e33f794cdfb6', name: 'VK-Anwendungen', type: 'Anwendungen', category: 'Technisch', parentUuid: '67f74abf-162d-4e47-a24a-6ff53e9b124d' },
  { uuid: '05df1662-903f-41ff-ba88-0fbe86050550', name: 'Faxe', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: '8b64663c-8388-40bc-a68b-473e753ae4d0', name: 'Webbrowser', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  // --- Technisch: Netze ---
  { uuid: '1a4fb57d-1648-4111-979d-6a5f4f848620', name: 'Netze', type: 'Netze', category: 'Technisch', parentUuid: null },
  { uuid: '8ef347e7-ea3f-4624-b0f3-2af728443301', name: 'Interne Netzsegmente', type: 'Netze', category: 'Technisch', parentUuid: '1a4fb57d-1648-4111-979d-6a5f4f848620' },
  { uuid: '82a399a2-2fa7-4dd2-9850-89a7ee0505ea', name: 'WLANs', type: 'Netze', category: 'Technisch', parentUuid: '8ef347e7-ea3f-4624-b0f3-2af728443301' },
  { uuid: 'a9521914-ccf9-4c20-8eef-2dd912fb815d', name: 'Externe Netzanschluesse', type: 'Netze', category: 'Technisch', parentUuid: '1a4fb57d-1648-4111-979d-6a5f4f848620' },
  // --- Informationen ---
  { uuid: '5a5eceda-172c-4500-a19d-956dbb5de4a4', name: 'Informationen', type: 'Informationen', category: 'Informationen', parentUuid: null },
  { uuid: '69d48234-d4c2-463d-9b76-c3a1580edd85', name: 'Daten', type: 'Informationen', category: 'Informationen', parentUuid: '5a5eceda-172c-4500-a19d-956dbb5de4a4' },
] as const

export type ZielobjektKategorie = (typeof ZIELOBJEKT_KATEGORIEN)[number]

// Baum aufbauen fuer Frontend
function buildCategoryTree() {
  const rootItems = ZIELOBJEKT_KATEGORIEN.filter(k => !k.parentUuid)
  function getChildren(parentUuid: string): typeof ZIELOBJEKT_KATEGORIEN[number][] {
    return [...ZIELOBJEKT_KATEGORIEN.filter(k => k.parentUuid === parentUuid)]
  }
  function buildNode(item: typeof ZIELOBJEKT_KATEGORIEN[number]): unknown {
    const children = getChildren(item.uuid)
    return {
      ...item,
      children: children.map(buildNode),
    }
  }
  return rootItems.map(buildNode)
}

export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    return apiSuccess({
      flat: ZIELOBJEKT_KATEGORIEN,
      tree: buildCategoryTree(),
    })
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/grundschutz/assets/categories/route.ts
git commit -m "feat: Grundschutz++ Zielobjektkategorien-API (42 BSI-Kategorien)"
```

---

## Task 3: Asset-Service (CRUD + Schutzbedarf)

**Files:**
- Create: `src/lib/services/grundschutz-asset.service.ts`

- [ ] **Step 1: Service mit CRUD + Relationen erstellen**

```typescript
import { db } from '@/lib/db'
import {
  grundschutzAssets, grundschutzAssetRelations_table, grundschutzAssetControls,
  companies, users,
} from '@/lib/db/schema'
import type { GrundschutzAsset } from '@/lib/db/schema'
import { eq, and, asc, desc, count, ilike } from 'drizzle-orm'

export interface CreateAssetInput {
  companyId: string
  name: string
  description?: string
  categoryType: string
  categoryName: string
  categoryUuid?: string
  vertraulichkeit?: string
  integritaet?: string
  verfuegbarkeit?: string
  schutzbedarfBegruendung?: string
  ownerId?: string
  status?: string
  location?: string
  tags?: string[]
  notes?: string
}

export type UpdateAssetInput = Partial<CreateAssetInput>

export interface CreateAssetRelationInput {
  sourceAssetId: string
  targetAssetId: string
  relationType: string
  notes?: string
}

export interface AssetControlMappingInput {
  controlId: string
  applicability?: string
  justification?: string
  implementationStatus?: string
  implementationNotes?: string
}

export const GrundschutzAssetService = {
  /** Assets einer Firma auflisten */
  async list(tenantId: string, companyId: string, filters?: { categoryType?: string; status?: string; search?: string }) {
    const allAssets = await db.select({
      asset: grundschutzAssets,
      ownerName: users.firstName,
      ownerEmail: users.email,
    })
      .from(grundschutzAssets)
      .leftJoin(users, eq(grundschutzAssets.ownerId, users.id))
      .where(and(
        eq(grundschutzAssets.tenantId, tenantId),
        eq(grundschutzAssets.companyId, companyId),
        filters?.categoryType ? eq(grundschutzAssets.categoryType, filters.categoryType) : undefined,
        filters?.status ? eq(grundschutzAssets.status, filters.status) : undefined,
        filters?.search ? ilike(grundschutzAssets.name, `%${filters.search}%`) : undefined,
      ))
      .orderBy(asc(grundschutzAssets.categoryType), asc(grundschutzAssets.name))

    // Control-Counts pro Asset
    const controlCounts = await db.select({
      assetId: grundschutzAssetControls.assetId,
      total: count(),
    }).from(grundschutzAssetControls).groupBy(grundschutzAssetControls.assetId)
    const countMap = new Map(controlCounts.map(c => [c.assetId, Number(c.total)]))

    return allAssets.map(a => ({
      ...a.asset,
      ownerName: a.ownerName || a.ownerEmail || null,
      controlCount: countMap.get(a.asset.id) || 0,
    }))
  },

  /** Einzelnes Asset mit Relationen und Controls */
  async getById(tenantId: string, assetId: string) {
    const [row] = await db.select({
      asset: grundschutzAssets,
      companyName: companies.name,
      ownerName: users.firstName,
      ownerEmail: users.email,
    })
      .from(grundschutzAssets)
      .leftJoin(companies, eq(grundschutzAssets.companyId, companies.id))
      .leftJoin(users, eq(grundschutzAssets.ownerId, users.id))
      .where(and(eq(grundschutzAssets.tenantId, tenantId), eq(grundschutzAssets.id, assetId)))
      .limit(1)

    if (!row) return null

    // Relationen laden (bidirektional)
    const relations = await db.select().from(grundschutzAssetRelations_table)
      .where(and(
        eq(grundschutzAssetRelations_table.tenantId, tenantId),
      ))
    const assetRelations = relations.filter(r =>
      r.sourceAssetId === assetId || r.targetAssetId === assetId
    )

    // Verknuepfte Asset-Namen laden
    const relatedIds = new Set<string>()
    for (const r of assetRelations) {
      if (r.sourceAssetId !== assetId) relatedIds.add(r.sourceAssetId)
      if (r.targetAssetId !== assetId) relatedIds.add(r.targetAssetId)
    }
    let relatedAssets: Array<{ id: string; name: string; categoryName: string }> = []
    if (relatedIds.size > 0) {
      const all = await db.select({ id: grundschutzAssets.id, name: grundschutzAssets.name, categoryName: grundschutzAssets.categoryName })
        .from(grundschutzAssets)
      relatedAssets = all.filter(a => relatedIds.has(a.id))
    }
    const nameMap = new Map(relatedAssets.map(a => [a.id, a]))

    // Controls laden
    const controls = await db.select().from(grundschutzAssetControls)
      .where(eq(grundschutzAssetControls.assetId, assetId))

    return {
      ...row.asset,
      companyName: row.companyName,
      ownerName: row.ownerName || row.ownerEmail || null,
      relations: assetRelations.map(r => {
        const otherId = r.sourceAssetId === assetId ? r.targetAssetId : r.sourceAssetId
        const other = nameMap.get(otherId)
        return {
          id: r.id,
          relationType: r.relationType,
          direction: r.sourceAssetId === assetId ? 'outgoing' : 'incoming',
          otherAssetId: otherId,
          otherAssetName: other?.name || otherId,
          otherCategoryName: other?.categoryName || '',
          notes: r.notes,
        }
      }),
      controls,
    }
  },

  /** Asset erstellen */
  async create(tenantId: string, data: CreateAssetInput): Promise<GrundschutzAsset> {
    const [asset] = await db.insert(grundschutzAssets).values({
      tenantId,
      companyId: data.companyId,
      name: data.name,
      description: data.description || null,
      categoryType: data.categoryType,
      categoryName: data.categoryName,
      categoryUuid: data.categoryUuid || null,
      vertraulichkeit: data.vertraulichkeit || 'normal',
      integritaet: data.integritaet || 'normal',
      verfuegbarkeit: data.verfuegbarkeit || 'normal',
      schutzbedarfBegruendung: data.schutzbedarfBegruendung || null,
      ownerId: data.ownerId || null,
      status: data.status || 'active',
      location: data.location || null,
      tags: data.tags || [],
      notes: data.notes || null,
    }).returning()
    return asset
  },

  /** Asset aktualisieren */
  async update(tenantId: string, assetId: string, data: UpdateAssetInput): Promise<GrundschutzAsset | null> {
    const [updated] = await db.update(grundschutzAssets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(grundschutzAssets.tenantId, tenantId), eq(grundschutzAssets.id, assetId)))
      .returning()
    return updated || null
  },

  /** Asset loeschen */
  async delete(tenantId: string, assetId: string): Promise<boolean> {
    const result = await db.delete(grundschutzAssets)
      .where(and(eq(grundschutzAssets.tenantId, tenantId), eq(grundschutzAssets.id, assetId)))
      .returning({ id: grundschutzAssets.id })
    return result.length > 0
  },

  /** Relation zwischen Assets erstellen */
  async createRelation(tenantId: string, data: CreateAssetRelationInput) {
    const [rel] = await db.insert(grundschutzAssetRelations_table).values({
      tenantId,
      ...data,
    }).returning()
    return rel
  },

  /** Relation loeschen */
  async deleteRelation(tenantId: string, relationId: string) {
    await db.delete(grundschutzAssetRelations_table)
      .where(and(eq(grundschutzAssetRelations_table.tenantId, tenantId), eq(grundschutzAssetRelations_table.id, relationId)))
  },

  /** Control-Zuordnung erstellen/aktualisieren */
  async upsertControlMapping(tenantId: string, assetId: string, data: AssetControlMappingInput) {
    // Pruefen ob Mapping existiert
    const [existing] = await db.select().from(grundschutzAssetControls)
      .where(and(
        eq(grundschutzAssetControls.assetId, assetId),
        eq(grundschutzAssetControls.controlId, data.controlId),
      )).limit(1)

    if (existing) {
      const [updated] = await db.update(grundschutzAssetControls).set({
        applicability: data.applicability || existing.applicability,
        justification: data.justification !== undefined ? data.justification : existing.justification,
        implementationStatus: data.implementationStatus || existing.implementationStatus,
        implementationNotes: data.implementationNotes !== undefined ? data.implementationNotes : existing.implementationNotes,
        updatedAt: new Date(),
      }).where(eq(grundschutzAssetControls.id, existing.id)).returning()
      return updated
    }

    const [created] = await db.insert(grundschutzAssetControls).values({
      tenantId,
      assetId,
      controlId: data.controlId,
      applicability: data.applicability || 'applicable',
      justification: data.justification || null,
      implementationStatus: data.implementationStatus || 'offen',
      implementationNotes: data.implementationNotes || null,
    }).returning()
    return created
  },

  /** Schutzbedarf-Statistik fuer eine Firma */
  async getSchutzbedarfOverview(tenantId: string, companyId: string) {
    const assets = await db.select({
      categoryType: grundschutzAssets.categoryType,
      vertraulichkeit: grundschutzAssets.vertraulichkeit,
      integritaet: grundschutzAssets.integritaet,
      verfuegbarkeit: grundschutzAssets.verfuegbarkeit,
    }).from(grundschutzAssets)
      .where(and(eq(grundschutzAssets.tenantId, tenantId), eq(grundschutzAssets.companyId, companyId), eq(grundschutzAssets.status, 'active')))

    const byCategory = new Map<string, { total: number; hochCount: number }>()
    for (const a of assets) {
      if (!byCategory.has(a.categoryType)) byCategory.set(a.categoryType, { total: 0, hochCount: 0 })
      const cat = byCategory.get(a.categoryType)!
      cat.total++
      if (a.vertraulichkeit === 'hoch' || a.vertraulichkeit === 'sehr_hoch' ||
          a.integritaet === 'hoch' || a.integritaet === 'sehr_hoch' ||
          a.verfuegbarkeit === 'hoch' || a.verfuegbarkeit === 'sehr_hoch') {
        cat.hochCount++
      }
    }

    return {
      totalAssets: assets.length,
      byCategory: Object.fromEntries(byCategory),
    }
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/grundschutz-asset.service.ts
git commit -m "feat: Grundschutz++ Asset-Service (CRUD, Relationen, Controls, Schutzbedarf)"
```

---

## Task 4: Asset API-Routes

**Files:**
- Create: `src/app/api/v1/grundschutz/assets/route.ts`
- Create: `src/app/api/v1/grundschutz/assets/[id]/route.ts`
- Create: `src/app/api/v1/grundschutz/assets/[id]/controls/route.ts`

- [ ] **Step 1: Liste + Erstellen Route**

`src/app/api/v1/grundschutz/assets/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { GrundschutzAssetService } from '@/lib/services/grundschutz-asset.service'
import { withPermission } from '@/lib/auth/require-permission'

const createAssetSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  categoryType: z.string().min(1),
  categoryName: z.string().min(1),
  categoryUuid: z.string().optional(),
  vertraulichkeit: z.enum(['normal', 'hoch', 'sehr_hoch']).optional(),
  integritaet: z.enum(['normal', 'hoch', 'sehr_hoch']).optional(),
  verfuegbarkeit: z.enum(['normal', 'hoch', 'sehr_hoch']).optional(),
  schutzbedarfBegruendung: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  status: z.enum(['active', 'planned', 'decommissioned']).optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async (auth) => {
    try {
      const { searchParams } = new URL(request.url)
      const companyId = searchParams.get('companyId')
      if (!companyId) return apiError('MISSING_PARAM', 'companyId ist erforderlich', 400)

      const assets = await GrundschutzAssetService.list(auth.tenantId, companyId, {
        categoryType: searchParams.get('categoryType') || undefined,
        status: searchParams.get('status') || undefined,
        search: searchParams.get('search') || undefined,
      })
      return apiSuccess(assets)
    } catch { return apiServerError() }
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'create', async (auth) => {
    try {
      const body = await request.json()
      const parsed = validateAndParse(createAssetSchema, body)
      if (!parsed.success) return apiError('VALIDATION_ERROR', 'Ungueltige Eingabe', 400)

      const asset = await GrundschutzAssetService.create(auth.tenantId, parsed.data)
      return apiSuccess(asset, undefined, 201)
    } catch { return apiServerError() }
  })
}
```

- [ ] **Step 2: Einzelnes Asset Route**

`src/app/api/v1/grundschutz/assets/[id]/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { GrundschutzAssetService } from '@/lib/services/grundschutz-asset.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'basisabsicherung', 'read', async (auth) => {
    try {
      const { id } = await params
      const asset = await GrundschutzAssetService.getById(auth.tenantId, id)
      if (!asset) return apiError('NOT_FOUND', 'Asset nicht gefunden', 404)
      return apiSuccess(asset)
    } catch { return apiServerError() }
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'basisabsicherung', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const updated = await GrundschutzAssetService.update(auth.tenantId, id, body)
      if (!updated) return apiError('NOT_FOUND', 'Asset nicht gefunden', 404)
      return apiSuccess(updated)
    } catch { return apiServerError() }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'basisabsicherung', 'delete', async (auth) => {
    try {
      const { id } = await params
      const deleted = await GrundschutzAssetService.delete(auth.tenantId, id)
      if (!deleted) return apiError('NOT_FOUND', 'Asset nicht gefunden', 404)
      return apiSuccess({ deleted: true })
    } catch { return apiServerError() }
  })
}
```

- [ ] **Step 3: Control-Zuordnung Route**

`src/app/api/v1/grundschutz/assets/[id]/controls/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { GrundschutzAssetService } from '@/lib/services/grundschutz-asset.service'
import { withPermission } from '@/lib/auth/require-permission'

const upsertControlSchema = z.object({
  controlId: z.string().min(1),
  applicability: z.enum(['applicable', 'not_applicable']).optional(),
  justification: z.string().optional(),
  implementationStatus: z.enum(['offen', 'geplant', 'umgesetzt', 'teilweise', 'nicht_umgesetzt']).optional(),
  implementationNotes: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'basisabsicherung', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const parsed = validateAndParse(upsertControlSchema, body)
      if (!parsed.success) return apiError('VALIDATION_ERROR', 'Ungueltige Eingabe', 400)

      const mapping = await GrundschutzAssetService.upsertControlMapping(auth.tenantId, id, parsed.data)
      return apiSuccess(mapping)
    } catch { return apiServerError() }
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v1/grundschutz/assets/
git commit -m "feat: Grundschutz++ Asset API-Routes (CRUD, Controls, Kategorien)"
```

---

## Task 5: Frontend — Asset-Uebersicht pro Firma

**Files:**
- Create: `src/app/intern/(dashboard)/cybersecurity/grundschutz/assets/page.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/app/intern/(dashboard)/cybersecurity/grundschutz/page.tsx`

- [ ] **Step 1: Sidebar-Navigation erweitern**

In `src/components/layout/sidebar.tsx` nach dem Grundschutz++-Eintrag hinzufuegen:

```typescript
{ name: 'GS++ Assets', href: '/intern/cybersecurity/grundschutz/assets', requiredModule: 'basisabsicherung' },
```

- [ ] **Step 2: Asset-Uebersichtsseite erstellen**

`src/app/intern/(dashboard)/cybersecurity/grundschutz/assets/page.tsx`:

Die Seite zeigt:
- Firmenauswahl oben (wie bei Audits)
- Tabelle der Assets gruppiert nach categoryType
- Schutzbedarf-Badges (C/I/A) mit Farbkodierung (normal=gruen, hoch=orange, sehr_hoch=rot)
- Button "Neues Asset" oeffnet Dialog
- Klick auf Asset -> Detailseite

Kernstruktur (gekuerzt — vollstaendige Implementierung bei Ausfuehrung):

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Shield, Plus, Search, Loader2, Server, Building2, Globe, Monitor, Users, FolderOpen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

// Typ-Icons je categoryType
const CATEGORY_ICONS: Record<string, typeof Server> = {
  'IT-Systeme': Server, 'Anwendungen': Monitor, 'Netze': Globe,
  'Standorte': Building2, 'Nutzende': Users, 'Einkaeufe': FolderOpen,
  'Informationen': FolderOpen,
}

// Schutzbedarf-Farben
const SB_COLORS: Record<string, string> = {
  normal: 'bg-green-100 text-green-700',
  hoch: 'bg-orange-100 text-orange-700',
  sehr_hoch: 'bg-red-100 text-red-700',
}

// Hauptkomponente:
// 1. Firma waehlen (GET /api/v1/companies)
// 2. Assets laden (GET /api/v1/grundschutz/assets?companyId=...)
// 3. Asset erstellen Dialog mit:
//    - Name, Beschreibung
//    - Kategorie-Auswahl (GET /api/v1/grundschutz/assets/categories -> Baum)
//    - Schutzbedarf C/I/A Dropdowns
//    - POST /api/v1/grundschutz/assets
// 4. Asset-Tabelle mit: Name, Kategorie, Schutzbedarf-Badges, Status, Controls-Count
// 5. Klick -> /intern/cybersecurity/grundschutz/assets/[id]
```

- [ ] **Step 3: Commit**

```bash
git add src/app/intern/(dashboard)/cybersecurity/grundschutz/assets/page.tsx src/components/layout/sidebar.tsx
git commit -m "feat: Grundschutz++ Asset-Uebersicht mit Firmenauswahl und Schutzbedarf"
```

---

## Task 6: Frontend — Asset-Detailseite

**Files:**
- Create: `src/app/intern/(dashboard)/cybersecurity/grundschutz/assets/[id]/page.tsx`

- [ ] **Step 1: Detailseite mit 3 Tabs erstellen**

Die Seite zeigt ein einzelnes Asset mit:

**Tab 1 — Stammdaten:**
- Name, Beschreibung, Kategorie (editierbar)
- Schutzbedarf C/I/A mit Dropdown-Editierung + Begruendungsfeld
- Status, Verantwortlicher, Standort

**Tab 2 — Beziehungen:**
- Liste der verbundenen Assets (Typ: runs_on, supports, connected_to, housed_in, uses, managed_by)
- "Beziehung hinzufuegen" Dialog: Asset auswaehlen + Relationstyp
- Richtung anzeigen (-> / <-)

**Tab 3 — Controls:**
- Liste zugeordneter Grundschutz++ Controls
- "Control zuordnen" — Auswahl aus Katalog
- Pro Control: Anwendbarkeit (ja/nein), Umsetzungsstatus, Notizen
- Umsetzungsfortschritt-Balken

- [ ] **Step 2: Commit**

```bash
git add src/app/intern/(dashboard)/cybersecurity/grundschutz/assets/[id]/page.tsx
git commit -m "feat: Grundschutz++ Asset-Detail (Schutzbedarf, Beziehungen, Controls)"
```

---

## Task 7: Grundschutz-Hauptseite verknuepfen

**Files:**
- Modify: `src/app/intern/(dashboard)/cybersecurity/grundschutz/page.tsx`

- [ ] **Step 1: Asset-Stats und Quick-Link auf Hauptseite**

Im Header-Bereich neben "Neues Audit" einen Link zu Assets hinzufuegen:

```typescript
<Link href="/intern/cybersecurity/grundschutz/assets">
  <Button variant="outline" size="sm">
    <Server className="h-4 w-4 mr-1" />Assets
  </Button>
</Link>
```

- [ ] **Step 2: Commit + Build**

```bash
git add src/app/intern/(dashboard)/cybersecurity/grundschutz/page.tsx
git commit -m "feat: Grundschutz++ Hauptseite mit Asset-Link"
npx next build
```

---

## Zusammenfassung der Abhaengigkeitskette

```
Geschaeftsprozess (Firma)
  └── definiert Schutzbedarf
       └── Anwendungen (Assets, categoryType=Anwendungen)
            └── laufen auf IT-Systemen (relation: runs_on)
                 └── verbunden ueber Netze (relation: connected_to)
                      └── stehen in Raeumen (relation: housed_in)

Jedes Asset:
  1. Hat BSI-Zielobjektkategorie (categoryUuid)
  2. Hat Schutzbedarf C/I/A (vererbt oder manuell)
  3. Hat zugeordnete Controls (grundschutz_asset_controls)
  4. Hat Beziehungen zu anderen Assets (grundschutz_asset_relations)
```

## Spaetere Erweiterungen (nicht in diesem Plan)

- **Automatische Schutzbedarfsvererbung**: Maximumprinzip entlang der Beziehungskette berechnen
- **Automatische Control-Zuordnung**: Basierend auf Zielobjektkategorie + SecLevel passende Controls vorschlagen
- **Import aus Cockpit**: Bestehende cockpit_systems als Assets uebernehmen
- **Audit-Scope**: Audit-Session auf bestimmte Assets einschraenken
- **Blaupausen**: BSI-Muster-Strukturmodelle fuer typische KMU-Setups
