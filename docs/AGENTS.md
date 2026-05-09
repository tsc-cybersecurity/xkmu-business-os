# Agent-System — Nutzungsanleitung

Stand: 2026-05-09

KI-getriebenes Agent-System fuer xKMU. User definiert Goals, Orchestrator-LLM zerlegt sie in Steps, Worker fuehren aus, Re-Plan-Loop bis fertig. UI unter `/intern/agents`.

Inspiriert von Paperclip ([docs.paperclip.ing](https://docs.paperclip.ing/)). Spec: `docs/superpowers/specs/2026-05-08-agent-system-design.md`.

---

## Inhalt

1. [Schnellstart](#schnellstart)
2. [Konzepte](#konzepte)
3. [UI-Pages im Detail](#ui-pages-im-detail)
4. [Goals anlegen](#goals-anlegen)
5. [Tools die Agents nutzen koennen](#tools)
6. [Memory (PARA-Markdown)](#memory)
7. [Smart-Worker (`agent:*`)](#smart-worker)
8. [Recovery + Crash-Toleranz](#recovery)
9. [Manual-Triggers](#manual-triggers)
10. [Templates](#templates)
11. [Approval-Flow](#approval-flow)
12. [Notifications](#notifications)
13. [Cost-Analytics](#cost-analytics)
14. [Konfiguration / ENV](#konfiguration)
15. [Troubleshooting](#troubleshooting)

---

## Schnellstart

1. **Sidebar** → `Agents` (Bot-Icon) → Klick fuehrt aufs Dashboard
2. **Neues Goal** anlegen — entweder
   - **Aus Template** (oben im Form): Template waehlen → Variablen ausfuellen → "Goal aus Template erstellen + starten"
   - **Frei**: Title + Description + Budget eintragen → "Anlegen"
3. Goal landet auf `/intern/agents/goals/[id]` mit Status-Polling (5s). Plan + Steps werden erzeugt.
4. Wer den **DAG** sehen will: "Run-Details mit DAG anzeigen →" auf der Goal-Detail-Page
5. Bei Fertigstellung: Status `done`, ggf. Email an Admin

---

## Konzepte

| Begriff | Bedeutung |
|---|---|
| **Goal** | Die User-Aufgabe (Titel + Beschreibung + Budget). Eine Lebenszyklus-Maschine. DB: `agent_goals`. |
| **Run** | Eine Iteration eines Goals. Bei Fehler oder Reset entsteht ein neuer Run (attempt+1). DB: `agent_runs`. |
| **Step** | Ein Plan-Schritt mit Tool-Aufruf. DB: `agent_steps`. |
| **Plan** | Liste von Steps die der Orchestrator-LLM beim Goal-Start erzeugt. JSON in `agent_runs.planJson`. |
| **Re-Plan** | Nach jedem Step-Result entscheidet der Orchestrator: continue / goal_complete / pause / fail. |
| **Worker** | Fuehrt einen Step aus. Entweder deterministisch (workflow/prompt/service/memory) oder Smart (`agent:*` mit eigenem LLM-Loop). |
| **Memory** | Markdown-Files unter `data/agent-memory/` mit DB-Index + Embedding. PARA-Struktur (Projects/Areas/Resources/Archives). |
| **Tool** | Einzelne Aktion die Agent + Worker aufrufen koennen. Namespaces: `memory:`, `workflow:`, `prompt:`, `service:`, `agent:`. |
| **Definition** | Konfigurations-Profil fuer Smart-Worker (System-Prompt + erlaubte Tools + Modell). DB: `agent_definitions`. |
| **Template** | Vorlage fuer haeufige Goals mit `{{var}}`-Platzhalter. DB: `agent_goal_templates`. |
| **Goal-Status** | `draft → planning → running → done` (oder `failed`/`paused`/`cancelled`/`awaiting_approval`) |
| **Run-Status** | `planning → executing → replanning → succeeded` (oder `failed`/`cancelled`) |
| **Step-Status** | `pending → running → succeeded` (oder `failed`/`skipped`) |

---

## UI-Pages im Detail

Alle unter `/intern/agents/...`:

| Route | Zweck | Polling |
|---|---|---|
| `/intern/agents` | Dashboard: aktive Goals, 7-Tage-Cost-Sparkline, Navi-Buttons | 30s |
| `/intern/agents/goals` | Liste aller Goals mit Status-Badges + Cost | — |
| `/intern/agents/goals/new` | Goal anlegen (Template-Picker oben, freie Form unten) | — |
| `/intern/agents/goals/[id]` | Goal-Detail mit Plan, Steps, Pause/Resume/Cancel, Approval-Card wenn awaiting | 5s waehrend nicht terminal |
| `/intern/agents/runs/[id]` | Run-Detail mit DAG-Visualisierung, Cost-Breakdown, Manual-Triggers, Step-Cards | 5s waehrend nicht terminal |
| `/intern/agents/memory` | PARA-Tree + Hybrid-Search ueber Memory | — |
| `/intern/agents/memory/[scope]` | Memory-Entry: Markdown + items.yaml + Provenance | — |
| `/intern/agents/memory/[scope]/edit` | Markdown-Editor mit Live-Preview | — |
| `/intern/agents/definitions` | Smart-Worker-Definitions: Liste / Edit / Soft-Delete | — |
| `/intern/agents/definitions/new` | Neue Smart-Worker-Definition anlegen | — |
| `/intern/agents/cost` | Cost-Analytics: 3 Charts (Tag/Goal/Modell) + Range 7/30/90 | — |

---

## Goals anlegen

### Goal-Form Felder

| Feld | Bedeutung | Default |
|---|---|---|
| **Title** | Kurzer Titel des Goals | erforderlich |
| **Description** | Detail-Beschreibung — der Orchestrator liest das! | optional |
| **Execution Mode** | `cron` oder `immediate` — siehe unten | `cron` |
| **Budget Cents** | Hartes Cost-Limit in Cent. Bei Erreichen: Goal pausiert. | unbegrenzt |
| **Budget Tokens** | Hartes Token-Limit. | unbegrenzt |
| **Priority** | 1=hoch, 2=mittel, 3=niedrig | 2 |
| **Plan vor Ausfuehrung freigeben** | Bei `true` wartet Goal nach Plan-Erstellung auf Bestaetigung | `false` |

### Execution-Modes

**`cron` (Default)**: Jeder Step wird als Task in der Queue abgelegt und beim naechsten 60s-Cron-Tick ausgefuehrt. Skaliert beliebig viele parallele Goals.

**`immediate`**: Plan + Step + Replan + Step laufen inline im selben Request durch (Watchdog: 5 min). Bei fan-out (mehrere parallele Steps) oder Watchdog-Trip faellt der Run automatisch in die Cron-Lane zurueck — ohne Datenverlust. Verwendung: schnelle 1-3-Step-Goals mit ungeduldigem User.

### Goal-Lebenszyklus

```
draft  ──▶  planning  ──▶  running  ──▶  done
              │              │       └▶  failed (Budget/Worker-Fehler)
              ▼              ▼
       awaiting_approval  paused  ──▶  running (Resume)
              │              │
              ▼              ▼
            cancelled    cancelled
```

---

## Tools

Agents koennen aus 5 Tool-Namespaces waehlen. Tool-Liste wird beim Plan-Zeitpunkt automatisch aus Registry geladen — Orchestrator sieht Name + 1-Satz-Description, nicht das volle Schema.

### `memory:*` — PARA-Wissensspeicher

| Tool | Was |
|---|---|
| `memory:search` | Hybrid-Search (BM25 + Embedding) ueber alle Markdown-Files |
| `memory:read` | Liest Markdown + Frontmatter eines Scopes |
| `memory:write` | Schreibt/ueberschreibt einen Markdown-File (mit Frontmatter) |
| `memory:list` | Listet alle Memory-Entries eines PARA-Bereichs |
| `memory:supersede` | Markiert Entry als `superseded` und legt neuen mit `replaces`-Ref an |

### `workflow:*` — bestehende Workflow-Engine

Jeder aktive `workflows.trigger` wird als Tool exponiert (z.B. `workflow:lead.created`). Wrapper um `WorkflowEngine.fire(trigger, data)`.

### `prompt:*` — Prompt-Templates

Jeder aktive `aiPromptTemplates.slug` und `customAiPrompts`-Eintrag wird als Tool exponiert. Worker rendert Template mit `{{variables}}`, ruft AIService.complete.

### `service:*` — Domain-Services (whitelisted)

| Tool | Was |
|---|---|
| `service:lead-research` | Wrapper um `LeadResearchService.research(input)` |
| `service:website-scraper` | Wrapper um `WebsiteScraperService.scrapeCompanyWebsite(url)` |

Erweiterbar in `src/lib/services/agents/tools/service-adapter.ts`.

### `agent:*` — Smart-Worker (Sub-LLM mit eigenem Tool-Loop)

Jeder aktive `agent_definitions`-Eintrag mit `role='worker'` wird als Tool exponiert. Default seeded: `agent:writer`, `agent:researcher`, `agent:generalist`. Eigene anlegen unter `/intern/agents/definitions/new`.

---

## Memory

### PARA-Struktur

Markdown-Files leben unter `data/agent-memory/`:

```
data/agent-memory/
├── Projects/        — aktive zeitkritische Vorhaben
├── Areas/           — laufende Verantwortungsbereiche
├── Resources/       — Referenz-Material zum Nachschlagen
└── Archives/        — abgeschlossen/inaktiv
```

### Frontmatter

Jeder Markdown-File hat YAML-Frontmatter:

```yaml
---
title: Acme GmbH
tags: [crm, recherche]
status: active           # active | superseded | archived
source:
  runId: <uuid>          # wer hat das geschrieben
  stepId: <uuid>
  userId: <uuid>
replaces: <previous-id>  # bei supersede
---
Markdown-Body hier...
```

### items.yaml (optional)

Strukturierte Fakten als Append-Only-Liste:

```yaml
# data/agent-memory/Resources/firmen/acme/items.yaml
- id: 2026-05-09T10:30:00Z
  fact: "Mitarbeiterzahl: 250"
  source: { runId: ..., stepId: ... }
  status: active
- id: 2026-05-09T11:00:00Z
  fact: "Mitarbeiterzahl: 280"
  source: { runId: ..., stepId: ... }
  status: active
  supersedes: 2026-05-09T10:30:00Z
```

Niemals loeschen, nur supersede. Volle Provenance.

### File-Watcher

`chokidar` ueberwacht `data/agent-memory/`. Manuelle Edits werden innerhalb 5s in DB-Index uebernommen + Embedding aktualisiert. Boot startet Watcher automatisch.

### Editieren

Zwei Wege:
1. **UI**: `/intern/agents/memory/[scope]/edit` — Markdown-Editor mit Live-Preview
2. **Direkt am Filesystem**: `data/agent-memory/...md` editieren (z.B. via SSH/Volume-Mount), Watcher uebernimmt es

### Hybrid-Search

`memory:search "Acme Mitarbeiter"` liefert die Top-N Memory-Entries mit kombiniertem Score:
- BM25 (Volltext via pg_trgm)
- Vektor-Cosine (Gemini text-embedding-004, 768 Dimensionen)

Recall@1 >= 80%, Recall@3 >= 95% bei 20 Test-Fixtures.

---

## Smart-Worker

`agent:*` startet einen LLM-Sub-Loop mit eigenem System-Prompt und einer Whitelist erlaubter Tools.

### Default-Smart-Worker (Migration 021)

| Slug | Modell | Erlaubte Tools | Use-Case |
|---|---|---|---|
| `agent:writer` | gemini-2.5-flash-lite | memory:* + prompt:* | Texte schreiben/kuerzen/ueberarbeiten |
| `agent:researcher` | gemini-2.5-flash | memory:* + service:lead-research/website-scraper | Recherche-Aufgaben |
| `agent:generalist` | gemini-2.5-flash-lite | memory:* + prompt:* + workflow:* | Offene Aufgaben |

### Eigene Definition anlegen

`/intern/agents/definitions/new`:

| Feld | Bedeutung |
|---|---|
| **Slug** | eindeutiger Identifier — wird zu `agent:<slug>` |
| **Role** | `worker` (Tool-aufrufbar) oder `orchestrator` (intern) |
| **System-Prompt** | beschreibt die Rolle (max ~2000 Zeichen) |
| **Erlaubte Tools** | 1 pro Zeile, Wildcards: `memory:*`, `prompt:lead_*`, `*` |
| **Model Hint** | Gemini-Modell, default `gemini-2.5-flash-lite` |
| **Max Tokens / Call** | pro LLM-Call Limit (default 2048) |
| **Max Iterations** | wie oft der Smart-Worker maximal den Tool-Loop laeuft (default 6-8) |

### Whitelist-Wildcards

- `memory:*` — alle Memory-Tools
- `prompt:lead_*` — alle Prompt-Templates mit Slug-Praefix `lead_`
- `*` — alles (NICHT empfohlen — kein Schutz vor agent-rekursiven Aufrufen)
- `workflow:lead.created` — exakter Match
- Mehrere Patterns: ein Treffer reicht

Punkte im Pattern werden literal behandelt: `workflow:lead.created` matched genau diese, NICHT `workflow:leadXcreated`.

### Smart-Worker-Loop

```
1. LLM-Call mit User-Auftrag + Tool-Liste + bisherige History
2. LLM antwortet JSON: { toolCall: { ref, input } }  ODER  { final: "..." }
3. toolCall: Whitelist pruefen, ggf. Tool invoken, History anhaengen
4. Wiederhole bis final ODER maxIterations erreicht
```

Tool-Aufrufe ausserhalb der Whitelist werden geblockt + als History-Entry vermerkt — der Sub-LLM kann darauf reagieren und ein anderes Tool waehlen oder mit final abbrechen.

---

## Recovery

Das System ist crash-tolerant.

### Stranded-Run-Reconcile

Jeder 60s-Cron-Tick findet Runs deren `liveness_checked_at < NOW() - 10 min` und queued einen `agent_continuation`-Task. Der Handler entscheidet anhand 4 Liveness-Pfade:

1. **`queue_bound_ok`** — pending Step mit pending Task → nichts tun (Queue arbeitet)
2. **`running_step_stalled`** — running Step ohne Update >10 min → Step auf failed, replan queuen
3. **`replan_missing`** — alle Steps fertig, kein offener replan-Task → replan queuen
4. **`paused_no_path`** — alles andere → Goal pausiert + Audit-Log

### Boot-Recovery

Beim Server-Start (`src/instrumentation.ts`): findet executing-Runs deren letzter Step >5 min alt → queued continuation-Task mit priority=1. Naechster Tick (max 60s) faehrt sie wieder an. Verträgt Container-Redeploys.

### Activity-Log

Alle Recovery-Events landen in `audit_logs` mit `action='agent.run.stranded'` / `'agent.run.recovered'` / `'agent.goal.paused_by_recovery'`. Audit-Outage blockiert Recovery NICHT.

---

## Manual-Triggers

Auf der Run-Detail-Page (`/intern/agents/runs/[id]`):

| Button | Was es macht |
|---|---|
| **Re-Plan jetzt** | Queued sofortigen `agent_replan`-Task mit priority=1 (umgeht das warten auf naechsten Step) |
| **Goal jetzt ausfuehren** | Setzt `executionMode='immediate'` und queued sofortigen Replan |
| **Step `<id>` retry** | Setzt failed Step auf pending zurueck + queued neuen Step-Run-Task |

Buttons erscheinen nur wenn relevant (z.B. Step-Retry nur wenn failed Steps existieren).

---

## Templates

3 Default-Templates sind geseedet (Migration 022):

### `firma-recherchieren`

- **Variablen**: `firmenName`
- **Title-Template**: `Recherche: {{firmenName}}`
- **Was es tut**: Recherche via service:lead-research + service:website-scraper, Memo unter `Resources/firmen/{{firmenName}}.md`
- **Default-Budget**: 500 Cent

### `memo-schreiben`

- **Variablen**: `thema`
- **Title-Template**: `Memo: {{thema}}`
- **Was es tut**: memory:search nach vorhandenem Material, agent:writer fuer Fliesstext (max 500 Worte), Save unter `Projects/memos/{{thema}}.md`
- **Default-Budget**: 300 Cent

### `newsletter-analysieren`

- **Variablen**: `quelleUrl`
- **Title-Template**: `Newsletter-Analyse: {{quelleUrl}}`
- **Was es tut**: service:website-scraper, Top-5-Punkte extrahieren, Save unter `Resources/newsletter/`
- **Default-Budget**: 300 Cent

### Eigene Templates

Aktuell nur via SQL pflegbar (kein UI-Editor — siehe Out-of-scope):

```sql
INSERT INTO agent_goal_templates
  (slug, name, description, title_template, description_template, required_variables, default_budget_cents)
VALUES
  ('mein-template', 'Mein Template', 'Beschreibung',
   'Titel mit {{var1}}', 'Detail mit {{var1}} und {{var2}}',
   ARRAY['var1', 'var2'], 200);
```

Tabelle: `agent_goal_templates` in `src/lib/db/schema.ts:3982`.

---

## Approval-Flow

Beim Goal-Anlegen mit `requirePlanApproval=true`:

1. User legt Goal an → Plan wird erzeugt → Goal-Status `awaiting_approval` (NICHT running)
2. Steps werden in DB persistiert (User sieht Vorschau!), aber NICHT gequeued
3. Goal-Detail-Page zeigt gelbe **"Plan-Freigabe erforderlich"-Card** mit zwei Buttons:
   - **Plan freigeben** → Goal auf `running`, ready Steps werden gequeued
   - **Ablehnen** → Goal auf `cancelled` (nach Bestaetigung)

Use-Case: teure Goals (hohes Budget) oder kritische Aktionen, wo User vor Ausfuehrung den Plan begutachten will.

---

## Notifications

Bei terminalem Goal-State (`done` oder `failed`) sendet `AgentNotificationService` automatisch eine Email an den Admin. Empfaenger-Aufloesung (in dieser Reihenfolge):

1. Erster aktiver Admin-User aus `users`-Tabelle
2. `ADMIN_EMAIL`-ENV
3. `SEED_ADMIN_EMAIL`-ENV
4. Default-Email-Account selbst (sendet sich selbst)

Email-Inhalt: Subject `"Agent-Goal abgeschlossen: <title>"` (oder `"fehlgeschlagen"`), Body mit goalId, status, runId, summary, Link zur Goal-Detail-Page.

Notification-Fehler werden geschluckt — Goal-Done blockiert nie an Email-Outage.

**Voraussetzung**: `EMAIL_USER`+`EMAIL_PASSWORD`-ENV oder default-Email-Account in `email_accounts`-Tabelle. Sonst nur Logger-Warning, kein Versand.

---

## Cost-Analytics

`/intern/agents/cost` zeigt drei Charts:

| Chart | Was |
|---|---|
| **Kosten pro Tag** | Bar-Chart, Cents pro Tag im Range |
| **Top-10 Goals nach Kosten** | Horizontal-Bar, sortiert |
| **Modell-Verteilung** | Pie-Chart, Calls pro Provider/Model |

Range-Toggle: 7 / 30 / 90 Tage. Aggregation pre-computed in DB (kein Roh-Event-Transfer).

**WICHTIG**: heute ist `cost_cents = 0` fuer LLM-Calls — die Pricing-Tabelle pro Provider/Modell fehlt noch (Out-of-scope-Item). Token-Charts sind aussagefaehig, Cents-Charts werden 0 zeigen bis das wired ist.

### Hard-Stop pro Goal

`agent_goals.budgetCents` und `budgetTokens` sind hartes Limit. WorkerService und OrchestratorService rufen vor jedem LLM-Call `CostTrackerService.checkBudget(goalId)`. Bei `exceeded`:
- Goal auf `paused`
- Activity-Log-Event `agent.budget.exceeded`
- Kein weiterer LLM-Call

User kann Budget hochsetzen + Resume.

---

## Konfiguration

### ENV-Variablen

| ENV | Default | Was |
|---|---|---|
| `DATABASE_URL` | — | Postgres mit pgvector + pg_trgm Extensions |
| `GOOGLE_AI_API_KEY` | — | fuer Gemini-LLM + Embeddings |
| `AGENT_MEMORY_DIR` | `./data/agent-memory` | Wurzel der PARA-Markdown-Files |
| `AGENT_RECALL_USE_REAL_EMBEDDINGS` | unset | bei `1` Recall-Test gegen echte Embeddings (Cost!) |
| `EMAIL_USER` / `EMAIL_PASSWORD` | — | fuer Notification-Email |
| `ADMIN_EMAIL` | — | Empfaenger-Fallback |
| `FORCE_SCHEMA_SYNC` | unset | umgeht Schema-Hash-Gate beim Boot |
| `FORCE_SEED_CHECK` | unset | umgeht Seed-Hash-Gate beim Boot |

### Migrationen

Auto-Migration laeuft beim Boot via `runPendingMigrations` in `src/instrumentation.ts`. Agent-System-Migrationen:

| Migration | Was |
|---|---|
| `020_agent_system_phase1.sql` | pgvector + pg_trgm + 6 agent_*-Tabellen + task_queue-Index |
| `021_agent_definitions_seed.sql` | 3 Default-Smart-Worker (writer/researcher/generalist) |
| `022_agent_goal_templates.sql` | 3 Default-Templates (firma-recherchieren/memo-schreiben/newsletter-analysieren) |
| `023_agent_cost_events_index.sql` | Performance-Index auf agent_cost_events.occurred_at DESC |

### Volume-Mount fuer Memory

`data/agent-memory/` MUSS persistent sein (Container-Restart darf Memory nicht verlieren). Fuer Docker:

```yaml
volumes:
  - ./data/agent-memory:/app/data/agent-memory
```

---

## Troubleshooting

### "Tool-Liste ist leer" beim Plan

ToolRegistry ist nicht initialisiert. Pruefe Boot-Log nach `[instrumentation] ToolRegistry konnte nicht initialisiert werden`. Restart Container.

### "Goal stuck on planning"

Pruefe `agent_runs.lastError` und Audit-Log:

```sql
SELECT lastError FROM agent_runs WHERE goalId = '<uuid>' ORDER BY createdAt DESC LIMIT 1;
SELECT * FROM audit_logs WHERE entity_id = '<run-uuid>' ORDER BY created_at DESC LIMIT 10;
```

Haeufig: LLM-JSON-Parse-Fehler. Modell hat invalide JSON geliefert. "Re-Plan jetzt"-Button in Run-Detail klicken.

### "Step laeuft endlos"

Watchdog greift nur in Immediate-Lane. Cron-Steps haben kein Soft-Timeout. Wenn ein `service:*`-Tool haengt: Step manuell auf failed setzen via SQL, dann "Re-Plan jetzt".

```sql
UPDATE agent_steps SET status='failed', error='manual: hung'
  WHERE id='<step-uuid>';
```

### "Memory-Editor speichert nicht"

PATCH-Endpoint `/api/agents/memory?scope=...` braucht Session. Pruefe Browser-Console + Network-Tab. Bei 500-Errors: `MemoryService.write` koennte am Watcher-Loop scheitern (selbst-getriggerter Reload). Logger-Output anschauen.

### "Agent-Pages nicht in Sidebar sichtbar"

Sidebar-Eintrag ist hartkodiert ohne `requiredModule`-Gate. Wenn du es nicht siehst: Browser-Cache leeren oder `pnpm dev`-Hot-Reload anstossen.

### "Notification kommt nicht an"

`EMAIL_USER`+`EMAIL_PASSWORD`-ENV fehlen oder default-Email-Account ist inaktiv. Logger-Warning `AgentNotification: kein Admin-Empfaenger ermittelbar` im Boot-Log.

---

## Code-Pfade

| Modul | Pfad |
|---|---|
| Schema | `src/lib/db/schema.ts` (agent_*, ab Zeile ~3825) |
| OrchestratorService | `src/lib/services/agents/orchestrator.service.ts` |
| WorkerService | `src/lib/services/agents/worker.service.ts` |
| SmartWorkerService | `src/lib/services/agents/smart-worker.service.ts` |
| GoalService | `src/lib/services/agents/goal.service.ts` |
| MemoryService | `src/lib/services/agents/memory.service.ts` |
| TemplateService | `src/lib/services/agents/template.service.ts` |
| NotificationService | `src/lib/services/agents/notification.service.ts` |
| CostTrackerService | `src/lib/services/agents/cost-tracker.service.ts` |
| Recovery | `src/lib/services/agents/recovery/{reconcile,continuation,boot-recovery,activity-log}.ts` |
| Tool-Adapter | `src/lib/services/agents/tools/{memory,workflow,prompt,service,agent}-adapter.ts` |
| Tool-Registry | `src/lib/services/agents/tool-registry.ts` |
| Cron-Tick-Hook | `src/lib/services/cron.service.ts` (`processAgentTaskQueue`, `reconcileStrandedRuns`) |
| Boot-Hook | `src/instrumentation.ts` |
| API-Routes | `src/app/api/agents/...` |
| UI-Pages | `src/app/intern/(dashboard)/agents/...` |
| UI-Components | `src/components/agents/...` |
| Spec | `docs/superpowers/specs/2026-05-08-agent-system-design.md` |
| Plans (Phase 1-8) | `docs/superpowers/plans/2026-05-08-agents-phase-{1..8}-*.md` |

---

## Bekannte Out-of-scope-Punkte

- **Pricing-Tabelle** pro Provider/Modell — heute `costCents=0` fuer LLM-Calls
- **contextRefs Zod-Schema** mit `memory://`-Regex — heute generisches `string[]`
- **Live-WebSocket-Events** — heute Polling (5s/30s)
- **Approval-Token-Email** — Approval nur via UI, kein magischer Email-Link
- **Template-Editor in UI** — Templates nur via SQL/Migration pflegbar
- **Multi-Provider-Fallback** — bei Outage muss man manuell den `modelHint` in Definitions umstellen
