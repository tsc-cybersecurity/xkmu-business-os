# Workflow Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Workflow-Engine erweitert um `webhook_call`-Action (HTTP an externe URLs) plus zentrale Trigger-Registry mit 9 Trigger-Events aus den Domänen Lead/Portal/Order. Bestandsworkflows bleiben unverändert.

**Architecture:** Eine neue Action in `action-registry.ts` (Mustache-Templating, Retry, Timeout). Eine neue Datei `triggers.ts` als Single-Source-of-Truth für Trigger-Liste — die zwei UI-Files importieren sie statt eigene Konstanten. 9 `WorkflowEngine.fire(...)`-Calls in den jeweiligen Services. Engine bekommt optionales `step.id` für eindeutige `actionResults`-Keys (rückwärtskompatibel).

**Tech Stack:** TypeScript, Drizzle ORM, fetch + AbortController, vitest, bestehende Helper.

**Spec:** `docs/superpowers/specs/2026-04-25-workflow-phase1-design.md`

**Plan-Anpassung gegenüber Spec:** Die ursprünglich vorgesehenen `contract.created` und `contract.status_changed` Trigger sind aus Phase 1 entfernt. Grund: Contracts sind als `business_documents` mit `type='contract'` gespeichert (kein dedizierter ContractService) und der Code hat aktuell keinen Status-Update-Hook für diese Doc-Type. Deferred: Phase 2 oder wenn ContractService entsteht.

---

## File Structure

**Workflow-Core**
- Create: `src/lib/services/workflow/triggers.ts` — Trigger-Registry
- Modify: `src/lib/services/workflow/action-registry.ts` — `webhook_call` + Helper (`resolveTemplate`, `safeParseJson`)
- Modify: `src/lib/services/workflow/engine.ts` — `step.id`-basiertes `actionResults`-Keying

**UI-Konsolidierung**
- Modify: `src/app/intern/(dashboard)/settings/workflows/page.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx`

**Fire-Call-Stellen**
- Modify: `src/lib/services/lead.service.ts` — `LeadService.create` + `autoScore`
- Modify: `src/lib/services/portal-chat.service.ts` — `PortalChatService.createMessage`
- Modify: `src/lib/services/portal-document.service.ts` — `PortalDocumentService.upload`
- Modify: `src/lib/services/user.service.ts` — `UserService.createPortalUser` (invite-Path)
- Modify: `src/lib/services/order.service.ts` — `OrderService.create` + `transitionStatus`
- Modify: `src/app/api/v1/portal/me/company/change-request/route.ts`

**Tests**
- Create: `src/__tests__/unit/services/workflow-webhook-action.test.ts`
- Create: `src/__tests__/unit/services/workflow-engine-step-id.test.ts`
- Create: `src/__tests__/integration-real/workflow-webhook-flow.test.ts`
- Create: `src/__tests__/integration-real/workflow-trigger-fires.test.ts`

---

## Task 1: Trigger-Registry-Modul

**Files:**
- Create: `src/lib/services/workflow/triggers.ts`

- [ ] **Step 1: Datei anlegen**

Create `src/lib/services/workflow/triggers.ts`:

```ts
/**
 * Zentrale Trigger-Registry — Single Source of Truth.
 *
 * Neuen Trigger ergänzen:
 * 1. Eintrag in WORKFLOW_TRIGGERS unten hinzufügen.
 * 2. An passender Stelle im Code `WorkflowEngine.fire(<key>, { ... })` aufrufen.
 * 3. UI greift automatisch über TRIGGER_LABELS / WORKFLOW_TRIGGERS auf den neuen Trigger zu.
 */

export interface TriggerDefinition {
  key: string
  label: string
  description: string
  /** Hint für UI welche Felder unter {{data.*}} verfügbar sind. Reine Doku, nicht runtime-validiert. */
  dataShape?: string[]
}

export const WORKFLOW_TRIGGERS: TriggerDefinition[] = [
  {
    key: 'contact.submitted',
    label: 'Kontaktformular abgesendet',
    description: 'Wird gefeuert wenn jemand das öffentliche Kontaktformular absendet.',
    dataShape: ['firstName', 'lastName', 'email', 'phone', 'company', 'message'],
  },
  {
    key: 'lead.created',
    label: 'Lead erstellt',
    description: 'Wird gefeuert nach Anlegen eines Leads.',
    dataShape: ['leadId', 'companyId', 'personId', 'source'],
  },
  {
    key: 'lead.scored',
    label: 'Lead bewertet',
    description: 'Wird gefeuert nach erfolgreichem Lead-Scoring.',
    dataShape: ['leadId', 'score', 'priority'],
  },
  {
    key: 'portal.message_sent',
    label: 'Portal: Nachricht gesendet',
    description: 'Wird gefeuert bei Portal-Chat-Nachricht.',
    dataShape: ['messageId', 'companyId', 'senderId', 'senderRole', 'bodyPreview'],
  },
  {
    key: 'portal.document_uploaded',
    label: 'Portal: Dokument hochgeladen',
    description: 'Wird gefeuert bei Portal-Dokument-Upload (Admin oder Kunde).',
    dataShape: ['documentId', 'companyId', 'direction', 'fileName', 'sizeBytes', 'uploaderRole'],
  },
  {
    key: 'portal.change_request_created',
    label: 'Portal: Änderungsantrag gestellt',
    description: 'Wird gefeuert bei Firmendaten-Änderungsantrag im Portal.',
    dataShape: ['changeRequestId', 'companyId', 'requestedBy', 'proposedChanges'],
  },
  {
    key: 'portal.user_invited',
    label: 'Portal: User eingeladen',
    description: 'Wird gefeuert bei Portal-Zugang-Erstellung mit Invite-Link.',
    dataShape: ['userId', 'companyId', 'email'],
  },
  {
    key: 'order.created',
    label: 'Auftrag angelegt',
    description: 'Wird gefeuert nach Erstellen eines Auftrags.',
    dataShape: ['orderId', 'companyId', 'title', 'createdByRole'],
  },
  {
    key: 'order.status_changed',
    label: 'Auftrag: Status geändert',
    description: 'Wird gefeuert nach Status-Übergang eines Auftrags.',
    dataShape: ['orderId', 'companyId', 'fromStatus', 'toStatus'],
  },
]

export const TRIGGER_LABELS: Record<string, string> = Object.fromEntries(
  WORKFLOW_TRIGGERS.map(t => [t.key, t.label]),
)
```

