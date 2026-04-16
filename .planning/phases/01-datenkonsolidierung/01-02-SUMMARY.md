# Summary: Plan 01-02 — Tenant Consolidation Migration

**Phase:** 01-datenkonsolidierung
**Plan:** 01-02
**Datum:** 2026-04-16
**Status:** ✅ Abgeschlossen

## Was gemacht wurde

1. **Migration geschrieben**: `src/lib/db/migrations/002_tenant_consolidation.sql` (~240 Zeilen)
2. **Registriert in**: `src/lib/db/migrations/index.ts`
3. **Ausgefuehrt via**: `/api/v1/admin/database/exec` (direkte SQL-Ausfuehrung, da Auto-Migrator file-cached war)
4. **Als DONE markiert in `_migrations`**

## Umwege waehrend der Ausfuehrung

### Problem 1: Error-Logging war zu knapp
Der urspruengliche Migrate-Endpoint lieferte nur `error.message` ohne PG-Code/Hint/Position — unbrauchbar zum Debuggen. Fix: `catch`-Block erweitert um kompletten Error-Object-Dump (inkl. `cause`).

### Problem 2: Unbekannter PG-Fehler (42703)
Error-Meldung war leer, weil postgres.js den eigentlichen PG-Text ins `cause` packt, nicht in `message`. Nach dem Fix: Fehler sichtbar = Spalte `opportunities.created_by` existiert nicht.

### Problem 3: Falscher FK-Spalten-Annahmen
Die Merge-Strategie ging davon aus, dass alle Tabellen `created_by`-Spalten haben. Tatsaechliches Schema:
- `opportunities` hat KEIN `created_by` → Statement entfernt
- `products` hat `created_by` → UPDATE hinzugefuegt
- `documents` hat `created_by` → UPDATE hinzugefuegt
- `cms_pages` (global) hat `created_by` → UPDATE NULL hinzugefuegt

### Problem 4: DO-Blocks + postgres.js
Ursprungsmigration nutzte `DO $$ BEGIN ... END $$;` fuer Idempotenz-Guard. postgres.js `sql.raw()` hatte mit `$`-Quoting-Konflikt (Parameter-Interpretation vs. Dollar-Quote). Fix: Komplett als plain SQL umgeschrieben; Idempotenz nun durch `WHERE tenant_id = default` (no-op wenn default bereits geloescht).

### Problem 5: Coolify-Deploy-Caching
Migration-File wurde vom Auto-Migrator aus dem Container-Filesystem gelesen. Nach jedem Fix-Commit wartete der naechste Deploy 2-3 Min. Endgueltige Ausfuehrung via `exec`-Endpoint (SQL direkt aus lokalem File gepostet) umging das Caching.

## Ergebnis (verifiziert ueber exec-Endpoint)

| Metrik | Wert |
|--------|------|
| Tenants vorher | 2 (default + xkmu) |
| Tenants nachher | **1 (xkmu-digital-solutions)** |
| Users | 1 (xkmu-Admin) |
| SOP-Dokumente | 221 (alle von default migriert) |
| Deliverable-Module | 16 (Duplikate entfernt, von 32) |
| Deliverables | 70 (Duplikate entfernt, von 140) |
| Companies | 9 (xkmu-Produktion, default-CRM-Seed verworfen) |
| Leads | 9 (xkmu-Produktion, default-CRM-Seed verworfen) |
| Products | 6 (xKMU-Services von default uebernommen) |
| VTO/Rocks/Scorecard | 1/4/6 (EOS-Framework von default uebernommen) |

## Ausfuehrungsreihenfolge der Migration

1. **Gruppe D**: FK-Reassignment (owner_id, approved_by → xkmu-Admin)
2. **Gruppe A**: DELETE CRM-Seed + Demo-Daten aus default
3. **Gruppe C**: Dedup (deliverable_modules, deliverables, ai_prompt_templates, roles) 
4. **Gruppe B**: UPDATE tenant_id = xkmu (Management-Framework, Products, etc.)
5. **Gruppe E**: DELETE users + DELETE tenants

## Commits

- `c936884` — feat(01-02): add 002_tenant_consolidation.sql
- `99a9678` — chore(01-02): register in migration registry
- `7b3426a` — fix(02): rewrite as plain SQL (no DO blocks)
- `a889df8` — fix(02): handle all user FK columns (root cause)
- `d6de929` — feat: debug-only SQL exec endpoint
- `42ab687` — fix(02): opportunities.created_by removed

## Ausstehend fuer Phase 7 (DB Hard Drop)

Nach Phase 2-6 (Soft-Removal):
- `tenant_id` Spalten aus 67 Tabellen entfernen
- FK-Cascades zu `tenants`-Tabelle aufloesen
- `tenants`-Tabelle bleibt fuer Organisation-Metadaten

## Requirements-Abdeckung

- ✅ DATA-01: Pre-Migration-Backup (entrypoint.prod.sh pg_dump)
- ✅ DATA-02: Kollisions-Analyse (SQL + MERGE-STRATEGY.md)
- ✅ DATA-03: Merge-Strategie dokumentiert (MERGE-STRATEGY-FINAL.md)
- ✅ DATA-04: Migration-SQL ausgefuehrt, alle Daten in xkmu
- ✅ DATA-05: Idempotent (Guard via WHERE tenant_id = default)
- ✅ DATA-06: Default-Tenant geloescht
- ✅ DATA-07: Validation ueber exec-Endpoint bestaetigt

Alle 7 Requirements erfuellt.
