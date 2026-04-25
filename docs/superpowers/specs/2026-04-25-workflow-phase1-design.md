# Workflow-Erweiterung Phase 1 — Webhook-Action + Trigger-Events

**Status:** approved (brainstorming)
**Datum:** 2026-04-25
**Kontext:** Das bestehende Workflow-System (`src/lib/services/workflow/{engine,action-registry}.ts`) hat 11 Actions und 2 Trigger-Quellen (`contact.submitted`, custom cron). Phase 1 erweitert das System um eine generische Webhook-Action und 10 weitere Trigger-Events aus den Domänen Lead/Portal/Order/Contract. Conditional-Branches und Parallel/Fan-out bleiben Phase 2.

## 1. Ziel

1. Workflows können HTTP-Calls an externe Endpunkte ausführen (Slack, n8n, Drittsystem-APIs).
2. Workflows können auf zentrale Domain-Events reagieren — nicht nur Kontaktformular und Cron.
3. Trigger-Liste in der UI ist die Single Source of Truth (heute: dupliziert in zwei Files).

## 2. Scope

**In scope:**
- Neue Action `webhook_call` (POST/GET/PUT/DELETE + Auth-Header + Mustache-Templating + Retry + Timeout).
- Zentrale Trigger-Registry `src/lib/services/workflow/triggers.ts` mit 11 Trigger-Definitionen.
- 10 neue `WorkflowEngine.fire(...)`-Calls in den jeweiligen Services / Routes.
- UI-Konsolidierung: `workflows/page.tsx` und `workflows/[id]/page.tsx` importieren Trigger-Liste statt eigener Konstanten.
- Engine-Fix: `actionResults`-Keying via optionaler `step.id` (rückwärtskompatibel).
- Unit + Integration-Tests.

**Out of scope (Phase 2):**
- Echte Conditional-Branches (`if`-Step mit `then`/`else`).
- Parallel/Fan-out.
- Response-Routing in Conditions.
- URL-Whitelist (SSRF-Schutz) — nur kommen, wenn Sicherheits-Anforderung steigt.
- Erweiterte Mustache-Helpers (`{{#if}}`, `{{#each}}`).

## 3. Architektur

### 3.1 Webhook-Action

Neuer Eintrag in `ACTIONS`-Map in `src/lib/services/workflow/action-registry.ts`:

```ts
webhook_call: {
  name: 'webhook_call',
  label: 'Webhook aufrufen',
  description: 'HTTP-Request an externe URL mit Mustache-Templating',
  category: 'integration',
  configSchema: [
    { key: 'url', type: 'string', required: true, label: 'URL' },
    { key: 'method', type: 'select', options: ['POST', 'GET', 'PUT', 'DELETE'], default: 'POST', label: 'Methode' },
    { key: 'authBearer', type: 'string', label: 'Bearer-Token (optional)' },
    { key: 'headers', type: 'json', label: 'Custom Headers (JSON)' },
    { key: 'body', type: 'json', label: 'Body (JSON, mit {{data.field}})' },
    { key: 'retries', type: 'number', default: 2, label: 'Retries (5xx/Network)' },
    { key: 'timeoutMs', type: 'number', default: 10000, label: 'Timeout (ms)' },
  ],
  execute: webhookCallExecute,
}
```

(`configSchema` ist hint für UI-Editor. Falls die bestehende `ActionDefinition` ein anderes Schema-Feld nutzt, beim Implementieren anpassen.)

**Mustache-Resolver** (lokaler Helper):

```ts
function resolveTemplate(input: unknown, ctx: { triggerData: Record<string, unknown>; stepResults: Record<string, unknown> }): unknown {
  if (typeof input === 'string') {
    return input.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, path) => {
      const parts = path.trim().split('.')
      let cur: unknown = parts[0] === 'data' ? ctx.triggerData
                       : parts[0] === 'steps' ? ctx.stepResults
                       : undefined
      for (let i = 1; i < parts.length; i++) {
        if (cur == null) return ''
        cur = (cur as Record<string, unknown>)[parts[i]]
      }
      return cur == null ? '' : String(cur)
    })
  }
  if (Array.isArray(input)) return input.map(item => resolveTemplate(item, ctx))
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input)) out[k] = resolveTemplate(v, ctx)
    return out
  }
  return input
}
```