- [ ] **Step 2: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep "workflow/triggers" | head`
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/workflow/triggers.ts
git commit -m "feat(workflow): central trigger registry with 9 trigger definitions"
```

---

## Task 2: UI-Konsolidierung — `TRIGGER_LABELS` aus zentraler Quelle

**Files:**
- Modify: `src/app/intern/(dashboard)/settings/workflows/page.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx`

- [ ] **Step 1: Liste anschauen**

Read beide Files. In jedem ist eine lokale `const TRIGGER_LABELS: Record<string, string> = { ... }` deklariert. Diese hat heute (vor diesem Plan) eine begrenzte Liste — wahrscheinlich nur `contact.submitted` und ein paar custom-cron-Triggers.

- [ ] **Step 2: Refactor `workflows/page.tsx`**

In `src/app/intern/(dashboard)/settings/workflows/page.tsx`:
1. Die lokale `const TRIGGER_LABELS: Record<string, string> = { ... }`-Deklaration löschen.
2. Am Top der Imports ergänzen:
```ts
import { TRIGGER_LABELS, WORKFLOW_TRIGGERS } from '@/lib/services/workflow/triggers'
```
3. Wo `Object.entries(TRIGGER_LABELS)` für die Trigger-Auswahl-Liste rendert: stehen lassen — funktioniert weiter, da die zentrale Map dieselbe Form hat.

- [ ] **Step 3: Refactor `workflows/[id]/page.tsx`**

Identisch zu Step 2: lokale `TRIGGER_LABELS`-Konstante löschen, Import von `@/lib/services/workflow/triggers` ergänzen.

Zusätzlich: im Detail-Editor unterhalb des Trigger-Selects einen Hint-Text anzeigen, der `description` und `dataShape` des aktuell gewählten Triggers ausgibt:

```tsx
{(() => {
  const def = WORKFLOW_TRIGGERS.find(t => t.key === workflow.trigger)
  if (!def) return null
  return (
    <p className="text-xs text-muted-foreground mt-1">
      {def.description}
      {def.dataShape && def.dataShape.length > 0 && (
        <> Verfügbar in <code>{'{{data.*}}'}</code>: {def.dataShape.map(f => <code key={f} className="ml-1 mr-1">{f}</code>)}</>
      )}
    </p>
  )
})()}
```

(Genaue Platzierung: direkt unter dem `<Select>` des Triggers im Detail-Editor.)

- [ ] **Step 4: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep "workflows/" | head`
Expected: No output.

- [ ] **Step 5: Commit**

```bash
git add "src/app/intern/(dashboard)/settings/workflows/page.tsx" "src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx"
git commit -m "refactor(workflow): UI uses central trigger registry, shows description + dataShape hint"
```

---

## Task 3: `webhook_call` Action + Tests

**Files:**
- Modify: `src/lib/services/workflow/action-registry.ts`
- Create: `src/__tests__/unit/services/workflow-webhook-action.test.ts`

- [ ] **Step 1: Failing test schreiben**

Create `src/__tests__/unit/services/workflow-webhook-action.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getAction } from '@/lib/services/workflow'

