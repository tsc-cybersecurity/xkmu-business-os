/**
 * Memory Embedding — Gemini text-embedding-004 (768 Dimensionen).
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.4
 */

const GEMINI_EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent'
const EXPECTED_DIM = 768
const FETCH_TIMEOUT_MS = 30_000

export async function embedText(text: string): Promise<number[]> {
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
  return values
}

export const EMBEDDING_DIMENSION = EXPECTED_DIM