**Execute-Funktion** (Pseudo, finale Form im Plan):

```ts
async function webhookCallExecute(ctx: ActionContext, config: Record<string, unknown>): Promise<ActionResult> {
  const cfg = config as {
    url: string; method?: string; headers?: Record<string, string>;
    authBearer?: string; body?: unknown; retries?: number; timeoutMs?: number;
  }

  const url = String(resolveTemplate(cfg.url, ctx))
  if (!url.trim()) return { success: false, error: 'URL leer nach Templating' }

  const method = (cfg.method || 'POST').toUpperCase()
  const headers: Record<string, string> = { 'Content-Type': 'application/json',
    ...(resolveTemplate(cfg.headers || {}, ctx) as Record<string, string>) }
  if (cfg.authBearer) headers.Authorization = `Bearer ${resolveTemplate(cfg.authBearer, ctx)}`

  let body: string | undefined
  if (method !== 'GET' && method !== 'DELETE') {
    try { body = JSON.stringify(resolveTemplate(cfg.body ?? {}, ctx)) }
    catch (err) { return { success: false, error: `Body nicht serialisierbar: ${err}` } }
  }

  const maxAttempts = Math.min(Math.max(0, cfg.retries ?? 2), 5) + 1
  const timeoutMs = cfg.timeoutMs ?? 10_000

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { method, headers, body, signal: controller.signal })
      clearTimeout(timer)
      const text = await res.text().catch(() => '')
      const parsedBody = safeParseJson(text) ?? text

      if (res.ok) {
        return { success: true, data: { status: res.status, body: parsedBody } }
      }
      if (res.status >= 400 && res.status < 500) {
        return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}`, data: { status: res.status, body: parsedBody } }
      }
      // 5xx: retry
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt))
    } catch (err) {
      clearTimeout(timer)
      if (attempt === maxAttempts) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
  return { success: false, error: 'Max retries exceeded' }
}

function safeParseJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}
```

### 3.2 Trigger-Registry

Neue Datei `src/lib/services/workflow/triggers.ts`:

```ts
export interface TriggerDefinition {
  key: string
  label: string
  description: string
  /** Hint für UI welche Felder unter {{data.*}} verfügbar sind. Reine Doku, nicht runtime-validiert. */
  dataShape?: string[]
}

export const WORKFLOW_TRIGGERS: TriggerDefinition[] = [
  { key: 'contact.submitted',           label: 'Kontaktformular abgesendet',  description: 'Wird gefeuert wenn jemand das öffentliche Kontaktformular absendet.', dataShape: ['firstName', 'lastName', 'email', 'phone', 'company', 'message'] },
  { key: 'lead.created',                label: 'Lead erstellt',               description: 'Wird gefeuert nach Anlegen eines Leads.', dataShape: ['leadId', 'companyId', 'personId', 'source'] },
  { key: 'lead.scored',                 label: 'Lead bewertet',               description: 'Wird gefeuert nach erfolgreichem Lead-Scoring.', dataShape: ['leadId', 'score', 'priority'] },
  { key: 'portal.message_sent',         label: 'Portal: Nachricht gesendet',  description: 'Wird gefeuert bei Portal-Chat-Nachricht.', dataShape: ['messageId', 'companyId', 'senderId', 'senderRole', 'bodyPreview'] },
  { key: 'portal.document_uploaded',    label: 'Portal: Dokument hochgeladen', description: 'Wird gefeuert bei Portal-Dokument-Upload (Admin oder Kunde).', dataShape: ['documentId', 'companyId', 'direction', 'fileName', 'sizeBytes', 'uploaderRole'] },
  { key: 'portal.change_request_created', label: 'Portal: Änderungsantrag gestellt', description: 'Wird gefeuert bei Firmendaten-Änderungsantrag im Portal.', dataShape: ['changeRequestId', 'companyId', 'requestedBy', 'proposedChanges'] },
  { key: 'portal.user_invited',         label: 'Portal: User eingeladen',     description: 'Wird gefeuert bei Portal-Zugang-Erstellung mit Invite-Link.', dataShape: ['userId', 'companyId', 'email'] },
  { key: 'order.created',               label: 'Auftrag angelegt',            description: 'Wird gefeuert nach Erstellen eines Auftrags.', dataShape: ['orderId', 'companyId', 'title', 'createdByRole'] },
  { key: 'order.status_changed',        label: 'Auftrag: Status geändert',    description: 'Wird gefeuert nach Status-Übergang eines Auftrags.', dataShape: ['orderId', 'companyId', 'fromStatus', 'toStatus'] },
  { key: 'contract.created',            label: 'Vertrag angelegt',            description: 'Wird gefeuert nach Erstellen eines Vertrags.', dataShape: ['contractId', 'companyId', 'title'] },
  { key: 'contract.status_changed',     label: 'Vertrag: Status geändert',    description: 'Wird gefeuert nach Status-Übergang eines Vertrags.', dataShape: ['contractId', 'companyId', 'fromStatus', 'toStatus'] },
]

