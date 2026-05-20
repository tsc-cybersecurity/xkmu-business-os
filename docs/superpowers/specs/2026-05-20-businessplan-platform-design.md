# Businessplan-Plattform — Design-Spec

> Stand: 2026-05-20 — initiale Spec nach Brainstorming-Session

## Zielbild

KI-gesteuerte Plattform im `/intern`-Bereich, die aus einer rohen Geschäftsidee oder einem Detailbriefing einen Businessplan erzeugt, ihn mit der Mirofish-Simulation (Self-host) auf Marktreaktionen testet, die Ergebnisse analysiert und den Plan iterativ verbessert, bis ein Score-Schwellwert erreicht oder eine Iterations-Obergrenze ausgeschöpft ist.

## Anforderungen aus Brainstorming

| Punkt | Entscheidung |
|---|---|
| Plan-Format | Beides wählbar pro Plan: Lean Canvas (9 Boxen) und/oder KfW-Langform |
| Iterations-Abbruch | Score ≥ Schwelle ODER Iteration ≥ Max — beide Werte pro Plan einstellbar |
| Mirofish | Self-host als zusätzlicher Docker-Service im Stack |
| Start-Input | Beides: Quick-Idee (1 Textfeld) oder strukturiertes Briefing-Formular |
| Zielgruppe | Intern, kein öffentlicher Zugang |
| Architektur | Auf bestehender Workflow-Engine aufbauen, dort `loop`-StepKind ergänzen |

