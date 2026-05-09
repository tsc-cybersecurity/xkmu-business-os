# Agent-System Design

**Datum:** 2026-05-08
**Status:** Design (in Brainstorming finalisiert, noch nicht implementiert)
**Autor:** Tino Stenzel + Claude
**Inspiration:** Paperclip (paperclipai/paperclip) — Heartbeat-Pattern, Liveness-Contract, PARA-Memory

---

## 1. Ziel

Ein KI-getriebenes Agenten-System auf der xKMU-Business-OS, das beliebige Ziele entgegennimmt, sie autonom in Aufgaben zerlegt, von Workern abarbeiten lässt und auf Ergebnisse reagiert (Re-Plan-Loop). Bestehende Workflows und KI-Prompts werden als Tools wiederverwendet. Memory wird PARA-strukturiert lokal als Markdown-Files gehalten und Token-sparsam nur bei Bedarf in den LLM-Kontext geladen.

**Primäre Ziele:**
1. **AI-driven** — User definiert ein Ziel, System plant und exekutiert ohne weitere Intervention
2. **Token-/kostensparend** — Orchestrator sieht nie Roh-Inhalte, nur Refs und Summaries
3. **Modular extrahierbar** — kann später als eigenständiger Service betrieben werden
4. **Crash-resilient** — überlebt Pod-Restarts ohne Datenverlust
5. **Bestand wiederverwenden** — Workflow-Engine, AI-Services, Prompt-Templates als Tools

**Nicht-Ziele (out of scope):**
- Multi-User-Approval-Chains (nur einfacher Approval-Toggle)
- Multi-Tenant-Isolation (Single-Tenant per User-Memory)
- Eigener Agent-Marketplace (kein Clipmart-Äquivalent)
- Echtzeit-Streaming-UI (Live-Events reichen, kein Token-Stream)

---

## 2. Architektur-Übersicht

### 2.1 Bounded Context

Alle neuen Module unter `src/lib/services/agents/`, eigene Tabellen mit Prefix `agent_*`. Kommunikation zu anderen Modulen ausschließlich über klar definierte Adapter:
- `WorkflowToolAdapter` — wraps `WorkflowEngine.fire`
- `AIPromptToolAdapter` — wraps `aiPromptTemplates` + `customAiPrompts` Aufrufe
- `ServiceToolAdapter` — wraps whitelisted Domain-Services (Lead-Research etc.)
- `MemoryAdapter` — File-System ↔ DB-Index

So bleibt das Modul später extrahierbar als eigener Service.

### 2.2 Komponenten

```
                        ┌──────────────────────────────┐
                        │   Goal / Aufgabe (User UI)   │
                        └──────────────┬───────────────┘
                                       ▼
       ┌──────────────────────────────────────────────────────┐
       │              ORCHESTRATOR (Hauptagent)               │
       │   plan() → execute() → react() → (re-plan loop)      │
       │   1× LLM-Call zum Planen + 1× pro React-Phase        │
       └──┬─────────────────┬──────────────────┬──────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
   ┌────────────┐    ┌────────────┐     ┌──────────────┐
   │ Smart-     │    │Det. Worker │     │  Tool: ruf   │
   │ Worker     │    │ (Function) │     │  Workflow    │
   │ (LLM+Tools)│    │            │     │  oder AI-Svc │
   └────┬───────┘    └─────┬──────┘     └──────┬───────┘
        │                  │                   │
        └─────── Result-Persist + Cost-Event ──┘
                            │
                            ▼
                ┌─────────────────────────┐
                │  Memory (Hybrid)        │
                │   DB Index + GIN/Vector │
                │   PARA Markdown on Disk │
                └─────────────────────────┘

  ↑ Angetrieben vom bestehenden /api/cron/tick (1×/min)
    + taskQueue als Wakeup-Queue
```

**Zwei Lebewesen-Klassen:**
- **Orchestrator (Hauptagent)** — ein einzelner LLM-Call mit System-Prompt, der einen `agent_run` schritt-weise vorantreibt. Nur "wach" während er denkt, persistiert State zwischen Iterationen.
- **Worker** — entweder deterministische Function (Wrapper um `WorkflowEngine.fire` / AI-Service / Tool) oder Smart-Worker (eigener LLM-Call mit eingeschränktem Tool-Set für offene Aufgaben).

**Token-Spar-Prinzip durchgängig:** Orchestrator sieht nie Roh-Inhalte (Markdown-Files, große Outputs). Er sieht IDs/Pfade/Summary. Konkrete Inhalte gehen direkt vom Memory zum jeweiligen Worker, nie über den Orchestrator-Kontext.

### 2.3 Dual-Mode Execution

**Default-Pfad: Cron-Lane** — alles läuft via `taskQueue` + `/api/cron/tick`. Hart im Code als Standard, jeder Step ein Tick.