describe('webhook_call action', () => {
  beforeEach(() => {
    vi.useRealTimers()
    global.fetch = vi.fn() as any
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function getWebhook() {
    const def = getAction('webhook_call')
    if (!def) throw new Error('webhook_call action not registered')
    return def
  }

  function ctx(triggerData: Record<string, unknown> = {}, stepResults: Record<string, unknown> = {}) {
    return { triggerData, stepResults }
  }

  it('returns success on HTTP 200 with parsed JSON body', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true, status: 200, text: async () => '{"ok":true,"id":"xyz"}',
    })
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test', method: 'POST', body: { hello: 'world' } })
    expect(res.success).toBe(true)
    expect(res.data?.status).toBe(200)
    expect((res.data?.body as any).ok).toBe(true)
  })

  it('returns success with raw text body when response is not JSON', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true, status: 200, text: async () => 'plain text response',
    })
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test' })
    expect(res.success).toBe(true)
    expect(res.data?.body).toBe('plain text response')
  })

  it('returns failure on HTTP 4xx without retry', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false, status: 400, text: async () => '{"error":"bad request"}',
    })
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test', retries: 5 })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/HTTP 400/)
    expect((global.fetch as any).mock.calls.length).toBe(1)
  })

  it('retries on HTTP 5xx then fails', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false, status: 503, text: async () => 'service unavailable',
    })
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test', retries: 2 })
    expect(res.success).toBe(false)
    expect((global.fetch as any).mock.calls.length).toBe(3) // 1 initial + 2 retries
  }, 15_000)

  it('retries on network error then fails', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('ECONNRESET'))
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test', retries: 1 })
    expect(res.success).toBe(false)
    expect((global.fetch as any).mock.calls.length).toBe(2)
  }, 15_000)

  it('resolves Mustache templates in url, body, and headers', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' })
    const wh = getWebhook()
    await wh.execute(
      ctx({ companyId: 'c1', name: 'Acme' }, { score_lead: { score: 42 } }),
      {
        url: 'http://example.test/{{data.companyId}}',
        method: 'POST',
        headers: { 'X-Name': '{{data.name}}' },
        body: { score: '{{steps.score_lead.score}}' },
      },
    )
    const call = (global.fetch as any).mock.calls[0]
    expect(call[0]).toBe('http://example.test/c1')
    expect(call[1].headers['X-Name']).toBe('Acme')
    expect(JSON.parse(call[1].body).score).toBe('42')
  })

  it('sets Authorization Bearer header when authBearer provided', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' })
    const wh = getWebhook()
    await wh.execute(ctx({ apiKey: 'secret-token' }), {
      url: 'http://example.test',
      authBearer: '{{data.apiKey}}',
    })
    const call = (global.fetch as any).mock.calls[0]
    expect(call[1].headers.Authorization).toBe('Bearer secret-token')
  })

  it('does not send body for GET or DELETE', async () => {
    ;(global.fetch as any).mockResolvedValue({ ok: true, status: 200, text: async () => '{}' })
    const wh = getWebhook()
    await wh.execute(ctx(), { url: 'http://example.test', method: 'GET', body: { x: 1 } })
    expect((global.fetch as any).mock.calls[0][1].body).toBeUndefined()
    await wh.execute(ctx(), { url: 'http://example.test', method: 'DELETE', body: { x: 1 } })
    expect((global.fetch as any).mock.calls[1][1].body).toBeUndefined()
  })

  it('returns failure when URL is empty after templating', async () => {
    const wh = getWebhook()
    const res = await wh.execute(ctx({}), { url: '{{data.missing}}' })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/URL leer/i)
    expect((global.fetch as any).mock.calls.length).toBe(0)
  })

  it('aborts on timeout', async () => {
    ;(global.fetch as any).mockImplementation((_url: string, opts: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test', timeoutMs: 50, retries: 0 })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/abort/i)
  }, 5_000)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/unit/services/workflow-webhook-action.test.ts`
Expected: FAIL — `webhook_call action not registered`.

- [ ] **Step 3: Action implementieren**

In `src/lib/services/workflow/action-registry.ts`:

(a) Helper-Funktionen direkt nach `NO_COMPANY_NAME`-Konstante (vor dem `ACTIONS`-Objekt) einfügen:

```ts
function resolveTemplate(input: unknown, ctx: ActionContext): unknown {
  if (typeof input === 'string') {
    return input.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, path: string) => {
      const parts = path.trim().split('.')
      let cur: unknown
      if (parts[0] === 'data') cur = ctx.triggerData
      else if (parts[0] === 'steps') cur = ctx.stepResults
      else return ''
      for (let i = 1; i < parts.length; i++) {
        if (cur == null || typeof cur !== 'object') return ''
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

function safeParseJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}
```

(b) Im `ACTIONS`-Objekt einen neuen Eintrag (vor der schließenden `}` des Objekts) ergänzen:

```ts
  webhook_call: {
    name: 'webhook_call',
    label: 'Webhook aufrufen',
    description: 'HTTP-Request an externe URL (POST/GET/PUT/DELETE) mit Mustache-Templating, Retry und Timeout',
    category: 'communication',
    icon: 'Webhook',
    configFields: [
      { key: 'url', label: 'URL', type: 'string' },
      { key: 'method', label: 'Methode', type: 'select', options: ['POST', 'GET', 'PUT', 'DELETE'] },
      { key: 'authBearer', label: 'Bearer-Token (optional)', type: 'string' },
      { key: 'headers', label: 'Custom Headers (JSON)', type: 'json' },
      { key: 'body', label: 'Body (JSON, mit {{data.field}})', type: 'json' },
      { key: 'retries', label: 'Retries (5xx/Network)', type: 'number' },
      { key: 'timeoutMs', label: 'Timeout (ms)', type: 'number' },
    ],
    execute: async (ctx, config) => {
      const cfg = config as {
        url?: unknown; method?: unknown; headers?: unknown;
        authBearer?: unknown; body?: unknown; retries?: unknown; timeoutMs?: unknown
      }

      const url = String(resolveTemplate(cfg.url ?? '', ctx))
      if (!url.trim()) return { success: false, error: 'URL leer nach Templating' }

      const methodRaw = typeof cfg.method === 'string' ? cfg.method : 'POST'
      const method = methodRaw.toUpperCase()

      const baseHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      const resolvedHeaders = resolveTemplate(cfg.headers ?? {}, ctx)
      const headers: Record<string, string> = {
        ...baseHeaders,
        ...(resolvedHeaders && typeof resolvedHeaders === 'object'
          ? Object.fromEntries(
              Object.entries(resolvedHeaders as Record<string, unknown>)
                .map(([k, v]) => [k, String(v)]),
            )
          : {}),
      }
      if (cfg.authBearer) {
        headers.Authorization = `Bearer ${resolveTemplate(cfg.authBearer, ctx)}`
      }

      let body: string | undefined
      if (method !== 'GET' && method !== 'DELETE') {
        try {
          body = JSON.stringify(resolveTemplate(cfg.body ?? {}, ctx))
        } catch (err) {
          return { success: false, error: `Body nicht serialisierbar: ${err instanceof Error ? err.message : String(err)}` }
        }
      }

      const retriesRaw = typeof cfg.retries === 'number' ? cfg.retries : 2
      const maxAttempts = Math.min(Math.max(0, retriesRaw), 5) + 1
      const timeoutMs = typeof cfg.timeoutMs === 'number' && cfg.timeoutMs > 0 ? cfg.timeoutMs : 10_000

      let lastError: string = 'unknown'
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
            return {
              success: false,
              error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
              data: { status: res.status, body: parsedBody },
            }
          }
          lastError = `HTTP ${res.status}: ${text.slice(0, 200)}`
        } catch (err) {
          clearTimeout(timer)
          lastError = err instanceof Error ? err.message : String(err)
        }
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000 * attempt))
        }
      }
      return { success: false, error: lastError }
    },
  },