## Architektur-Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│  /intern/business-plans (Next.js Pages)                         │
│  ├─ Liste, Detail (Tabs), Anlage-Modal                          │
└─────────────────┬───────────────────────────────────────────────┘
                  │ API-Routes /api/v1/business-plans/*
┌─────────────────▼───────────────────────────────────────────────┐
│  BusinessPlanService — start(input), get(id), stop(id)          │
│  IterationService    — runIteration(planId), evaluateStop()     │
└─────────┬────────────────────────────┬──────────────────────────┘
          │                            │ via Workflow-Engine
          ▼                            ▼
┌──────────────────────┐   ┌──────────────────────────────────────┐
│ MirofishClient       │   │ Workflow-Engine (erweitert)          │
│ POST /simulate       │   │  + StepKind 'loop'                   │
│ HTTP zu mirofish:5001│   │  + Actions: generate_business_idea,  │
└──────────┬───────────┘   │    generate_business_story,          │
           │ REST          │    generate_business_plan,           │
           ▼               │    simulate_with_mirofish,           │
┌──────────────────────┐   │    analyze_simulation,               │
│ Mirofish (Docker)    │   │    revise_business_plan              │
│ Python + Vue, AGPL   │   └──────────────────────────────────────┘
└──────────────────────┘
          │
          ▼ taskQueue (async)
┌──────────────────────────────────────────────────────────────────┐
│ Postgres: business_plans, business_plan_iterations,              │
│           business_plan_artifacts                                │
└──────────────────────────────────────────────────────────────────┘
```

## Datenmodell

### Tabelle `business_plans`

| Spalte | Typ | Zweck |
|---|---|---|
| id | uuid PK | |
| title | varchar(255) | von KI aus seedInput generiert, Operator editierbar |
| mode | varchar(16) | `canvas` \| `kfw` \| `both` |
| input_type | varchar(16) | `quick` \| `briefing` |
| seed_input | jsonb | `{ idea: string }` ODER `{ industry, audience, usp, region, capital }` |
| current_iteration | int default 0 | wie viele Iterationen schon gelaufen |
| max_iterations | int default 5 | Operator-konfigurierbar pro Plan |
| score_threshold | int default 80 | 0-100, ab hier Stop |
| final_score | int nullable | letzter erreichter Score |
| status | varchar(20) | `idle` \| `running` \| `completed` \| `failed` \| `stopped` |
| error | text nullable | letzter Fehler |
| current_iteration_task_id | uuid FK→task_queue | für Cancel |
| created_by | uuid FK→users | |
| created_at, updated_at | timestamps | |

### Tabelle `business_plan_iterations`

| Spalte | Typ | Zweck |
|---|---|---|
| id | uuid PK | |
| plan_id | uuid FK→business_plans CASCADE | |
| iteration_number | int | 1-basiert |
| plan_canvas | jsonb nullable | Lean-Canvas-Struktur (9 Boxen) |
| plan_kfw_markdown | text nullable | Langform-Plan als Markdown |
| simulation_request | jsonb | was an Mirofish geschickt wurde |
| simulation_result | jsonb | Mirofish-Bericht (Summary, Risk-Signals, Narratives) |
| analysis | jsonb | `{ score, strengths[], weaknesses[], improvements[] }` |
| duration_ms | int | wie lange Iteration dauerte |
| status | varchar(20) | `pending` \| `generating` \| `simulating` \| `analyzing` \| `done` \| `failed` |
| error | text nullable | |
| created_at, updated_at | timestamps | |
| UNIQUE(plan_id, iteration_number) | | |

### Tabelle `business_plan_artifacts`

| Spalte | Typ | Zweck |
|---|---|---|
| id | uuid PK | |
| plan_id | uuid FK CASCADE | |
| iteration_id | uuid FK nullable | optional: an welche Iteration gebunden |
| kind | varchar(30) | `pdf_export`, `pitch_image`, `summary_doc` |
| file_url | text | Verweis auf Object Storage |
| meta | jsonb | |
| created_at | timestamp | |

## Mirofish-Integration

### Docker-Service

Neue Definition in `docker-compose.yml`, `docker-compose.local.yml`, `docker-compose.prod.yml`:

```yaml
mirofish:
  image: ghcr.io/666ghj/mirofish:latest  # oder eigener Build aus xkmu-mirofish-fork
  restart: unless-stopped
  environment:
    LLM_API_KEY: ${MIROFISH_LLM_API_KEY}      # = unser Default-Provider-Key
    LLM_BASE_URL: ${MIROFISH_LLM_BASE_URL}    # = OpenAI-kompatibler Endpoint
    LLM_MODEL_NAME: ${MIROFISH_LLM_MODEL}     # z.B. gpt-4o-mini
  ports:
    - "5001:5001"                              # nur in local; prod hinter Netzwerk
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

In Prod kein Port-Mapping; Erreichbarkeit nur über das Docker-Netzwerk durch unseren Next.js-Container.

### `MirofishClient`

`src/lib/services/mirofish/client.ts`:

```ts
export interface MirofishSimulateRequest {
  question: string                   // natürlichsprachliche Simulationsfrage
  seedMaterials: Array<{
    filename: string                 // z.B. "business-plan.md"
    contentType: 'text/markdown' | 'application/pdf' | 'text/plain'
    content: string                  // base64 für PDF, plain für md/txt
  }>
}

export interface MirofishSimulateResult {
  summary: string
  riskSignals: Array<{ severity: 'low' | 'medium' | 'high'; description: string }>
  narrativePaths: Array<{ persona: string; reaction: string; reasoning: string }>
  followUpQuestions: string[]
  rawResponse: unknown               // für Debug
}

export const MirofishClient = {
  async simulate(req: MirofishSimulateRequest): Promise<MirofishSimulateResult>,
  async healthcheck(): Promise<boolean>,
}
```

Basis-URL aus `cms_settings` Key `mirofish.baseUrl`, Default `http://mirofish:5001`. Timeout 5 min, ein Retry bei Netzwerkfehler.

### AGPL-Compliance

Mirofish läuft als separater Prozess, kommuniziert via HTTP — keine Linkage, AGPL infiziert unser System nicht. Falls wir Patches/Forks am Mirofish-Code brauchen, müssen die in einem öffentlichen Repo (z.B. `tsc-cybersecurity/xkmu-mirofish-fork`) liegen.

## Workflow-Engine-Erweiterung

### Neuer StepKind `loop`

`src/lib/services/workflow/engine.ts`:

```ts
type StepKind = 'action' | 'branch' | 'parallel' | 'for_each' | 'loop'

interface LoopStep extends BaseStep {
  kind: 'loop'
  maxIterations: number              // hard cap, max 50 zum Schutz vor Endlosschleifen
  condition?: string                 // optional: simple expression, ausgewertet pro Runde
  steps: WorkflowStep[]              // Body, läuft pro Iteration
}
```

Limit-Guard: `MAX_LOOP_ITERATIONS = 50`. Pro Iteration wird ein StepResult-Eintrag erzeugt; `path` enthält Iterations-Index.

### Neue Actions

In `action-registry.ts`:

| Action | Input | Output |
|---|---|---|
| `generate_business_idea` | `{ seed: string }` | `{ idea: string }` |
| `generate_business_story` | `{ idea, briefing? }` | `{ story: string }` |
| `generate_business_plan` | `{ story, mode: 'canvas'\|'kfw'\|'both' }` | `{ canvas?, kfw? }` |
| `simulate_with_mirofish` | `{ plan }` | `{ simulationResult }` |
| `analyze_simulation` | `{ plan, simulationResult }` | `{ score, strengths, weaknesses, improvements }` |
| `revise_business_plan` | `{ plan, improvements, mode }` | `{ canvas?, kfw? }` |

### Trigger

`WORKFLOW_TRIGGERS` ergänzen um:
- `business_plan.created` — gefeuert nach Anlegen
- `business_plan.iteration_completed` — nach jeder Runde
- `business_plan.completed` — final, mit Score
- `business_plan.failed`

Standard-Workflow (Seed): Ein Default-Loop-Workflow, der einen Plan iteriert. Operator kann ihn klonen und Steps tauschen.

## Service-Layer

`src/lib/services/business-plan/`:

```
├─ business-plan.service.ts        CRUD + start(input) → enqueue
├─ iteration.service.ts            runIteration(planId), evaluateStop()
├─ prompts/
│  ├─ idea-to-story.ts
│  ├─ story-to-canvas.ts
│  ├─ story-to-kfw.ts
│  ├─ analyze-simulation.ts
│  └─ revise-plan.ts
└─ pdf-export.service.ts           Optional Phase 7
```

### Iterations-Loop

`IterationService.runIteration(planId)`:
1. Lade Plan + letzte Iteration
2. Wenn `iteration_number === 0` (erste Runde): `seedInput → story → plan(mode)`
3. Sonst: `lastPlan + lastAnalysis.improvements → revisedPlan`
4. Persistiere Plan-Version in neuer `business_plan_iterations`-Row (`status='simulating'`)
5. `MirofishClient.simulate(plan)` → simulationResult, persistiere
6. `analyze_simulation` (KI) → `{ score, strengths, weaknesses, improvements }`, persistiere
7. Setze `business_plans.current_iteration` + `final_score`
8. **Stop-Check**: `score >= threshold || iteration >= maxIterations`
   - Stop: setze Plan-Status `completed`, feuere `business_plan.completed`
   - Continue: enqueue neuen taskQueue-Eintrag für nächste Iteration
9. Bei Exception in jedem Schritt: Iteration-Status `failed`, Plan-Status `failed`, Error persistiert, Trigger `business_plan.failed`

### TaskQueue

Neuer Task-Typ: `business_plan_iteration` mit Payload `{ planId }`. Worker liest, ruft `IterationService.runIteration(planId)`.

## KI-Prompts

Alle als `ai_prompt_templates`-Einträge per Seed angelegt, Operator-anpassbar:

- `business_plan.idea_to_story`
- `business_plan.story_to_canvas`
- `business_plan.story_to_kfw`
- `business_plan.simulation_question` — formuliert die natürlichsprachliche Frage an Mirofish ("Simuliere, wie folgende Zielgruppen auf den Launch des hier beschriebenen Produkts in {{region}} reagieren würden …")
- `business_plan.analyze_simulation` — bekommt Plan + Mirofish-Bericht, vergibt `score` 0-100 mit Begründung
- `business_plan.revise_plan` — bekommt alten Plan + improvements, generiert neue Version

Output-Format jedes Prompts strikt JSON (analog `news-blog-draft`).

## UI

### Liste `/intern/business-plans/page.tsx`

- Karten mit: Titel, Mode-Badges (Canvas/KfW), Status, Score-Gauge (Donut), Iterations-Bar (X/Y)
- Filter: Status, Mode, Datum
- Button "Neuer Plan" → Modal

### Anlage-Modal

- Toggle "Quick" ↔ "Briefing"
  - Quick: ein Textfeld + 2 Sätze Hilfetext
  - Briefing: 5 Felder (Branche, Zielgruppe, USP, Region, geplantes Investvolumen)
- Mode-Select: Canvas / KfW / Beides
- Max-Iterationen-Number (default 5, max 10)
- Score-Schwelle-Slider (0-100, default 80)
- Submit → POST `/api/v1/business-plans` → Redirect Detail

### Detail `/intern/business-plans/[id]/page.tsx`

Header:
- Titel + Status-Badge
- Score-Gauge groß
- Iterations-Counter "3 von 5"
- Aktionen: Stop, "Erneut iterieren mit anderen Kriterien", Export PDF (falls implementiert)

Tabs:
1. **Plan** — aktuelle finale Version, Canvas als Grid + KfW-Markdown-Render
2. **Iterationen** — Timeline mit pro Runde: Score-Verlauf-Sparkline, Klick → expandiert Iteration mit Plan-Diff + Simulation + Analyse
3. **Simulation** — Mirofish-Roh-Output mit Risk-Signals + Narrativen
4. **Analyse** — KI-Bewertung mit Stärken/Schwächen/Improvements

### Live-Updates

Polling im Detail-View alle 5s wenn Status `running`. Optional später SSE/WebSocket.

## API-Routes

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/v1/business-plans` | Anlegen + Start |
| GET | `/api/v1/business-plans` | Liste mit Pagination/Filtern |
| GET | `/api/v1/business-plans/[id]` | Detail mit eingebundenen Iterationen |
| POST | `/api/v1/business-plans/[id]/stop` | Aktuellen Run stoppen |
| POST | `/api/v1/business-plans/[id]/iterate` | Neuen Iterations-Lauf anstoßen |
| DELETE | `/api/v1/business-plans/[id]` | Plan löschen |
| GET | `/api/v1/business-plans/[id]/export.pdf` | Phase 7 |

## Berechtigungen

Neues Permission-Modul `business_plans` mit Actions `read`, `create`, `update`, `delete`. Bestehende Admin-Rolle bekommt alle, Operator-Rolle `read`+`create`+`update`.

## Audit-Logging

Gemäß Memory `feedback_audit_logging`: alle ändernden Aktionen (Anlegen, Start, Stop, Löschen, Re-iterate) persistieren mit Actor, Plan-Id, Aktion, Zeitstempel.

## Erfolgskriterien (Definition of Done)

1. Mirofish läuft als Container, `/health` antwortet
2. Plan kann via Modal angelegt werden, Status wechselt zu `running`
3. Mindestens 2 Iterationen laufen ohne Eingriff durch
4. Score wird je Iteration vergeben und im UI sichtbar
5. Stop-Bedingung greift (sowohl Score-Schwelle als auch Max-Iterations)
6. Detail-Tabs zeigen alle Daten (Plan, Iteration-Timeline, Simulation, Analyse)
7. Workflow-Engine kennt `loop`-StepKind, Tests grün
8. Audit-Log-Einträge sind nachweisbar
9. TypeScript komplett sauber, alle bestehenden Tests grün
10. Default-Workflow + 6 AI-Templates sind per Seed angelegt

## Phasen / Implementierungs-Reihenfolge

1. **Mirofish-Docker + Client + Healthcheck** — isolierter Block, eigene Tests
2. **DB-Schema** (3 Tabellen + Migration)
3. **Workflow-Engine: `loop`-StepKind** mit Engine-Tests
4. **Actions + AI-Templates** (idea→story→plan→simulate→analyze→revise)
5. **Iterations-Loop verdrahten + taskQueue-Integration**
6. **API-Routes + UI (Liste, Detail, Anlage-Modal)**
7. **PDF-Export + Default-Workflow-Seed**

## Out of Scope (für diese Spec)

- Endkunden-Zugang (kommt evtl. später)
- Multi-Tenancy (Plan ist tenant-gebunden falls Tabelle `tenants` aktiv)
- Live-WebSocket-Updates (Polling reicht initial)
- Pitch-Deck-Generierung mit Folien-Bildern (Phase 7+)
- Vergleich mehrerer Pläne nebeneinander
- Export nach DOCX
