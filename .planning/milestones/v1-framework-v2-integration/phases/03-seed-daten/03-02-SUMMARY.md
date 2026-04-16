---
phase: 03-seed-daten
plan: "02"
subsystem: management/sops
tags: [seed, sops, framework-v2, idempotent]
dependency_graph:
  requires:
    - 03-01 (deliverable-catalog seed — produces deliverable UUIDs fuer Lookup)
  provides:
    - seedSopCatalog (alle 109 SOPs aus Framework v2 in DB)
  affects:
    - sop_documents table
    - seed-check.ts (Seed-Reihenfolge)
tech_stack:
  added: []
  patterns:
    - db.insert(sopDocuments) direkt (kein SopService) fuer Framework-v2-Felder
    - Zweistufige Idempotenz (sourceTaskId | title)
    - Deliverable-Lookup via Map (name -> uuid)
    - parseDauer() fuer dauer-String zu Minuten
key_files:
  created:
    - src/lib/db/seeds/sop-catalog.seed.ts
  modified:
    - src/lib/db/seed-check.ts
decisions:
  - db.insert statt SopService.create — SopService unterstuetzt keine Framework-v2-Felder
  - Idempotenz zweistufig: operative SOPs per sourceTaskId, allgemeine per title
  - DELIVERABLE_CODE_TO_NAME nur fuer Codes mit verifiziertem Catalog-Match besetzen
metrics:
  duration: "25 min"
  completed: "2026-04-13"
  tasks: 2
  files: 2
---

# Phase 3 Plan 02: SOP-Catalog Seed Summary

Alle SOPs aus dem xKMU AI Business Framework v2 idempotent in sop_documents geseedet — mit allen Framework-v2-Feldern (automationLevel, aiCapable, maturityLevel, estimatedDurationMinutes, subprocess, sourceTaskId) und Deliverable-FK-Lookup wo moeglich.

## Erstellte Dateien

### src/lib/db/seeds/sop-catalog.seed.ts (NEU)

Exportiert `seedSopCatalog(tenantId: string)` — idempotenter Seed aller SOPs.

**Struktur:**
- `GENERAL_SOPS[]` — 14 allgemeine SOPs (Gruppe 1: SOP-V001 bis SOP-F002, ohne source_task_id)
- `OPERATIVE_SOPS[]` — 95 operative SOPs (Gruppe 2: KP1-KP7, MP, UP)
- `DELIVERABLE_CODE_TO_NAME` — Lookup-Map DEL-Code -> Deliverable-Name
- `parseDauer()` — konvertiert dauer-Strings ("30 Min", "4-8 Std") in Minuten-Integer

### src/lib/db/seed-check.ts (MODIFIZIERT)

- Import `seedSopCatalog` aus `./seeds/sop-catalog.seed` hinzugefuegt
- Aufruf als Schritt 16 nach `seedDeliverableCatalog` eingefuegt (Reihenfolge kritisch)

## Geseedete SOPs nach Gruppe

| Gruppe | Bereich | Anzahl |
|--------|---------|--------|
| Gruppe 1 — Allgemeine SOPs | V, IT, M, P, C, F | 14 |
| KP1 | Marketing & Lead-Generierung | 12 |
| KP2 | Vertrieb & Onboarding | 14 |
| KP3 | Leistungserbringung | 21 |
| KP4 | Abrechnung & Controlling | 7 |
| KP5 | Kundenbindung & After-Sales | 8 |
| MP | Managementprozesse | 5 |
| UP | IT & Weiterbildung | 9 |
| KP6 | IT-Beratung | 6 |
| KP7 | Cybersecurity | 13 |
| **Gesamt** | | **109** |

## SOPs mit produces_deliverable_id Verknuepfung

Von den 109 SOPs haben 7 SOPs in Gruppe 1 einen `produces_deliverable` Code gesetzt.
Davon haben **2 einen erfolgreichen Lookup** auf Deliverable-Namen die tatsaechlich im Catalog existieren:

