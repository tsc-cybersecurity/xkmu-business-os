/**
 * Orchestrator-JSON-Parser — extrahiert JSON aus LLM-Output.
 * Robust gegen Markdown-Code-Blocks und Prosa-Begleittext.
 */

import type { z } from 'zod'

/**
 * Sucht das erste {...}-Objekt im Text mit Klammer-Matching.
 * Ignoriert {} innerhalb von Strings.
 */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escape) { escape = false; continue }
    if (c === '\\') { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function stripMarkdownCodeBlock(text: string): string {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  return match ? match[1] : text
}

export function parseOrchestratorJson<T>(raw: string, schema: z.ZodType<T>): T {
  const stripped = stripMarkdownCodeBlock(raw).trim()

  // Versuch 1: direkt parsen
  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    // Versuch 2: erstes JSON-Object aus dem Text extrahieren
    const extracted = extractFirstJsonObject(stripped)
    if (!extracted) {
      throw new Error(`Kein JSON-Objekt im LLM-Output gefunden: ${raw.slice(0, 200)}`)
    }
    try {
      parsed = JSON.parse(extracted)
    } catch (e) {
      throw new Error(`JSON-Parsing fehlgeschlagen: ${(e as Error).message}`)
    }
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`JSON-Schema-Violation: ${issues}`)
  }
  return result.data
}
