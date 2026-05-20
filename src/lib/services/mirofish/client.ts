// ============================================
// MirofishClient
// ============================================
// REST-Client fuer das selbst gehostete Mirofish-Backend (Port 5001 im
// internen Docker-Netz, http://mirofish:5001). Wird vom Businessplan-
// IterationService benutzt, um einen Plan-Markdown zur Simulation zu
// schicken und den strukturierten Bericht zurueckzubekommen.
//
// Base-URL aus process.env.MIROFISH_BASE_URL (Default Service-DNS-Name).
// 5-Minuten-Timeout pro Request — Mirofish laeuft seine eigene LLM-
// Inference und kann je nach Modell mehrere Sekunden bis Minuten brauchen.

import { logger } from '@/lib/utils/logger'
import type { MirofishSimulateRequest, MirofishSimulateResult } from './types'

const DEFAULT_BASE_URL = 'http://mirofish:5001'
const SIMULATE_TIMEOUT_MS = 5 * 60 * 1000

function getBaseUrl(): string {
  const fromEnv = process.env.MIROFISH_BASE_URL?.trim()
  return fromEnv || DEFAULT_BASE_URL
}

function normalizeResult(raw: unknown): MirofishSimulateResult {
  // Mirofish gibt Felder in snake_case zurueck — wir mappen auf camelCase.
  // Defensiv: bei fehlenden Feldern leere Defaults setzen, damit Konsumenten
  // nicht durch undefined-Zugriffe crashen.
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    summary: typeof r.summary === 'string' ? r.summary : '',
    riskSignals: Array.isArray(r.risk_signals)
      ? r.risk_signals.filter((x): x is { severity: string; description: string } =>
          x !== null && typeof x === 'object' && 'severity' in x && 'description' in x,
        ).map((x) => ({
          severity: (['low', 'medium', 'high'] as const).includes(x.severity as 'low')
            ? (x.severity as 'low' | 'medium' | 'high')
            : 'medium',
          description: String(x.description),
        }))
      : [],
    narrativePaths: Array.isArray(r.narrative_paths)
      ? r.narrative_paths.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
        .map((x) => ({
          persona: typeof x.persona === 'string' ? x.persona : '',
          reaction: typeof x.reaction === 'string' ? x.reaction : '',
          reasoning: typeof x.reasoning === 'string' ? x.reasoning : '',
        }))
      : [],
    followUpQuestions: Array.isArray(r.follow_up_questions)
      ? r.follow_up_questions.map((q) => String(q))
      : [],
    rawResponse: raw,
  }
}

export const MirofishClient = {
  /**
   * GET / oder /health — Mirofish hat keinen dokumentierten Health-Endpoint,
   * daher reicht uns ein erfolgreicher Connect auf den Root.
   */
  async healthcheck(): Promise<boolean> {
    const baseUrl = getBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/`, { method: 'GET' })
      return res.ok
    } catch (err) {
      logger.warn(
        `Mirofish healthcheck failed: ${err instanceof Error ? err.message : String(err)}`,
        { module: 'MirofishClient' },
      )
      return false
    }
  },

  /**
   * POST /simulate — schickt Frage + Seed-Material an Mirofish, gibt den
   * normalisierten Simulationsbericht zurueck. Wirft bei HTTP-Fehler oder
   * Timeout.
   */
  async simulate(req: MirofishSimulateRequest): Promise<MirofishSimulateResult> {
    const baseUrl = getBaseUrl()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SIMULATE_TIMEOUT_MS)
    try {
      const res = await fetch(`${baseUrl}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal,
      })
      if (!res.ok) {
        const errorBody = await res.text().catch(() => '')
        throw new Error(`Mirofish responded with HTTP ${res.status}: ${errorBody.slice(0, 200)}`)
      }
      const raw = await res.json()
      return normalizeResult(raw)
    } finally {
      clearTimeout(timer)
    }
  },
}
