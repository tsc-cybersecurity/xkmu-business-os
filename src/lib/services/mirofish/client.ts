// ============================================
// MirofishClient — Multi-Step-Pipeline
// ============================================
// Mirofish hat KEINE einfache "simulate"-API — stattdessen eine 7-Stufen-
// Async-Pipeline. Dieser Client kapselt alle Schritte hinter einer einzigen
// MirofishClient.simulate(...)-Funktion, die nach 5-15 Minuten ein
// Ergebnis-Objekt zurueckgibt.
//
// Pipeline:
//   1. POST /api/graph/ontology/generate  (multipart upload: files + simulation_requirement)
//   2. POST /api/graph/build               → liefert task_id
//   3. GET  /api/graph/task/<task_id>      → poll bis status=completed, holt graph_id aus result
//   4. POST /api/simulation/create         (project_id + graph_id) → simulation_id
//   5. POST /api/simulation/prepare        → liefert task_id
//   6. POST /api/simulation/prepare/status (poll bis ready)
//   7. POST /api/simulation/start          (simulation_id, max_rounds)
//   8. GET  /api/simulation/<id>/run-status (poll bis runner_status=completed)
//   9. GET  /api/simulation/<id>/timeline + /posts + /comments + /agent-stats
//
// Base-URL aus process.env.MIROFISH_BASE_URL (Default http://mirofish:5001).

import { logger } from '@/lib/utils/logger'
import type {
  MirofishApiResponse,
  MirofishSimulateOptions,
  MirofishSimulationResult,
  OntologyGenerateData,
  GraphBuildData,
  GraphTaskData,
  SimulationCreateData,
  SimulationPrepareData,
  SimulationPrepareStatusData,
  SimulationRunStatusData,
} from './types'

const DEFAULT_BASE_URL = 'http://mirofish:5001'
const DEFAULT_POLL_INTERVAL_MS = 3_000
const DEFAULT_TOTAL_TIMEOUT_MS = 20 * 60 * 1000
const DEFAULT_MAX_ROUNDS = 20
const REQUEST_TIMEOUT_MS = 60_000 // pro Einzel-Request (nicht pro Polling-Loop)

function getBaseUrl(): string {
  const fromEnv = process.env.MIROFISH_BASE_URL?.trim()
  return fromEnv || DEFAULT_BASE_URL
}

// ─── Generische HTTP-Helpers ────────────────────────────────────────────────

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<MirofishApiResponse<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} on ${url}: ${body.slice(0, 200)}`)
    }
    return (await res.json()) as MirofishApiResponse<T>
  } finally {
    clearTimeout(timer)
  }
}

async function fetchMultipart<T>(
  url: string,
  form: FormData,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<MirofishApiResponse<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'POST', body: form, signal: controller.signal })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} on ${url}: ${body.slice(0, 200)}`)
    }
    return (await res.json()) as MirofishApiResponse<T>
  } finally {
    clearTimeout(timer)
  }
}