```

(c) Sicherstellen, dass `Webhook` als Icon-Name nicht runtime-relevant ist — nur Display-Hint im UI. Falls das UI feste Icon-Whitelists nutzt, fällt der Editor auf einen Default zurück; nicht kritisch.

- [ ] **Step 4: Tests ausführen**

Run: `npx vitest run src/__tests__/unit/services/workflow-webhook-action.test.ts`
Expected: 10 tests passing.

- [ ] **Step 5: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "action-registry|webhook-action" | head`
Expected: No output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/workflow/action-registry.ts src/__tests__/unit/services/workflow-webhook-action.test.ts
git commit -m "feat(workflow): webhook_call action with Mustache templating + retry + timeout"
```

---

## Task 4: Engine — `step.id`-basiertes `actionResults`-Keying

**Files:**
- Modify: `src/lib/services/workflow/engine.ts`
- Create: `src/__tests__/unit/services/workflow-engine-step-id.test.ts`

- [ ] **Step 1: Failing test schreiben**

Create `src/__tests__/unit/services/workflow-engine-step-id.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowEngine actionResults keying', () => {
  let firstCallStepResults: Record<string, unknown> | undefined
  let secondCallStepResults: Record<string, unknown> | undefined
  let updateInsertCalls: Array<Record<string, unknown>> = []

  beforeEach(() => {
    vi.resetModules()
    firstCallStepResults = undefined
    secondCallStepResults = undefined
    updateInsertCalls = []

    // Mock @/lib/db with chain
    vi.doMock('@/lib/db', () => {
      const insertChain: any = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
      }
      const updateChain: any = {
        set: vi.fn(function(this: any, val: any) { updateInsertCalls.push(val); return this }),
        where: vi.fn().mockResolvedValue([]),
      }
      const selectChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: 'wf-1', name: 'TestWf', steps: [], trigger: 'test' }]),
      }
      return {
        db: {
          insert: vi.fn(() => insertChain),
          update: vi.fn(() => updateChain),
          select: vi.fn(() => selectChain),
        },
      }
    })

    // Mock action-registry: provide two simple "echo" actions that capture ctx.stepResults
    vi.doMock('@/lib/services/workflow/action-registry', async () => {
      return {
        getAction: (name: string) => {
          if (name === 'first_action' || name === 'echo') {
            return {
              name,
              execute: async (ctx: any) => {
                if (!firstCallStepResults) firstCallStepResults = { ...ctx.stepResults }
                else if (!secondCallStepResults) secondCallStepResults = { ...ctx.stepResults }
                return { success: true, data: { value: name + '-result' } }
              },
            }
          }
          return undefined
        },
      }
    })
  })

  it('uses step.id as the actionResults key when present, falling back to action name', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { action: 'echo', id: 'step_a' },
      { action: 'echo', id: 'step_b' }, // same action twice — would collide without id
    ]

    await WorkflowEngine.executeWorkflow('wf-1', 'TestWf', steps as any, 'test', {})

    // After step 1 runs, stepResults should NOT have step_a yet (captured before its own run)
    // Before step 2 runs (firstCallStepResults captures stepResults visible to first action)
    expect(firstCallStepResults).toEqual({})
    // After step 1, second action sees step_a's result
    expect(secondCallStepResults).toMatchObject({
      step_a: { value: 'echo-result' },
      // Backwards compat: also under action name (only first occurrence)
      echo: { value: 'echo-result' },
    })
  })

  it('falls back to action name when step.id is missing (existing workflows)', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { action: 'first_action' }, // no id
      { action: 'echo' },          // no id
    ]

    await WorkflowEngine.executeWorkflow('wf-1', 'TestWf', steps as any, 'test', {})

    expect(secondCallStepResults).toMatchObject({
      first_action: { value: 'first_action-result' },
    })
  })
})
```

- [ ] **Step 2: Test ausführen (muss failen)**

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-step-id.test.ts`
Expected: FAIL — current engine uses action-name only, second test may pass but first test (with step_a/step_b) will fail because two `echo` calls overwrite each other.

