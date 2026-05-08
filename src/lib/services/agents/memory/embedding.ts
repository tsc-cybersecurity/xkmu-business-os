/**
 * Memory Embedding — Gemini text-embedding-004 (768 Dimensionen).
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.4 + §5.3
 */

const GEMINI_EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent'
const EXPECTED_DIM = 768
const FETCH_TIMEOUT_MS = 30_000

// Gemini text-embedding-004 ist aktuell free-tier; Cents-Schaetzung 0 fuer
// Tracking-Vollstaendigkeit. Wenn paid: 0.00001 USD per 1k input tokens
// (~0.001 cent fuer typische 100-token-Eingabe). Wir tracken Token-Anzahl,
// Cents = 0 bis ein bezahlter Tier konfiguriert wird.
const EMBED_COST_CENTS_PER_CALL = 0

export interface EmbedTextOptions {
  /** Optional: wenn gesetzt, schreibt CostTrackerService einen agent_cost_events-Eintrag */
  costContext?: {
    runId?: string
    stepId?: string
    goalId?: string
  }
}

export async function embedText(text: string, options?: EmbedTextOptions): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('GOOGLE_AI_API_KEY nicht konfiguriert')
  }
  const response = await fetch(GEMINI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Embedding-Request fehlgeschlagen: ${response.status} ${detail}`)
  }
  const json = (await response.json()) as { embedding?: { values?: number[] } }
  const values = json.embedding?.values
  if (!values || !Array.isArray(values)) {
    throw new Error('Embedding-Response: values fehlen')
  }
  if (values.length !== EXPECTED_DIM) {
    throw new Error(`Embedding-Dimension ${values.length} != erwartete ${EXPECTED_DIM}`)
  }

  // Cost-Tracking (non-fatal — wenn fehlschlaegt, embedding-Result trotzdem zurueck)
  if (options?.costContext) {
    try {
      const { CostTrackerService } = await import('../cost-tracker.service')
      // Token-Schaetzung: ~4 chars per token (Gemini-Tokenizer ist proprietaer,
      // diese Heuristik reicht fuer Aggregation/Throttling)
      const estimatedInputTokens = Math.ceil(text.length / 4)
      await CostTrackerService.record({
        runId: options.costContext.runId,
        stepId: options.costContext.stepId,
        goalId: options.costContext.goalId,
        provider: 'gemini',
        model: 'text-embedding-004',
        callRole: 'memory_embed',
        inputTokens: estimatedInputTokens,
        outputTokens: 0,
        costCents: EMBED_COST_CENTS_PER_CALL,
      })
    } catch {
      // ignore — embedding bleibt valide, nur cost-event fehlt
    }
  }

  return values
}

export const EMBEDDING_DIMENSION = EXPECTED_DIM