export const TRIGGER_LABELS: Record<string, string> = Object.fromEntries(
  WORKFLOW_TRIGGERS.map(t => [t.key, t.label])
)
```

### 3.3 `fire()`-Calls in Services

Pattern (DRY, fail-safe, dynamic import gegen Circular-Deps):

```ts
import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
  WorkflowEngine.fire('order.created', {
    orderId: created.id, companyId: created.companyId,
    title: created.title, createdByRole: 'admin',
  })
).catch(err => logger.error('Workflow fire failed', err, { module: 'OrderService' }))
```

**Stellen:**

| Trigger | File / Methode |
|---|---|
| `lead.created` | `src/lib/services/lead.service.ts` → `LeadService.create` nach Insert |
| `lead.scored` | `src/lib/services/workflow/action-registry.ts` Ende der `score_lead`-Action **und** `LeadService.updateScore` (falls vorhanden) |
| `portal.message_sent` | `src/lib/services/portal-chat.service.ts` → `PortalChatService.send` nach Insert |
| `portal.document_uploaded` | `src/lib/services/portal-document.service.ts` → `PortalDocumentService.upload` nach Insert |
| `portal.change_request_created` | `src/app/api/v1/portal/me/company/change-request/route.ts` nach `CompanyChangeRequestService.create` |
| `portal.user_invited` | `src/lib/services/user.service.ts` → `createPortalUser` wenn `method='invite'` |
| `order.created` | `src/lib/services/order.service.ts` → `OrderService.create` nach Insert |
| `order.status_changed` | `src/lib/services/order.service.ts` → `OrderService` (Methode-Name beim Implementieren prüfen) nach Status-Update |
| `contract.created` | `src/lib/services/contract.service.ts` nach Insert |
| `contract.status_changed` | `src/lib/services/contract.service.ts` nach Status-Update |

Falls eine Service-Methode den passenden Returnwert nicht hat, im Plan-Implementer-Step den Fire-Call an die nächst-logische Stelle verschieben (z.B. API-Route statt Service).

### 3.4 UI-Konsolidierung

In `src/app/intern/(dashboard)/settings/workflows/page.tsx` und `src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx`:

- Lokale `const TRIGGER_LABELS = { … }` löschen.
- `import { TRIGGER_LABELS, WORKFLOW_TRIGGERS } from '@/lib/services/workflow/triggers'` ergänzen.
- Im Detail-Editor das Trigger-Select aus `WORKFLOW_TRIGGERS` rendern, plus `description` und `dataShape` als Hint („Verfügbar: `{{data.leadId}}`, `{{data.companyId}}`, …").

### 3.5 Engine-Fix: `actionResults`-Keying

In `engine.ts`, im Step-Loop ändern:

```ts
const stepKey = (step as { id?: string }).id || step.action
// ... action ausführen ...
if (actionResult.data) {
  actionResults[stepKey] = actionResult.data
  // BehindCompat: zusätzlich unter action-name speichern, nur wenn noch nicht belegt.
  if (!(step.action in actionResults)) actionResults[step.action] = actionResult.data
}
```

`WorkflowStep`-Interface wird um optionales `id?: string` ergänzt. Im UI-Editor wird beim Hinzufügen eines Steps `crypto.randomUUID().slice(0, 8)` als ID generiert. Bestandsworkflows (ohne ID) referenzieren weiter via Action-Name — kein Daten-Migrations-Job nötig.

## 4. Sicherheit

- **SSRF**: keine URL-Whitelist in Phase 1. Webhook-URLs werden vom User in der Workflow-Edit-UI konfiguriert (`workflows.update`-Permission). Ein böswilliger Admin könnte `http://localhost:5432` o.ä. ansprechen — akzeptiertes Risiko bei eingeschränktem Admin-Kreis. Falls relevant in Phase 2 nachziehen mit Allow-/Block-Liste in env-config.
- **Mustache-Resolver**: Stringifies Werte via `String(cur)` — keine Code-Execution. Nested objects werden rekursiv resolved, kein Eval.
- **Auth-Header**: `authBearer` wird aus Config gelesen und nur als `Authorization: Bearer …`-Header gesendet. Nicht in `step_results` ge-loggt (raw config-Wert wird nicht persistiert).
- **Permissions**: keine neuen. `workflows.update` deckt Webhook-Anlegen ab.