- [ ] **Step 3: Engine anpassen**

In `src/lib/services/workflow/engine.ts`:

(a) `WorkflowStep`-Interface erweitern (Zeile ~18):

```ts
interface WorkflowStep {
  action: string
  id?: string             // Eindeutiger Step-Key für stepResults; rückwärtskompatibel via action-name-Fallback.
  label?: string
  config?: Record<string, unknown>
  condition?: string
}
```

(b) Im Step-Loop (innerhalb `executeWorkflow`, ungefähr Zeile 178), den Block der Result-Speicherung ersetzen. Der existierende Code:

```ts
const actionResult: ActionResult = await actionDef.execute(ctx, step.config || {})
if (actionResult.data) {
  actionResults[step.action] = actionResult.data
}
```

ersetzen durch:

```ts
const actionResult: ActionResult = await actionDef.execute(ctx, step.config || {})
if (actionResult.data) {
  const stepKey = step.id || step.action
  actionResults[stepKey] = actionResult.data
  // Backwards-compat: existierende Workflows referenzieren via action-name.
  // Nur belegen, wenn noch nicht gesetzt — vermeidet Überschreiben bei Mehrfach-Action mit IDs.
  if (!(step.action in actionResults)) {
    actionResults[step.action] = actionResult.data
  }
}
```

- [ ] **Step 4: Tests ausführen**

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-step-id.test.ts`
Expected: 2 tests passing.

- [ ] **Step 5: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "workflow/engine|workflow-engine-step" | head`
Expected: No output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/workflow/engine.ts src/__tests__/unit/services/workflow-engine-step-id.test.ts
git commit -m "feat(workflow): step.id-based actionResults keying (backwards-compatible)"
```

---

## Task 5: UI — `step.id` beim Step-Hinzufügen generieren

**Files:**
- Modify: `src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx` (oder `_components/workflow-designer.tsx` falls dort)

- [ ] **Step 1: Stelle finden**

Read `src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx` und ggf. `src/app/intern/(dashboard)/settings/workflows/_components/workflow-designer.tsx`. Suchen: wo wird ein neuer Step zum `workflow.steps`-Array hinzugefügt? (Vermutlich in einem Button-Handler wie `addStep` / `onAddStep` oder analog.)

- [ ] **Step 2: ID-Generierung einbauen**

Beim Anlegen eines neuen Steps eine kurze ID generieren. Pattern:

```ts
function generateStepId(): string {
  return crypto.randomUUID().slice(0, 8)
}

// In der Add-Step-Funktion:
const newStep = {
  id: generateStepId(),
  action: '<gewählte action>',
  // ... ggf. label, config
}
```

Wenn der Code aktuell nur `{ action: 'foo' }` generiert: das `id`-Feld vor `action` ergänzen.

Bestandsworkflows ohne IDs werden NICHT migrated — sie laufen über den Fallback-Pfad in der Engine weiter.

- [ ] **Step 3: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep "workflows/" | head`
Expected: No output.

- [ ] **Step 4: Commit**

```bash
git add "src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx" "src/app/intern/(dashboard)/settings/workflows/_components/"
git commit -m "feat(workflow): UI generates short step.id when adding new steps"
```

(Stage nur Files die du tatsächlich angefasst hast — nicht zwingend beide Pfade.)

---

## Task 6: Trigger-Fire-Calls in Services (Lead + Portal-Chat + Portal-Doc)

**Files:**
- Modify: `src/lib/services/lead.service.ts`
- Modify: `src/lib/services/portal-chat.service.ts`
- Modify: `src/lib/services/portal-document.service.ts`

Pattern für jeden Fire-Call (DRY, fail-safe, dynamic import gegen Circular-Deps):

```ts
import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
  WorkflowEngine.fire('<trigger.key>', { /* triggerData */ })
).catch(err => logger.error('Workflow fire failed', err, { module: '<ServiceName>' }))
```

- [ ] **Step 1: `lead.service.ts` — `lead.created`**

In `LeadService.create` (line ~55-90), nach dem Insert (`const [lead] = await db.insert(leads).values(...).returning()`) und VOR dem `this.autoScore(lead.id).catch(...)` Aufruf, einfügen:

```ts
import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
  WorkflowEngine.fire('lead.created', {
    leadId: lead.id,
    companyId: lead.companyId ?? null,
    personId: lead.personId ?? null,
    source: lead.source ?? null,
  })
).catch(err => logger.error('Workflow fire (lead.created) failed', err, { module: 'LeadService' }))
```

- [ ] **Step 2: `lead.service.ts` — `lead.scored`**

In `LeadService.autoScore` (line ~92), am Ende der Methode (nach erfolgreichem Score-Update, im success-Pfad), einfügen:

```ts
import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
  WorkflowEngine.fire('lead.scored', {
    leadId,
    score,                 // die berechnete Zahl, im scope der Funktion
    priority: typeof priority === 'string' ? priority : null,  // falls vorhanden
  })
).catch(err => logger.error('Workflow fire (lead.scored) failed', err, { module: 'LeadService' }))
```

Genaue Variablen-Namen an die Methode anpassen — falls `priority` nicht existiert, weglassen.

- [ ] **Step 3: `portal-chat.service.ts` — `portal.message_sent`**

In `PortalChatService.createMessage` nach dem Insert, einfügen:

```ts
import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
  WorkflowEngine.fire('portal.message_sent', {
    messageId: created.id,
    companyId: created.companyId,
    senderId: created.senderId,
    senderRole: created.senderRole,
    bodyPreview: (created.bodyText ?? '').slice(0, 120),
  })
).catch(err => logger.error('Workflow fire (portal.message_sent) failed', err, { module: 'PortalChatService' }))
```

- [ ] **Step 4: `portal-document.service.ts` — `portal.document_uploaded`**

In `PortalDocumentService.upload` (line ~85), am Ende der Methode (nach erfolgreichem DB-Insert, vor dem `return created`), einfügen:

```ts
import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
  WorkflowEngine.fire('portal.document_uploaded', {
    documentId: created.id,
    companyId: created.companyId,
    direction: created.direction,
    fileName: created.fileName,
    sizeBytes: created.sizeBytes,
    uploaderRole: created.uploaderRole,
  })
).catch(err => logger.error('Workflow fire (portal.document_uploaded) failed', err, { module: 'PortalDocumentService' }))
```

- [ ] **Step 5: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "lead\.service|portal-chat|portal-document" | head`
Expected: No output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/lead.service.ts src/lib/services/portal-chat.service.ts src/lib/services/portal-document.service.ts
git commit -m "feat(workflow): fire lead.created/scored, portal.message_sent, portal.document_uploaded"
```

---

## Task 7: Trigger-Fire-Calls in Services (User + Order + Change-Request-API)

**Files:**
- Modify: `src/lib/services/user.service.ts`
- Modify: `src/lib/services/order.service.ts`
- Modify: `src/app/api/v1/portal/me/company/change-request/route.ts`

- [ ] **Step 1: `user.service.ts` — `portal.user_invited`**

In `UserService.createPortalUser` (line ~271), am Ende der Methode (nach erfolgreichem Insert, im success-Pfad — nur wenn `input.method === 'invite'`), einfügen:

```ts
if (input.method === 'invite') {
  import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
    WorkflowEngine.fire('portal.user_invited', {
      userId: created.id,
      companyId: input.companyId,
      email: created.email,
    })
  ).catch(err => logger.error('Workflow fire (portal.user_invited) failed', err, { module: 'UserService' }))
}
```

(Falls die Methode bereits einen anders-benannten Returnwert als `created` nutzt, anpassen.)

- [ ] **Step 2: `order.service.ts` — `order.created`**

In `OrderService.create` (line ~47), am Ende der Methode nach `db.insert(orders).values(...).returning()`, einfügen:

```ts
import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
  WorkflowEngine.fire('order.created', {
    orderId: created.id,
    companyId: created.companyId,
    title: created.title,
    createdByRole: created.createdByRole ?? null,
  })
).catch(err => logger.error('Workflow fire (order.created) failed', err, { module: 'OrderService' }))
```

- [ ] **Step 3: `order.service.ts` — `order.status_changed`**

In `OrderService.transitionStatus` (line ~106), nach dem erfolgreichen Update (also nachdem die DB-Update-Operation und der State-Übergang validiert sind), einfügen:

```ts
import('@/lib/services/workflow').then(({ WorkflowEngine }) =>
  WorkflowEngine.fire('order.status_changed', {
    orderId,
    companyId: updated.companyId,
    fromStatus: previousStatus,    // muss in der Methode verfügbar sein — andernfalls vorher laden
    toStatus: updated.status,
  })
).catch(err => logger.error('Workflow fire (order.status_changed) failed', err, { module: 'OrderService' }))
```

Wenn `previousStatus` in der Methode noch nicht extrahiert ist: vor dem Update den aktuellen Status laden (`const [{ status: previousStatus }] = await db.select({status: orders.status}).from(orders).where(eq(orders.id, orderId)).limit(1)`).

- [ ] **Step 4: Change-Request-Route — `portal.change_request_created`**

In `src/app/api/v1/portal/me/company/change-request/route.ts`, nach `CompanyChangeRequestService.create(...)` und nach dem Activity-Insert (Phase P7-T6), einen weiteren fail-safe Block einfügen:

```ts
try {
  const { WorkflowEngine } = await import('@/lib/services/workflow')
  await WorkflowEngine.fire('portal.change_request_created', {
    changeRequestId: created.id,
    companyId: auth.companyId,
    requestedBy: auth.userId,
    proposedChanges: validation.data.proposedChanges,
  })
} catch (err) {
  logger.error('Workflow fire (portal.change_request_created) failed', err, { module: 'PortalChangeRequestAPI' })
}
```