| SOP | Code | Deliverable-Name | Status |
|-----|------|-----------------|--------|
| SOP-IT003 Security Check & DIN SPEC 27076 Audit | DEL-IT001 | IT-Health-Report | Match (Modul B1) |
| SOP-IT001 Incident Response | DEL-IT003 | Abnahmeprotokoll (digital signiert) | Match (Modul A2) |

**5 Codes ohne Catalog-Match** (producesDeliverableId = null, logger.warn):

| Code | PLAN-Vorschlag | Grund kein Match |
|------|---------------|-----------------|
| DEL-V001 | Angebotserstellung | Kein Deliverable dieses Namens im Catalog |
| DEL-V002 | Angebotserstellung | Kein Deliverable dieses Namens im Catalog |
| DEL-P001 | Kick-off-Protokoll | Kein Deliverable dieses Namens im Catalog |
| DEL-P002 | Detailplanung | Kein Deliverable dieses Namens im Catalog |
| DEL-C001 | DSGVO-Auskunftsanfrage | Kein Deliverable dieses Namens im Catalog |

Diese Codes referenzieren Konzepte aus dem Framework die (noch) keine direkten Entsprechungen im Deliverable-Katalog haben. Die Verknuepfung bleibt null und kann spaeter ergeenzt werden wenn der Katalog erweitert wird.

## Idempotenz-Strategie

**Operative SOPs** (mit source_task_id): Check per `sourceTaskId + tenantId + deletedAt IS NULL`
**Allgemeine SOPs** (ohne source_task_id): Check per `title + tenantId + deletedAt IS NULL`

Beim erneuten Ausfuehren wird jeder bereits vorhandene SOP uebersprungen (skipped++).

## parseDauer() Konvertierung

| Eingabe | Ausgabe |
|---------|---------|
| "30 Min" | 30 |
| "15 Min/Tag" | 15 |
| "60 Min/Monat" | 60 |
| "4-8 Std" | 360 (Mittelpunkt * 60) |
| "2 Std/Jahr" | 120 |
| "5-10 Min" | 7 (gerundet) |
| "Einmalig" | null |
| "Variabel" | null |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Anpassungen vs. PLAN-Vorgabe

**DELIVERABLE_CODE_TO_NAME Map:** Die PLAN-Vorgabe enthielt DEL-V001/V002 -> "Angebotserstellung" und weitere Mappings. Nach Abgleich mit dem tatsaechlichen deliverable-catalog.seed.ts existieren diese Deliverable-Namen nicht im Catalog. Nur verifizierte Matches (DEL-IT001, DEL-IT003) wurden in die Map aufgenommen. Unbekannte Codes loggen ein logger.warn() und setzen producesDeliverableId = null.

**SOP-Anzahl:** Plan erwartete ~93 operative SOPs. Das JSON enthaelt 14 Gruppe-1-SOPs + 95 operative SOPs = 109 gesamt (inkl. KP6-09 IT-Beratung und KP7-13 Cybersecurity-Bereich die im Plan-Leitfaden nicht vollstaendig aufgelistet waren aber im JSON vorhanden sind).

## Known Stubs

Keine — der Seed schreibt echte Daten aus dem Framework v2 JSON in die DB ohne Platzhalter.

## Commits

| Task | Commit | Beschreibung |
|------|--------|-------------|
| Task 1 | 4db99fa | feat(03-02): add sop-catalog.seed.ts with 109 SOPs from Framework v2 |
| Task 2 | f358a97 | feat(03-02): register seedSopCatalog in seed-check.ts |

## Self-Check: PASSED

- [x] src/lib/db/seeds/sop-catalog.seed.ts existiert (60487 Bytes)
- [x] export async function seedSopCatalog gefunden (Zeile 1462)
- [x] Kein SopService.create() im Seed verwendet
- [x] seedSopCatalog Import in seed-check.ts (Zeile 13)
- [x] seedSopCatalog Aufruf nach seedDeliverableCatalog (Zeile 876 nach Zeile 873)
- [x] npx tsc --noEmit ohne Fehler in sop-catalog.seed.ts
- [x] Commits 4db99fa und f358a97 existieren