**Override: Immediate-Lane** — explizit aktivierbar:

1. **Auf Goal-Ebene** (User-Einstellung):
   ```
   executionMode: "cron" (default) | "immediate"
   ```
2. **Pro Worker-Ergebnis** (Orchestrator-Entscheidung im Re-Plan):
   ```
   nextStepMode: "cron" (default) | "immediate"
   ```

`immediate` = Step-Folge läuft inline im selben Node-Prozess durch, ohne Queue-Roundtrip. Watchdog-Deadline (5 min konfigurierbar). Watchdog-Trip → Auto-Fallback auf cron, Step persistiert, Inline-Loop endet sauber.

**Persistenz-Garantie:** Egal welche Lane, **nach jedem Step DB-Snapshot des Run-States**. Crash in Immediate-Lane → nächster Cron-Tick sieht stranded `running`-Row und re-queued via Recovery.

---

## 3. Datenmodell

### 3.1 Re-Use (kein neues Schema nötig)

| Tabelle | Verwendung |
|---|---|
| `taskQueue` | Neue `type`-Werte: `agent_step_run` (`referenceType='agent_step'`, `referenceId=<step.id>`), `agent_replan` (`referenceType='agent_run'`, `referenceId=<run.id>`), `agent_continuation` (`referenceType='agent_run'`, `referenceId=<run.id>`). Payload trägt zusätzliche Daten je nach Typ. |
| `aiPromptTemplates` + `customAiPrompts` | Quelle für Prompt-Tools (Namespace `prompt:*`), nichts ändern. |
| `workflows` | Über Tool-Adapter aufrufbar (Namespace `workflow:*`), nichts ändern. |

### 3.2 Neue Tabellen

Alle Prefix `agent_*`, leicht extrahierbar.

#### `agent_goals` — die User-Aufgabe

```ts
{
  id: uuid PK,
  title: text NOT NULL,
  description: text,
  executionMode: text DEFAULT 'cron',         // 'cron' | 'immediate'
  status: text DEFAULT 'draft',                // 'draft'|'planning'|'running'|'paused'|'done'|'failed'|'cancelled'|'awaiting_approval'
  budgetTokens: integer,
  budgetCents: integer,
  spentTokens: integer DEFAULT 0,
  spentCents: integer DEFAULT 0,
  priority: integer DEFAULT 2,                  // 1=hoch, 2=mittel, 3=niedrig
  requirePlanApproval: boolean DEFAULT false,
  createdByUserId: uuid REFERENCES users.id,
  metadata: jsonb DEFAULT '{}',
  createdAt: timestamptz DEFAULT NOW(),
  completedAt: timestamptz,
  updatedAt: timestamptz DEFAULT NOW()
}

INDEX (status, priority, createdAt)
INDEX (createdByUserId, status)
```

#### `agent_runs` — Run-Iteration eines Goals

```ts
{
  id: uuid PK,
  goalId: uuid REFERENCES agent_goals.id,
  attempt: integer DEFAULT 1,                   // 1, 2, 3 ... bei neuen Runs (nach failed/reset)
  status: text DEFAULT 'planning',              // 'planning'|'executing'|'replanning'|'succeeded'|'failed'|'cancelled'
  planJson: jsonb,                              // [{stepKey, workerType, deps, contextRefs, ...}]
  contextSnapshotJson: jsonb,                   // Memory-Refs die Orchestrator initial gewählt hat
  startedAt: timestamptz DEFAULT NOW(),
  finishedAt: timestamptz,
  inputTokens: bigint DEFAULT 0,
  outputTokens: bigint DEFAULT 0,
  cachedInputTokens: bigint DEFAULT 0,
  costCents: integer DEFAULT 0,
  livenessCheckedAt: timestamptz,
  lastError: text,
  createdAt: timestamptz DEFAULT NOW(),
  updatedAt: timestamptz DEFAULT NOW()
}

INDEX (goalId, status)
INDEX (status, livenessCheckedAt)              // Stranded-Reconcile-Query
```

`livenessCheckedAt` ist bewusst getrennt von einem `lastHeartbeatAt` (Schema-light) — wird nur vom Reconcile-Loop geschrieben, vermeidet Lock-Contention.

#### `agent_steps` — die einzelnen Plan-Schritte