- [ ] **Step 5: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "user\.service|order\.service|change-request" | head`
Expected: No output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/user.service.ts src/lib/services/order.service.ts src/app/api/v1/portal/me/company/change-request/route.ts
git commit -m "feat(workflow): fire portal.user_invited, order.created/status_changed, portal.change_request_created"
```

---

## Task 8: Integration-Tests

**Files:**
- Create: `src/__tests__/integration-real/workflow-webhook-flow.test.ts`
- Create: `src/__tests__/integration-real/workflow-trigger-fires.test.ts`

- [ ] **Step 1: Helper-Pattern checken**

Read `src/__tests__/integration-real/setup/test-db.ts` (oder `_helpers/test-db.ts`) UND einen Existing-Test wie `persons-portal-access-flow.test.ts` als Referenz.

- [ ] **Step 2: Webhook-Flow-Test**

Create `src/__tests__/integration-real/workflow-webhook-flow.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'http'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('workflow webhook flow', () => {
  let server: Server
  let port: number
  let receivedRequests: Array<{ method: string; url: string; body: string; headers: Record<string, string> }> = []

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        receivedRequests.push({
          method: req.method ?? 'GET',
          url: req.url ?? '/',
          body,
          headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
        })
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true, echo: body }))
      })
    })
    await new Promise<void>(resolve => server.listen(0, () => resolve()))
    port = (server.address() as any).port
  })

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()))
    const db = createTestDb()
    const { workflows, workflowRuns } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    // Cleanup test workflow + runs
    const testWfs = await db.select().from(workflows).where(eq(workflows.name, 'WebhookFlowTest'))
    for (const wf of testWfs) {
      await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
      await db.delete(workflows).where(eq(workflows.id, wf.id))
    }
  })

  it('fires a webhook step and records HTTP 200 in step_results', async () => {
    receivedRequests = []
    const db = createTestDb()
    const { workflows, workflowRuns } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [wf] = await db.insert(workflows).values({
      name: 'WebhookFlowTest',
      trigger: 'test.webhook_flow',
      isActive: true,
      steps: [
        {
          id: 'wh1',
          action: 'webhook_call',
          config: {
            url: `http://localhost:${port}/test`,
            method: 'POST',
            body: { name: '{{data.name}}' },
          },
        },
      ],
    }).returning()

    const { WorkflowEngine } = await import('@/lib/services/workflow')
    await WorkflowEngine.fire('test.webhook_flow', { name: 'Acme' })

    // The fire is fire-and-forget; wait briefly for engine to complete
    await new Promise(r => setTimeout(r, 500))

    const runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    expect(runs.length).toBeGreaterThan(0)
    const stepResults = runs[0].stepResults as Array<{ status: string; result?: { status: number; body: unknown } }>
    expect(stepResults[0].status).toBe('completed')
    expect(stepResults[0].result?.status).toBe(200)

    expect(receivedRequests.length).toBeGreaterThan(0)
    expect(receivedRequests[0].method).toBe('POST')
    expect(JSON.parse(receivedRequests[0].body).name).toBe('Acme')
  })
})
```

- [ ] **Step 3: Trigger-fires Smoke-Test**

Create `src/__tests__/integration-real/workflow-trigger-fires.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('workflow trigger fires', () => {
  let companyId: string
  let workflowId: string

  beforeAll(async () => {
    const db = createTestDb()
    const { companies, workflows } = await import('@/lib/db/schema')
    const [c] = await db.insert(companies).values({ name: `WfTrig-${Date.now()}` }).returning()
    companyId = c.id

    const [wf] = await db.insert(workflows).values({
      name: 'TriggerFiresSmoke',
      trigger: 'order.created',
      isActive: true,
      steps: [{ id: 'log1', action: 'log_activity', config: { type: 'note', content: 'order seen' } }],
    }).returning()
    workflowId = wf.id
  })

  afterAll(async () => {
    const db = createTestDb()
    const { workflows, workflowRuns, companies, orders, activities } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, workflowId))
    await db.delete(workflows).where(eq(workflows.id, workflowId))
    await db.delete(activities).where(eq(activities.companyId, companyId))
    try { await db.delete(orders).where(eq(orders.companyId, companyId)) } catch {}
    await db.delete(companies).where(eq(companies.id, companyId))
  })

  it('OrderService.create fires order.created and creates a workflow run', async () => {
    const db = createTestDb()
    const { workflowRuns } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { OrderService } = await import('@/lib/services/order.service')

    // Adjust input shape to whatever OrderService.create requires.
    const created = await OrderService.create({
      companyId,
      title: 'Workflow-Trigger-Test',
      // additional required fields per CreateOrderInput — implementer fills in
    } as any)

    // Wait for fire-and-forget workflow to complete
    await new Promise(r => setTimeout(r, 500))

    const runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, workflowId))
    expect(runs.length).toBeGreaterThan(0)
    const triggerData = runs[0].triggerData as Record<string, unknown>
    expect(triggerData.orderId).toBe(created.id)
    expect(triggerData.companyId).toBe(companyId)
  })
})
```

- [ ] **Step 4: Tests ausführen (soft)**

Run: `npx vitest run src/__tests__/integration-real/workflow-webhook-flow.test.ts src/__tests__/integration-real/workflow-trigger-fires.test.ts 2>&1 | tail -20`

Expected:
- Skipped wenn `TEST_DATABASE_URL` fehlt — akzeptabel (CI-only).
- Pass wenn DB verfügbar und `OrderService.create`-Eingabe-Shape korrekt.

Falls Tests aus Code-Gründen fehlschlagen (z.B. `OrderService.create`-Input-Shape hat zusätzliche Pflichtfelder): Eingabe entsprechend ergänzen — der `as any`-Cast ist Platzhalter, keine permanente Lösung.

- [ ] **Step 5: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "workflow-webhook-flow|workflow-trigger-fires" | head`
Expected: No output.

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/integration-real/workflow-webhook-flow.test.ts src/__tests__/integration-real/workflow-trigger-fires.test.ts
git commit -m "test(workflow): integration tests for webhook flow + trigger fires"
```

---

## Task 9: Manual E2E + Deploy

**Files:** none

- [ ] **Step 1: Lokal testen**

1. App starten (`npm run dev`).
2. Als Admin einloggen, zu `/intern/settings/workflows` navigieren.
3. Neuen Workflow „Webhook-Test" anlegen mit Trigger `contact.submitted`.
4. Step `webhook_call` hinzufügen mit:
   - URL: `https://webhook.site/<deine-id>` (eindeutige URL von webhook.site holen).
   - Method: `POST`.
   - Body: `{"firma": "{{data.company}}", "email": "{{data.email}}"}`.
