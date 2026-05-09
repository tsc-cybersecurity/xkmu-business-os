/**
 * SystemPromptService — laed System-Prompts aus agent_definitions per Slug.
 *
 * Drei verwaltbare Prompts:
 *   - orchestrator-plan        — fuer OrchestratorService.plan()
 *   - orchestrator-replan      — fuer OrchestratorService.replan()
 *   - smart-worker-loop-suffix — wird an jeden Smart-Worker-System-Prompt angehaengt
 *
 * In-Memory-Cache (lazy, pro Prozess). Hartcoded-Fallback wenn DB-Lookup fehlschlaegt
 * — die Agent-Pipeline darf nicht abstuerzen wenn ein User versehentlich loescht.
 */

const FALLBACK_PROMPTS: Record<string, { systemPrompt: string; modelHint: string | null }> = {
  'orchestrator-plan': {
    systemPrompt: `Du bist der Orchestrator-Agent eines KI-getriebenen Business-OS. Dein Job:
1. Du bekommst ein Goal (Titel + Beschreibung).
2. Du bekommst eine Liste verfuegbarer Tools (jedes mit namespace:name + Kurzbeschreibung).
3. Du bekommst optional Memory-Refs aus dem Wissensspeicher.
4. Du erstellst einen Plan: 1-15 Steps, die das Goal in atomare Tool-Aufrufe zerlegen.

REGELN:
- Antworte AUSSCHLIESSLICH mit valider JSON gemaess dem Schema.
- Keine Erklaerungen ausserhalb der JSON.
- workerType MUSS das Format <namespace>:<name> haben (memory|workflow|prompt|service|agent).
- stepKey ist ein eindeutiger kurzer Slug.
- dependsOnStepKeys: andere Steps die fertig sein muessen bevor dieser laeuft.
- contextRefs: Memory-Refs als "memory://<scope>" Strings.
- Halte den Plan minimal. YAGNI.

JSON-SCHEMA:
{
  "reasoning": "1-3 Saetze",
  "steps": [{"stepKey": "string", "workerType": "namespace:name", "config": {}, "contextRefs": [], "dependsOnStepKeys": []}]
}`,
    modelHint: 'gemini-2.5-flash',
  },
  'orchestrator-replan': {
    systemPrompt: `Du bist der Orchestrator-Agent. Ein Run laeuft, einige Steps sind fertig.

Entscheide: weiter? fertig? pausieren? fehlschlagen?

REGELN:
- Antworte AUSSCHLIESSLICH mit valider JSON gemaess dem Schema.
- action: "continue" | "goal_complete" | "pause" | "fail"
- Bei "continue": newSteps mit weiteren Steps (jeder Step exakt mit den Feldern unten).
- Bei "goal_complete"/"pause"/"fail": newSteps muss leeres Array [] sein.
- workerType MUSS Format <namespace>:<name> haben (memory|workflow|prompt|service|agent).
- stepKey ist ein eindeutiger kurzer Slug (z.B. "research-acme", "draft-summary").
- nextStepMode optional bei einzelnen Folge-Steps: "immediate" wenn dringend, sonst "cron".

JSON-SCHEMA:
{
  "action": "continue|goal_complete|pause|fail",
  "reasoning": "1-3 Saetze warum diese Entscheidung",
  "newSteps": [
    {
      "stepKey": "eindeutiger-slug",
      "workerType": "namespace:name",
      "config": { /* tool-spezifische Inputs */ },
      "contextRefs": ["memory://..."],
      "dependsOnStepKeys": ["other-step-key"]
    }
  ],
  "nextStepMode": "cron|immediate"
}`,
    modelHint: 'gemini-2.5-flash-lite',
  },
  'smart-worker-loop-suffix': {
    systemPrompt: `

DU BIST EIN SMART-WORKER MIT EIGENEM TOOL-USE-LOOP.

In jeder Iteration antwortest du AUSSCHLIESSLICH mit JSON:

Variante A — Tool aufrufen:
{ "toolCall": { "ref": "namespace:name", "input": {} }, "reasoning": "1 Satz" }

Variante B — Auftrag fertig:
{ "final": "Ergebnis (max 2000 Zeichen)", "reasoning": "1 Satz" }

REGELN:
- Maximal Iterationen wie Definition.maxIterations.
- Keine Erklaerungen ausserhalb der JSON.
- Niemals ein Tool aufrufen, das nicht in der Tool-Liste steht.`,
    modelHint: 'gemini-2.5-flash-lite',
  },
}

const cache = new Map<string, { systemPrompt: string; modelHint: string | null }>()

export interface ResolvedSystemPrompt {
  systemPrompt: string
  modelHint: string | null
  /** true wenn aus DB geladen, false wenn Fallback aktiv. */
  fromDb: boolean
}

export const SystemPromptService = {
  async get(slug: keyof typeof FALLBACK_PROMPTS | string): Promise<ResolvedSystemPrompt> {
    if (cache.has(slug)) {
      const cached = cache.get(slug)!
      return { ...cached, fromDb: true }
    }

    try {
      const { db } = await import('@/lib/db')
      const { agentDefinitions } = await import('@/lib/db/schema')
      const { eq, and } = await import('drizzle-orm')

      const [row] = await db
        .select({ systemPrompt: agentDefinitions.systemPrompt, modelHint: agentDefinitions.modelHint })
        .from(agentDefinitions)
        .where(and(eq(agentDefinitions.slug, slug), eq(agentDefinitions.isActive, true)))
        .limit(1)

      if (row && row.systemPrompt) {
        const value = { systemPrompt: row.systemPrompt, modelHint: row.modelHint }
        cache.set(slug, value)
        return { ...value, fromDb: true }
      }
    } catch {
      // DB nicht erreichbar — nutze Fallback
    }

    const fallback = FALLBACK_PROMPTS[slug]
    if (!fallback) {
      throw new Error(`Kein System-Prompt fuer slug='${slug}' (weder DB noch Fallback)`)
    }
    return { ...fallback, fromDb: false }
  },

  /** Cache-Reset — fuer Tests + nach UI-Update via PATCH /api/agents/definitions/[id]. */
  _resetCache(): void {
    cache.clear()
  },
}
