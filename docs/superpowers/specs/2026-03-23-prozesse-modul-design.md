# Prozesse-Modul (Digitales Prozesshandbuch)

**Datum:** 2026-03-23
**Status:** Approved

## Zweck

Neues Modul "Prozesse" das SOPs als digitales Handbuch darstellt. 3 Ebenen: Prozessbereiche > Teilprozesse > Aufgaben mit vollständigen SOP-Details (Schritte, Checklisten, Tools, Fehlerfall).

## Datenquelle

- `temp/SOP_KI-Beratung_59_Aufgaben.json` — 59 Aufgaben, 7 Prozessbereiche
- `temp/new_sops.json` — Weitere SOPs (KP3 Bereich)

## DB-Schema

### `processes` Tabelle
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | uuid PK | |
| tenantId | uuid FK | Multi-tenant |
| key | varchar(20) | z.B. "KP1", "MP" |
| name | varchar(255) | z.B. "KP1 Marketing" |
| description | text | Beschreibung |
| sortOrder | integer | Sortierung |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### `process_tasks` Tabelle
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | uuid PK | |
| tenantId | uuid FK | Multi-tenant |
| processId | uuid FK | Referenz auf processes |
| taskKey | varchar(20) | z.B. "KP1-01" |
| subprocess | varchar(255) | z.B. "1.1 Content-Erstellung" |
| title | varchar(255) | Aufgabenname |
| purpose | text | Zweck |
| trigger | text | Auslöser |
| timeEstimate | varchar(50) | z.B. "30 Min" |
| automationPotential | varchar(20) | Hoch/Mittel/Niedrig |
| tools | jsonb | Empfohlene Tools |
| prerequisites | jsonb | Vorbedingungen |
| steps | jsonb | Schritte [{nr, action, tool, hint}] |
| checklist | jsonb | Erfolgskontrolle |
| expectedOutput | text | Erwartetes Ergebnis |
| errorEscalation | text | Fehlerfall |
| solution | text | KI-Ansatz/Lösung |
| sortOrder | integer | Sortierung |
| createdAt | timestamp | |
| updatedAt | timestamp | |

## API Routes

- `GET /api/v1/processes` — Alle Prozessbereiche
- `POST /api/v1/processes` — Neuer Prozessbereich
- `GET /api/v1/processes/[id]` — Detail mit allen Tasks
- `PUT /api/v1/processes/[id]` — Update
- `DELETE /api/v1/processes/[id]` — Löschen
- `GET /api/v1/processes/[id]/tasks` — Tasks eines Prozesses
- `POST /api/v1/processes/[id]/tasks` — Neue Aufgabe
- `GET /api/v1/processes/tasks/[taskId]` — Task-Detail
- `PUT /api/v1/processes/tasks/[taskId]` — Task-Update
- `DELETE /api/v1/processes/tasks/[taskId]` — Task löschen
- `POST /api/v1/processes/seed` — Import aus JSON

## Frontend

### /intern/prozesse — Übersicht
- Cards pro Prozessbereich mit Name, Beschreibung, Aufgaben-Anzahl
- Badge für Automatisierungspotenzial-Verteilung

### /intern/prozesse/[id] — Prozess-Detail (Handbuch)
- Gruppiert nach Teilprozess
- Accordion pro Aufgabe mit:
  - Header: Titel, Zeitaufwand, Automatisierungspotenzial-Badge
  - Body: Zweck, Trigger, Vorbedingungen, Schritte-Tabelle, Checkliste, Output, Fehlerfall

## Dateien

1. `src/lib/db/schema.ts` — processes + process_tasks Tabellen
2. `src/lib/services/process.service.ts` — CRUD + Seed
3. `src/lib/utils/validation.ts` — Zod-Schemas
4. `src/lib/types/permissions.ts` — 'processes' hinzufügen
5. `src/app/api/v1/processes/` — API Routes
6. `src/app/intern/(dashboard)/prozesse/` — Frontend Pages
7. Drizzle Migration