```ts
{
  id: uuid PK,
  runId: uuid REFERENCES agent_runs.id,
  goalId: uuid REFERENCES agent_goals.id,
  stepKey: text NOT NULL,                       // vom Orchestrator vergeben
  workerType: text NOT NULL,                    // 'workflow:lead.created' | 'prompt:research_company' | 'service:lead-research' | 'agent:writer'
  config: jsonb DEFAULT '{}',                   // Parameter
  contextRefs: jsonb DEFAULT '[]',              // ['memory://projects/acme/summary.md', ...]
  dependsOnStepKeys: text[] DEFAULT '{}',
  status: text DEFAULT 'pending',               // 'pending'|'running'|'succeeded'|'failed'|'skipped'
  startedAt: timestamptz,
  finishedAt: timestamptz,
  resultJson: jsonb,
  resultSummary: text,                          // max 500 chars für Re-Plan-Kontext
  resultDocumentId: uuid,                       // Verweis auf agent_memory_entries falls Output groß
  inputTokens: bigint DEFAULT 0,
  outputTokens: bigint DEFAULT 0,
  costCents: integer DEFAULT 0,
  error: text,
  taskQueueId: uuid REFERENCES task_queue.id,   // aktueller queued Task (cron-mode)
  createdAt: timestamptz DEFAULT NOW(),
  updatedAt: timestamptz DEFAULT NOW()
}

UNIQUE (runId, stepKey)
INDEX (runId, status)
INDEX (status, taskQueueId)
```

#### `agent_definitions` — Worker-/Orchestrator-Profile

```ts
{
  id: uuid PK,
  slug: text UNIQUE NOT NULL,                   // 'orchestrator-default', 'writer', 'researcher'
  role: text NOT NULL,                          // 'orchestrator' | 'worker'
  name: text,
  systemPrompt: text NOT NULL,
  allowedTools: text[] NOT NULL,                // ['memory.*', 'prompt:lead_*', 'workflow:*', 'service:lead-research']
  modelHint: text,                              // 'gemini-2.0-flash' | 'gpt-4o-mini' etc.
  maxTokensPerCall: integer DEFAULT 4096,
  maxIterations: integer DEFAULT 8,             // pro Run-Lifecycle, Orchestrator-Specific
  isActive: boolean DEFAULT true,
  metadata: jsonb DEFAULT '{}',
  createdAt: timestamptz DEFAULT NOW(),
  updatedAt: timestamptz DEFAULT NOW()
}

INDEX (role, isActive)
```

#### `agent_memory_entries` — Index für Markdown-Files

```ts
{
  id: uuid PK,
  para: text NOT NULL,                          // 'projects'|'areas'|'resources'|'archives'
  scope: text NOT NULL,                         // 'projects/acme', 'areas/people/john'
  filePath: text NOT NULL,                      // absolute Path
  title: text,
  summary: text,                                // aus Frontmatter, max 200 Wörter
  tags: text[] DEFAULT '{}',
  contentHash: text NOT NULL,                   // SHA-256 für Change-Detection
  contentTrgm: text,                            // GIN trgm für FTS
  embedding: vector(768),                       // pgvector — Gemini text-embedding-004 = 768 dim
  sourceRunId: uuid REFERENCES agent_runs.id,
  sourceStepId: uuid REFERENCES agent_steps.id,
  sourceUserId: uuid REFERENCES users.id,
  status: text DEFAULT 'active',                // 'active'|'superseded'|'archived'
  supersededByEntryId: uuid REFERENCES agent_memory_entries.id,
  createdAt: timestamptz DEFAULT NOW(),
  updatedAt: timestamptz DEFAULT NOW()
}

UNIQUE (filePath)
INDEX (scope, status)
INDEX USING gin (contentTrgm gin_trgm_ops)
INDEX USING ivfflat (embedding vector_cosine_ops)
```

Bei Embed-Provider-Wechsel passt `vector(768)` → `vector(1536)` an (OpenAI text-embedding-3-small) per Migration.

#### `agent_cost_events` — pro LLM-Call ein Event

```ts
{
  id: uuid PK,
  runId: uuid REFERENCES agent_runs.id,
  stepId: uuid REFERENCES agent_steps.id,
  goalId: uuid REFERENCES agent_goals.id,
  provider: text NOT NULL,                      // 'gemini'|'openai'|'openrouter'|'kimi'
  model: text NOT NULL,
  callRole: text NOT NULL,                      // 'orchestrator_plan'|'orchestrator_replan'|'smart_worker'|'memory_embed'|'memory_compact'
  inputTokens: integer DEFAULT 0,
  cachedInputTokens: integer DEFAULT 0,
  outputTokens: integer DEFAULT 0,
  costCents: integer NOT NULL,
  occurredAt: timestamptz NOT NULL DEFAULT NOW()
}

INDEX (goalId, occurredAt)
INDEX (runId, occurredAt)
INDEX (provider, occurredAt)
```

### 3.3 Was bewusst nicht eigene Tabelle ist

- **Tools** — Tool-Registry lebt im Code (`tool-registry.ts`), Werte in `agent_definitions.allowedTools`. Tools sind Code, nicht Daten.
- **Detail-Pro-Step-Logs** — Detail-Logs gehen ins File-System (`/data/agent-memory/_runs/<runId>/`) wenn überhaupt, nicht in DB.