async function pollUntil<T>(
  fetchFn: () => Promise<T>,
  isDone: (v: T) => boolean,
  isFailed: (v: T) => boolean,
  totalDeadlineMs: number,
  intervalMs: number,
  label: string,
): Promise<T> {
  const start = Date.now()
  let last: T | undefined
  while (Date.now() - start < totalDeadlineMs) {
    const v = await fetchFn()
    last = v
    if (isFailed(v)) {
      throw new Error(`${label}: backend reports failed — ${JSON.stringify(v).slice(0, 300)}`)
    }
    if (isDone(v)) return v
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(`${label}: polling timed out after ${totalDeadlineMs}ms (last=${JSON.stringify(last).slice(0, 200)})`)
}

function unwrap<T>(resp: MirofishApiResponse<T>, step: string): T {
  if (!resp.success || !resp.data) {
    throw new Error(`${step} failed: ${resp.error ?? 'no data'}`)
  }
  return resp.data
}

// ─── Mirofish-Seed-Material → multipart-File ─────────────────────────────────

function seedToBlob(seed: { content: string; contentType: string }): Blob {
  if (seed.contentType === 'application/pdf') {
    // base64 → Uint8Array → Blob
    const bin = Buffer.from(seed.content, 'base64')
    return new Blob([new Uint8Array(bin)], { type: 'application/pdf' })
  }
  return new Blob([seed.content], { type: seed.contentType })
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const MirofishClient = {
  /**
   * Healthcheck — Mirofish hat keinen Root-Endpoint (GET / → 404),
   * jeder HTTP-Response gilt aber als "Flask lebt".
   */
  async healthcheck(): Promise<boolean> {
    const baseUrl = getBaseUrl()
    try {
      await fetch(`${baseUrl}/`, { method: 'GET' })
      return true
    } catch (err) {
      logger.warn(
        `Mirofish healthcheck failed: ${err instanceof Error ? err.message : String(err)}`,
        { module: 'MirofishClient' },
      )
      return false
    }
  },

  /**
   * Komplette Multi-Step-Simulation. Blockierend, kann 5-15 Minuten dauern.
   * Bei jedem Schritt wird der Fortschritt geloggt.
   */
  async simulate(options: MirofishSimulateOptions): Promise<MirofishSimulationResult> {
    const baseUrl = getBaseUrl()
    const pollInterval = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
    const totalTimeout = options.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS
    const maxRounds = options.maxRounds ?? DEFAULT_MAX_ROUNDS
    const overallDeadline = Date.now() + totalTimeout
    const start = Date.now()

    const remaining = () => Math.max(1000, overallDeadline - Date.now())
    const log = (msg: string) => logger.info(`Mirofish: ${msg}`, { module: 'MirofishClient' })

    // Schritt 1 — Ontology generieren (multipart)
    log('Step 1/8 — POST /api/graph/ontology/generate')
    const form = new FormData()
    form.append('simulation_requirement', options.simulationRequirement)
    if (options.projectName) form.append('project_name', options.projectName)
    if (options.additionalContext) form.append('additional_context', options.additionalContext)
    for (const seed of options.seedMaterials) {
      form.append('files', seedToBlob(seed), seed.filename)
    }
    const ontology = unwrap(
      await fetchMultipart<OntologyGenerateData>(`${baseUrl}/api/graph/ontology/generate`, form, 120_000),
      'ontology/generate',
    )
    const projectId = ontology.project_id
    log(`Step 1 done — project_id=${projectId}`)

    // Schritt 2 — Graph build (kickt Background-Task)
    log('Step 2/8 — POST /api/graph/build')
    const build = unwrap(
      await fetchJson<GraphBuildData>(`${baseUrl}/api/graph/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      }),
      'graph/build',
    )
    const buildTaskId = build.task_id
    log(`Step 2 done — task_id=${buildTaskId}`)

    // Schritt 3 — Poll graph task bis completed
    log(`Step 3/8 — GET /api/graph/task/${buildTaskId} (polling)`)
    const buildTask = await pollUntil<GraphTaskData>(
      async () => unwrap(
        await fetchJson<GraphTaskData>(`${baseUrl}/api/graph/task/${buildTaskId}`, { method: 'GET' }),
        'graph/task',
      ),
      (t) => t.status === 'completed',
      (t) => t.status === 'failed',
      remaining(),
      pollInterval,
      'graph build task',
    )
    const graphId = buildTask.result?.graph_id as string | undefined
    if (!graphId) throw new Error('graph build completed but no graph_id in result')
    log(`Step 3 done — graph_id=${graphId}`)

    // Schritt 4 — Simulation anlegen
    log('Step 4/8 — POST /api/simulation/create')
    const sim = unwrap(
      await fetchJson<SimulationCreateData>(`${baseUrl}/api/simulation/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          graph_id: graphId,
          enable_twitter: options.enableTwitter ?? true,
          enable_reddit: options.enableReddit ?? true,
        }),
      }),
      'simulation/create',
    )
    const simulationId = sim.simulation_id
    log(`Step 4 done — simulation_id=${simulationId}`)

    // Schritt 5 — Prepare (kickt LLM-Profile-Generation)
    log('Step 5/8 — POST /api/simulation/prepare')
    const prepare = unwrap(
      await fetchJson<SimulationPrepareData>(`${baseUrl}/api/simulation/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulation_id: simulationId }),
      }),
      'simulation/prepare',
    )
    const prepareTaskId = prepare.task_id
    log(`Step 5 done — prepare task_id=${prepareTaskId}`)

    // Schritt 6 — Poll prepare-status bis ready/completed
    log('Step 6/8 — POST /api/simulation/prepare/status (polling)')
    await pollUntil<SimulationPrepareStatusData>(
      async () => unwrap(
        await fetchJson<SimulationPrepareStatusData>(`${baseUrl}/api/simulation/prepare/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: prepareTaskId, simulation_id: simulationId }),
        }),
        'simulation/prepare/status',
      ),
      (s) => s.status === 'completed' || s.status === 'ready' || s.already_prepared === true,
      (s) => s.status === 'failed',
      remaining(),
      pollInterval,
      'simulation prepare',
    )
    log('Step 6 done — prepare ready')

    // Schritt 7 — Simulation starten
    log('Step 7/8 — POST /api/simulation/start')
    await fetchJson<unknown>(`${baseUrl}/api/simulation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        simulation_id: simulationId,
        platform: 'parallel',
        max_rounds: maxRounds,
      }),
    })
    log(`Step 7 done — simulation started (max_rounds=${maxRounds})`)

    // Schritt 8 — Poll run-status bis completed
    log('Step 8/8 — GET /api/simulation/<id>/run-status (polling)')
    const finalRunStatus = await pollUntil<SimulationRunStatusData>(
      async () => unwrap(
        await fetchJson<SimulationRunStatusData>(
          `${baseUrl}/api/simulation/${simulationId}/run-status`,
          { method: 'GET' },
        ),
        'simulation/run-status',
      ),
      (s) => s.runner_status === 'completed' || s.runner_status === 'stopped',
      (s) => s.runner_status === 'failed',
      remaining(),
      pollInterval * 2, // run-status braucht laenger pro Tick
      'simulation run',
    )
    log(`Step 8 done — runner_status=${finalRunStatus.runner_status}, total_actions=${finalRunStatus.total_actions_count}`)

    // Finale Ergebnisse aggregieren — alle 4 parallel
    log('Aggregating timeline/posts/comments/agent-stats')
    const [timelineRes, postsRes, commentsRes, agentStatsRes] = await Promise.all([
      fetchJson<unknown>(`${baseUrl}/api/simulation/${simulationId}/timeline`, { method: 'GET' }).catch(() => null),
      fetchJson<unknown>(`${baseUrl}/api/simulation/${simulationId}/posts?limit=200`, { method: 'GET' }).catch(() => null),
      fetchJson<unknown>(`${baseUrl}/api/simulation/${simulationId}/comments?limit=200`, { method: 'GET' }).catch(() => null),
      fetchJson<unknown>(`${baseUrl}/api/simulation/${simulationId}/agent-stats`, { method: 'GET' }).catch(() => null),
    ])

    const extractArray = (resp: MirofishApiResponse<unknown> | null): unknown[] => {
      if (!resp?.success) return []
      const d = resp.data as Record<string, unknown> | unknown[] | null
      if (Array.isArray(d)) return d
      if (d && typeof d === 'object') {
        // Mirofish liefert verschiedene Shapes — wir greifen die ueblichsten ab
        const obj = d as Record<string, unknown>
        if (Array.isArray(obj.timeline)) return obj.timeline as unknown[]
        if (Array.isArray(obj.posts)) return obj.posts as unknown[]
        if (Array.isArray(obj.comments)) return obj.comments as unknown[]
        if (Array.isArray(obj.stats)) return obj.stats as unknown[]
      }
      return []
    }

    const durationSeconds = Math.round((Date.now() - start) / 1000)
    log(`Simulation completed in ${durationSeconds}s`)

    return {
      simulationId,
      projectId,
      graphId,
      status: 'completed',
      timeline: extractArray(timelineRes),
      posts: extractArray(postsRes),
      comments: extractArray(commentsRes),
      agentStats: extractArray(agentStatsRes),
      durationSeconds,
      finalRunStatus: finalRunStatus as unknown as Record<string, unknown>,
    }
  },
}