## 5. Error-Handling

| Fall | Verhalten |
|---|---|
| Mustache-Variable nicht in scope | wird zu `''` (leerer String). |
| URL nach Templating leer | Action returnt `success: false, error: 'URL leer nach Templating'`. |
| Body nicht JSON-serialisierbar | try/catch um `JSON.stringify` → `success: false`. |
| Response-Body kein JSON | `safeParseJson` returnt `null`, raw text in step-result. |
| 4xx | direkt `success: false`, kein Retry. |
| 5xx | Retry (default 2x, exponential 1s/2s/3s). |
| Network-Error / Timeout | Retry wie 5xx. |
| Fire-Call schlägt fehl (z.B. DB) | Logger-error, primary action läuft trotzdem durch (Datenintegrität). |

## 6. Testing

**Unit:**

- `webhook_call`-Action (`src/__tests__/unit/services/workflow-webhook-action.test.ts`):
  - Mustache-Resolver: einfacher String, nested object, Array, fehlender Key → leer.
  - HTTP 200 → success mit `{status, body}`.
  - HTTP 4xx → fail-no-retry.
  - HTTP 5xx → retry-then-fail.
  - Network-Error → retry-then-fail.
  - Timeout → fail mit AbortError.
  - Auth-Header korrekt gesetzt bei `authBearer`.
  - GET/DELETE: kein Body gesendet.

- `WorkflowEngine` (`src/__tests__/unit/services/workflow-engine-step-id.test.ts`):
  - Zwei Webhook-Calls schreiben unter eigenen IDs ohne Kollision.
  - Bestandsworkflow (ohne `step.id`) referenziert weiter via Action-Name.

**Integration (`integration-real`):**

- `workflow-webhook-flow.test.ts`:
  - Lokaler `http.createServer`-Mock, Workflow mit Webhook-Step, Fire → Verifiziere `workflow_runs.stepResults[0]` enthält `status: 200` und parsed body.

- `workflow-trigger-fires.test.ts`:
  - Smoke-Test für 3 neue Trigger (z.B. `order.created`, `lead.created`, `portal.document_uploaded`):
  - Aktiver Workflow mit `log_activity`-Step, Service-Call, Erwarte `workflow_runs`-Eintrag mit den entsprechenden `triggerData`-Feldern.

**Manuelles E2E:**
- Workflow für `contact.submitted` mit `webhook_call` an `https://webhook.site/<id>` anlegen.
- Kontaktformular absenden → bei webhook.site die JSON-Payload verifizieren.
- Workflow-Run-History zeigt 1 Run mit Step-Result `status: 200`.

## 7. Audit

Bestehender `workflow_runs.stepResults`-Mechanismus reicht. Webhook-Calls erscheinen dort als Step-Result mit `{status, body, error?}` — kein separater Audit-Log nötig.

## 8. Implementierungs-Reihenfolge (für Planning)

1. `triggers.ts` anlegen (zentrale Trigger-Registry).
2. UI-Files refactor: `TRIGGER_LABELS`-Imports auf zentrale Liste umstellen.
3. `webhook_call`-Action + Helper (`resolveTemplate`, `safeParseJson`) + Unit-Tests.
4. Engine-Fix: `step.id`-basiertes Keying + Unit-Test.
5. `WorkflowEngine.fire`-Calls in den 10 Service-Stellen einfügen (kann gruppiert werden — z.B. ein Commit je Domäne: lead, portal, order, contract).
6. Integration-Tests (webhook-flow + trigger-fires-smoke).
7. Manuelles E2E + Deploy.