### 3.4 Audit-Anbindung

Goal/Run/Step-Statuswechsel + Pause/Cancel laufen über den geplanten Audit-Layer mit, kein Doppel-Tracking. Activity-Action-Naming: `agent.goal.created`, `agent.run.started`, `agent.step.failed` etc.

### 3.5 Indexvorschlag für `task_queue`

```sql
CREATE INDEX IF NOT EXISTS idx_task_queue_type_status_scheduled
  ON task_queue (type, status, scheduledFor);
```

Beschleunigt den agent-spezifischen Tick-Query (siehe Sektion 5.2).

---

## 4. Memory-System (PARA + Index + Provenance)

### 4.1 Disk-Layout

Unter `/data/agent-memory/` (Volume-Mount in Coolify):

```
/data/agent-memory/
  projects/                 ← aktive Goals/Initiativen mit Deadline
    acme-leadgen/
      summary.md            ← Frontmatter + Kurzkontext (~200 Wörter)
      items.yaml            ← atomare Fakten als YAML-Liste
      docs/                 ← optionale Anhänge
  areas/                    ← laufende Verantwortlichkeiten
    people/<name>/
    companies/<name>/
    topics/<topic>/
  resources/                ← Referenzwissen
    <topic>/
  archives/                 ← inaktiv (verschoben aus den 3 anderen)
  _runs/                    ← optional, transient: Detail-Logs (auto-purge nach 30 Tagen)
  index.md                  ← Top-Level-Übersicht (auto-generiert)
```

### 4.2 Frontmatter-Schema (`summary.md`)

```yaml
---
id: <uuid>                  # = agent_memory_entries.id
title: "Acme Lead-Pipeline"
para: projects
scope: projects/acme-leadgen
tags: [crm, leadgen, q2-2026]
created: 2026-05-08
updated: 2026-05-08
status: active              # active | superseded | archived
sourceRunId: <uuid>         # falls von Agent erzeugt
---
# Acme Lead-Pipeline
... markdown body ...
```

### 4.3 `items.yaml`-Schema (atomare Fakten, never-delete)

```yaml
- id: f-001
  fact: "Hauptansprechpartner ist Lisa Weber (CMO)"
  source: "agent_run_<uuid> step research-acme"
  confidence: 0.9
  recordedAt: 2026-05-08
  status: active

- id: f-002
  fact: "Hauptansprechpartner ist Tom Schmidt (CEO)"
  source: "user_input 2026-05-15"
  status: superseded
  supersededBy: f-003
  supersededAt: 2026-05-20

- id: f-003
  fact: "Hauptansprechpartner ist Max Müller (CEO seit 2026-05-15)"
  source: "agent_run_<uuid>"
  status: active
```

### 4.4 Sync-Mechanik (Disk ↔ DB-Index)

Drei Update-Pfade, alle durch `MemoryService`:

| Pfad | Wer schreibt? | Trigger |
|---|---|---|
| Agent schreibt | `MemoryService.write(scope, body)` | Worker oder Orchestrator als Tool-Call |
| User editiert in UI | UI → `MemoryService.write(...)` | User-Action |
| User editiert direkt am File | File-Watcher (`chokidar`) → Re-Index | File-System-Event |

Re-Index-Pfad:
1. Lese File, parse Frontmatter
2. Berechne `contentHash` (SHA-256)
3. Wenn `contentHash` unverändert → return (skip)
4. Generiere Embedding (Gemini text-embedding-004 default)
5. Upsert in `agent_memory_entries` per `id` aus Frontmatter
6. Optional: Commit zu git wenn `/data/agent-memory/` ein Git-Repo ist

### 4.5 Memory-Tools

```ts
memory.search(query: string, scope?: string, limit=5)
  → [{id, scope, title, summary, snippet, score}, ...]
    // Hybrid: BM25 via pg_trgm + Vector-Cosine, scores merged

memory.read(idOrPath: string)
  → { id, title, body, items: [...] }

memory.write(scope: string, body: string, items?: Fact[])
  → { id, path }
    // Atomic: File-Write + DB-Upsert + Embedding-Refresh

memory.supersede(itemId: string, newFact: string, source: string)
  → updated items.yaml

memory.list(para: string, limit=20)
  → [{id, scope, title, summary}, ...]
```

### 4.6 Was Orchestrator IM KONTEXT sieht

- Goal-Title + -Description
- Aktuelle Plan-Liste (`stepKey`, `workerType`, `status`, `resultSummary` — nicht `resultJson`)
- **Refs** zu Memory: `["memory://projects/acme-leadgen", ...]` als Strings
- Tool-Definitions (knapp, aus `agent_definitions.allowedTools`)