5. Workflow speichern + aktiv schalten.
6. Im Public-Site das Kontaktformular absenden mit ausgefüllter Firma + Email.
7. Auf webhook.site sollte ein POST-Request mit dem Body ankommen, Templating korrekt aufgelöst.
8. Workflow-Run-History in der UI sollte 1 Run mit Step-Result `status: 200` zeigen.

- [ ] **Step 2: Trigger-Smoke**

1. Im UI einen Workflow für `order.created` mit `log_activity`-Step (oder einem anderen No-Op-Step) anlegen.
2. Über `/intern/orders` einen neuen Auftrag anlegen.
3. Run-History prüfen: 1 Run, Status completed, `triggerData.orderId` matched.

- [ ] **Step 3: Deploy**

```bash
git push
```

Warten bis Deploy durch ist. Die neue Action ist sofort verfügbar (kein DB-Migration nötig). Bestandsworkflows funktionieren weiter.

---

## Self-Review Notes

**Spec-Coverage-Check:**

- §3.1 Webhook-Action → Task 3 (action + helper + tests).
- §3.2 Trigger-Registry → Task 1.
- §3.3 Fire-Calls → Tasks 6+7 (alle 9 neuen Stellen, Spec hatte 11 — die 2 contract-Trigger sind wegen fehlendem ContractService deferred, dokumentiert im Plan-Header).
- §3.4 UI-Konsolidierung → Task 2 + Task 5 (step.id-UI-Generierung).
- §3.5 Engine-Fix → Task 4.
- §4 Sicherheit → in der Action-Implementation (URL-Whitelist explizit out-of-scope, Mustache-Resolver stringifies, Auth-Header).
- §5 Error-Handling → in webhook_call execute + Tests.
- §6 Testing → Tasks 3, 4, 8.
- §7 Audit → bestehender stepResults-Mechanismus, kein extra Code.

**Placeholder-Scan:**
- Task 5: „Stage nur Files die du tatsächlich angefasst hast" — bewusste Anweisung, kein Placeholder.
- Task 6 Step 2 (`lead.scored`): Variablenname `priority` nur falls vorhanden → Implementer-Entscheidung, aber konkret beschrieben.
- Task 7 Step 3 (`order.status_changed`): `previousStatus` muss verfügbar sein, sonst vorher laden — mit Fallback-Pattern beschrieben.
- Task 8 Step 3 (`OrderService.create`-Input): `as any`-Cast als Platzhalter mit expliziter Anweisung, das Eingabe-Shape im Plan-Implementer-Schritt zu vervollständigen.

Keine echten Plan-Failures.

**Type-Consistency:**
- `WORKFLOW_TRIGGERS` / `TRIGGER_LABELS` Export-Names konsistent in Tasks 1, 2.
- `webhook_call`-Action-Name konsistent in Tasks 3, 8.
- `step.id` als optionales Feld konsistent in Tasks 4, 5.
- Fire-Call-Pattern (dynamic `import` + catch) identisch in Tasks 6, 7.

**Risiken:**
- `LeadService.autoScore` ist non-blocking (`this.autoScore(lead.id).catch(...)`); der `lead.scored`-Fire-Call dort ist asynchron und kann verschwinden falls die Methode den `score` nicht in scope hat. Implementer-Anweisung in Task 6 Step 2 deckt das ab.
- `OrderService.transitionStatus`-Methodenname ist verifiziert. `previousStatus` müsste in der Methode existieren oder vor dem Update geladen werden — Plan dokumentiert beide Varianten.
- Die UI-Step-ID-Generierung (Task 5) ist abhängig von der genauen Stelle im UI-Code; Implementer muss die Stelle finden. Alternative falls UI-Editor stark anders aussieht: Step-ID kann auch serverseitig im POST-Handler generiert werden — dann ist Task 5 ein API-Handler-Fix statt UI.