### 4.7 Was Orchestrator NIE sieht (außer er nutzt explizit `memory.read`)

- Volle Markdown-Bodies
- Volle Worker-Output-`resultJson`
- Detail-Run-Logs

So bleibt Orchestrator-LLM-Call typischerweise <2k Tokens pro Iteration.

### 4.8 Worker-Kontext

Der Worker bekommt:
- Aufgabenbeschreibung (vom Orchestrator-Plan)
- Vom Orchestrator gewählte Refs **bereits als Inhalt expandiert** durch `MemoryService.expandRefs(refs)` beim Worker-Start
- Tool-Set zum Nachladen falls nötig

---

## 5. Tool-Library + Kontext-Optimierung

### 5.1 Tool-Kategorien

Vier Quellen, alle erreichbar über einen Tool-Adapter mit Namespace-Schema `<category>:<name>`:

| Namespace | Was | Aufwand pro Tool |
|---|---|---|
| `memory:*` | `memory.search`, `read`, `write`, `supersede`, `list` | bereits in Sektion 4 definiert |
| `workflow:*` | jedes aktive `workflows.trigger` als Tool (z.B. `workflow:lead.created`) | dünner Wrapper um `WorkflowEngine.fire(trigger, data)` |
| `prompt:*` | jeder `aiPromptTemplates.slug` und `customAiPrompts.slug` als Tool | Wrapper baut User-Prompt aus Template + Variablen, ruft `AIService.generate` |
| `service:*` | direkte Domain-Services (z.B. `service:lead-research`, `service:website-scraper`) | Adapter pro Service, nur whitelisted |
| `agent:*` | Sub-Agent-Aufruf (Smart-Worker) — `agent:writer`, `agent:researcher` | startet rekursiv Worker-Run |

**Tool-Discovery:** Orchestrator sieht beim Plan-Schritt nur eine Liste verfügbarer Tools (Name + 1-Satz-Description), nicht die vollen Schemas. Schemas werden erst bei Worker-Start mitgegeben.

**Tool-Whitelisting:** `agent_definitions.allowedTools` mit Wildcards: `["memory.*", "prompt:lead_*", "workflow:*", "service:lead-research"]`.

### 5.2 Kontext-Optimierungs-Mechaniken

**1. Prompt-Caching** — System-Prompt + Tool-Definitions + statische Memory-Refs cachen (Anthropic `cache_control: ephemeral` / Gemini Context Caching). Spart 75-90% Input-Token-Kosten bei Re-Plan-Iterationen.

**2. Sliding-Summary für Step-History** — im Re-Plan-Kontext nur die letzten N Steps (default 5) mit `resultSummary`. Ältere Steps werden zu Summary-Block kollabiert (max 200 Token) via `MemoryService.compactRunHistory(runId, keepLast=5)` mit Mini-Modell.

**3. Result-Größen-Cutoff** — Worker-Output > 2 KB → `resultJson` in `agent_memory_entries` (oder `_runs/<runId>/<stepKey>.json`), nur `resultSummary` (max 500 Zeichen) inline. Orchestrator sieht `result: { ref: "memory://_runs/...", summary: "..." }`.

**4. Strukturierte Outputs erzwingen** — Orchestrator + Smart-Worker via JSON-Mode/Tool-Use. Schema: `{ plan: [...], reasoning: "max 2 Sätze" }`.

**5. Selective Memory-Expansion** — Im Plan gibt Orchestrator pro Step `contextRefs`. Erst beim Worker-Start expandiert `MemoryService.expandRefs(refs)` zu echten Inhalten — Orchestrator hat das nie im Kontext gesehen.

**6. Modell-Routing pro Call-Role** — `agent_definitions.modelHint` + cost-aware-pipeline:
- `orchestrator_plan` → starkes Modell (1× pro Run)
- `orchestrator_replan` → mittleres
- `smart_worker` → je nach Aufgabe
- `memory_compact` / `memory_embed` → Mini-Modell

Konfigurierbar pro `agent_definition`, nicht hartkodiert.

### 5.3 Cost-Tracking-Integration

Jeder LLM-Call schreibt nach Antwort einen `agent_cost_events`-Row. Pro Tick prüft Orchestrator-Service:

```ts
if (run.spentCents >= goal.budgetCents || run.spentTokens >= goal.budgetTokens) {
  pauseRun(runId, "budget_exceeded")
  emit("agent.budget.exceeded", { goalId, runId })
}
```

Hard-Stop. User kann via UI Budget hochsetzen + Resume.

### 5.4 Output-zurück-zu-Memory

Nach jedem Step deterministischer Klassifizierer:
- Step war `service:*` → Output bleibt in `agent_steps.resultJson` (transient)
- Step war `prompt:*` oder `agent:*` mit > 1 KB Output **und** Goal noch active → Auto-Persist in `_runs/<runId>/`
- Step erzeugt explizit `memoryWrite: { para, scope, body }` in seinem Result → permanentes PARA-Entry

---

## 6. Run-Lifecycle, Tick-Handler, Recovery

### 6.1 Goal-State-Machine

```
   draft ───▶ planning ───▶ running ─┬──▶ done
                  │           │      │
                  │           ▼      └──▶ failed (Budget/Worker-Fehler)
                  │         paused ──▶ running (Resume)
                  ▼           │
              cancelled ◀─────┘
```

`awaiting_approval` als optionaler Zwischenstatus zwischen `planning` und `running` wenn `requirePlanApproval=true`.

### 6.2 Run-State-Machine

`planning → executing → replanning → executing → ... → succeeded/failed/cancelled`

Re-Plan-Trigger erzeugt **keinen** neuen Run. Neuer Run **nur** bei: User-Reset, Auto-Recovery nach failed Run, oder explizite "Try-Again".

### 6.3 Step-Lifecycle

```
pending ──▶ running ──┬──▶ succeeded
                      ├──▶ failed
                      └──▶ skipped
```

Jeder Step-Wechsel = atomic UPDATE + Activity-Log-Entry + Live-Event.

### 6.4 Der zentrale Tick-Handler

Erweitert `CronService.tick()`:

```ts
async tick() {
  // ... bestehende Tick-Logik ...
  await processAgentTaskQueue()
  await reconcileStrandedRuns()      // alle 5 min
}

async processAgentTaskQueue() {
  const tasks = await db.execute(`
    UPDATE task_queue SET status='running', executed_at=NOW()
    WHERE id IN (
      SELECT id FROM task_queue
      WHERE type IN ('agent_step_run','agent_replan','agent_continuation')
        AND status='pending'
        AND scheduled_for <= NOW()
      ORDER BY priority ASC, scheduled_for ASC
      LIMIT 10
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
  `);
  await Promise.allSettled(tasks.map(handleAgentTask));
}
```

`FOR UPDATE SKIP LOCKED` verhindert Doppelausführung und ermöglicht spätere Parallel-Worker ohne Code-Änderung.

### 6.5 Drei Task-Handler

| Task-Type | Was passiert |
|---|---|
| `agent_step_run` | Lade Step, expandiere `contextRefs`, rufe Worker, persistiere Result, schreibe Cost-Event, queue `agent_replan` |
| `agent_replan` | Lade Run + komprimierte History, rufe Orchestrator-LLM, parse Decision (`goalComplete` / `nextSteps` / `pause` / `fail`). Bei `nextSteps` → erzeuge `agent_steps` + queue `agent_step_run` |
| `agent_continuation` | Recovery-Task. Liest stranded Run, entscheidet Continuation/Re-Plan/Pause |

### 6.6 Immediate-Lane (Inline-Path)

```ts
async function runImmediate(runId, startStepId, deadline = Date.now() + 5*60_000) {
  let nextStepId = startStepId;
  while (nextStepId && Date.now() < deadline) {
    await handleAgentTask({ type: 'agent_step_run', stepId: nextStepId });
    const replanResult = await handleAgentTask({ type: 'agent_replan', runId });
    if (replanResult.nextStepMode === 'immediate' && replanResult.nextStepIds?.length === 1) {
      nextStepId = replanResult.nextStepIds[0];
    } else {
      break;
    }
  }
  if (Date.now() >= deadline) {
    logger.warn('Immediate lane deadline reached', { runId });
    // agent_replan hat bereits den nächsten Task gequeued
  }
}
```

- Watchdog-Deadline (5 min, konfigurierbar)
- Persistenz nach jedem Step
- Fan-out (parallele Steps) wechselt zurück in Cron-Lane

### 6.7 Stranded-Run-Reconcile (Liveness-Contract)

Alle 5 min während `tick()`:

```sql
SELECT id, goal_id FROM agent_runs
WHERE status IN ('executing','planning','replanning')
  AND COALESCE(liveness_checked_at, started_at) < NOW() - INTERVAL '10 minutes';
```

Für jeden Treffer Liveness-Pfade prüfen:
1. Pending Step mit zugehörigem pending `task_queue`-Row → ok, queue-bound
2. Running Step ohne Update seit > 10 min → queue `agent_continuation`, marker stranded
3. Step gescheitert, kein nächster Step gequeued, kein replan-Task offen → queue `agent_replan`
4. Nichts findet einen Pfad → Goal `paused`, Activity-Log mit Begründung

### 6.8 Pod-Restart-Verhalten

Beim Server-Boot (über bestehenden Boot-Hook):
1. Suche `agent_runs` mit Status `executing` deren neuester zugehöriger `agent_steps.updatedAt` mehr als 5 min zurückliegt — sicher stranded (kein Inline-Loop läuft mehr).
2. Queue für jeden einen `agent_continuation`-Task mit `priority=1`.
3. Nächster `tick()` (1 min später) übernimmt sie.

Max 1 Tick Latenz nach Pod-Start. Verträgt Coolify-Redeploys problemlos.

### 6.9 Live-Events für UI

- `agent.run.planned`
- `agent.step.started` / `.succeeded` / `.failed`
- `agent.run.replanned`
- `agent.run.paused`
- `agent.run.completed`

---

## 7. UI / User-Touchpoints

Konsequent unter `/intern/agents/...`.

### 7.1 Pages

| Route | Zweck |
|---|---|
| `/intern/agents` | Dashboard: aktive Goals, letzte Runs, Cost-Übersicht |
| `/intern/agents/goals/new` | Goal anlegen — Title, Description, executionMode, Budget, Priority |
| `/intern/agents/goals/[id]` | Goal-Detail: Status, alle Runs, Live-Progress, Pause/Resume/Cancel |
| `/intern/agents/runs/[id]` | Run-Detail: DAG-Visualisierung, Cost-Breakdown, Re-Plan-Historie |
| `/intern/agents/memory` | Memory-Browser: PARA-Tree, Search, File-Edit |
| `/intern/agents/memory/[scope]` | Memory-Entry: Markdown-Body + items.yaml als Tabelle, Provenance |
| `/intern/agents/definitions` | Worker-/Orchestrator-Definitions verwalten |
| `/intern/agents/cost` | Cost-Analytics |

### 7.2 Komponenten

```
GoalForm                  — Anlegen/Edit
RunDagView                — Plan als Graph mit Status-Badges
StepCard                  — Step-Result inline + Expand
RunTimeline               — Re-Plan-Iterationen vertikal
LivePresence              — Realtime-Progress (Live-Events oder Polling-Fallback)
MemoryTree                — Folder-Tree
MemorySearchBar           — Hybrid-Search inline-Snippets
MemoryEditor              — Markdown-Editor (TipTap aus CMS wiederverwenden)
CostChart                 — Recharts
DefinitionForm            — System-Prompt-Editor mit Token-Counter, Tool-Whitelist-Picker
```

### 7.3 Approval-Flow (optional)

Pro Goal `requirePlanApproval: boolean` (Default `false`). Wenn `true`:
- Nach `planning` → `awaiting_approval`
- UI zeigt Plan + "Freigeben"/"Anpassen"/"Ablehnen"-Buttons
- Erst nach Approval queuen die Step-Tasks

### 7.4 Manual-Trigger-Hooks

- "Goal jetzt ausführen" → setzt `executionMode='immediate'`, queued sofortigen Replan
- "Step wiederholen" → resetet Step auf `pending`, queued neuen `agent_step_run`
- "Re-Plan jetzt" → erzwingt Re-Plan-Iteration

---

## 8. Phasen-Schnitt

Sieben Phasen, jede eigenständig deployable + testbar.

### Phase 1 — Schema & Service-Skelett (1-2 Tage)
- Drizzle-Schema für 6 neue Tabellen + Indices + pgvector + pg_trgm Extension
- Leere Service-Module: `agents/orchestrator.service.ts`, `agents/worker.service.ts`, `agents/memory.service.ts`, `agents/tool-registry.ts`, `agents/cost-tracker.service.ts`
- Tick-Handler-Hook in `CronService.tick()` (no-op)
- **DoD:** `pnpm typecheck` + `drizzle-kit push` durch, Boot ohne Crash
- **Test:** Schema-Migration sauber

### Phase 2 — Memory-Layer (2-3 Tage)
- `MemoryService` voll: search/read/write/supersede/list mit DB-Index + Disk-Sync
- File-Watcher (`chokidar`) für externe Edits
- Embedding-Pipeline (Gemini text-embedding-004 default)
- Read-only UI `/intern/agents/memory` (Tree + Search + Detail-View)
- **DoD:** Manueller File auf Disk → erscheint in UI <5s; Hybrid-Search liefert Ergebnisse
- **Test:** Fixtures mit 20 Entries, Recall-Test

### Phase 3 — Tool-Registry + Worker-Service (2-3 Tage)
- Tool-Adapter für `memory:*`, `prompt:*`, `service:*`, `workflow:*`
- Deterministischer Worker-Service: `executeStep(stepId)` für `service:*`, `workflow:*`, `prompt:*`
- Noch kein Smart-Worker, kein Orchestrator
- Keine UI
- **DoD:** Manueller `agent_steps`-Insert mit `workerType='prompt:lead_research'` → Tick führt aus
- **Test:** 5 Tool-Calls per Vitest-Integration-Test

### Phase 4 — Orchestrator-Loop (3-4 Tage)
- `OrchestratorService.plan(goalId)` mit System-Prompt, Tool-Discovery, JSON-Mode
- `OrchestratorService.replan(runId)` mit Sliding-Summary + Prompt-Caching
- Tick-Handler komplett: `agent_step_run`, `agent_replan`, `agent_continuation`
- Cron-Lane funktioniert end-to-end
- Minimal-UI: Goal anlegen + Goal-Detail mit Status-Polling
- **DoD:** Goal "Recherchiere Acme GmbH und schreib Summary" → Plan, Worker, Re-Plan, `done` mit Memory-Entry
- **Test:** 3 End-to-End-Goals (einfach/medium/komplex), Token-Budget-Hard-Stop

### Phase 5 — Smart-Worker + Immediate-Lane (2-3 Tage)
- `agent:*` Tool-Adapter → Smart-Worker mit eigenem LLM-Call + restricted Tool-Set
- Inline-Loop mit Watchdog (5 min Deadline)
- `nextStepMode='immediate'` Logik im Re-Plan-Output
- **DoD:** Goal mit `executionMode='immediate'` läuft inline durch; Watchdog-Deadline-Trip → Auto-Fallback ohne Datenverlust
- **Test:** Watchdog-Deadline-Test, Smart-Worker mit eigenem Tool-Use

### Phase 6 — Recovery + Reconcile (1-2 Tage)
- Stranded-Run-Reconcile (alle 5 min)
- Boot-Recovery für post-Restart-stranded-Runs
- Liveness-Contract-Checks
- Activity-Log-Integration
- **DoD:** Forced Pod-Kill mitten in Inline-Loop → nach <2 min wieder live
- **Test:** Crash-Simulation, Liveness-Check für alle 4 Stranded-Patterns

### Phase 7 — UI-Komplettierung (3-4 Tage)
- DAG-Visualisierung
- Cost-Charts
- Memory-Editor mit Markdown-Edit
- Definition-Editor
- Live-Events (falls Realtime-Layer existiert)
- Manual-Trigger-Buttons
- **DoD:** Komplettes Feature ohne SQL-Inserts bedienbar
- **Test:** Manual-Smoke-Test auf bos.dev.xkmu.de

### Optional Phase 8 — Approval-Flow + Polish (1-2 Tage)
- `requirePlanApproval`-Toggle
- Goal-Templates
- Notification bei Goal-Done/Failed
- Performance-Tuning

### Cross-Cutting

- **Audit-Log-Anbindung** ab Phase 1
- **Push-Bestätigung** mit CI-Auto-Bump (1.5.x) bei jedem Push
- **Worktree-Strategie:** Phase 1+2 (`feat/agents-foundation`), Phase 3+4 (`feat/agents-runtime`), Phase 5-7 (`feat/agents-ui`) — 3 große PRs

### Geschätzter Gesamtaufwand
~14-21 reine Arbeitstage. Realistisch 4-6 Wochen Wall-Clock bei ~50%-Fokus.

---

## 9. Offene Punkte / spätere Entscheidungen

- **Embedding-Modell-Wahl:** Default Gemini text-embedding-004 (768d). Alternative OpenAI text-embedding-3-small (1536d) bei besserer Recall-Qualität. Migration über `vector(N)`-Anpassung.
- **Realtime-Layer:** UI nutzt zunächst Polling (`/api/agents/runs/[id]/state`). Falls SSE/WebSocket-Layer in xKMU vorhanden → upgrade in Phase 7.
- **Concurrency-Limit pro Goal:** Default `maxParallelSteps=5`. Anpassbar über `agent_goals.metadata`.
- **Memory-Disk-Backup:** `/data/agent-memory/` sollte in Coolify-Backup-Strategie aufgenommen werden. Optional automatisches Git-Repo init für File-History.
- **Multi-Provider-Fallback:** Bei Provider-Outage soll Orchestrator/Worker auf Fallback-Provider switchen. Logik in Phase 4 vorgesehen, Detail offen.

---

## 10. Referenzen

- Paperclip GitHub: https://github.com/paperclipai/paperclip
- Paperclip Memory-Landscape: `paperclipai/paperclip/doc/memory-landscape.md`
- Paperclip Execution-Semantics: `paperclipai/paperclip/doc/execution-semantics.md`
- Paperclip PARA-Skill: `paperclipai/paperclip/skills/para-memory-files/SKILL.md`
- Tiago Forte's PARA-Methode: https://fortelabs.com/blog/para/
- Bestehende xKMU-Workflow-Engine: `src/lib/services/workflow/engine.ts`
- Bestehende Task-Queue: `src/lib/services/task-queue.service.ts` + `src/app/api/cron/tick/route.ts`
