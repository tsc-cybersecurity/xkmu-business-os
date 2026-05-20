// ============================================
// Mirofish — Types fuer Multi-Step-Simulations-Client
// ============================================
// Mirofish ist ein KI-Multi-Agent-Simulationstool. Wir nutzen es generisch
// fuer JEDE Art von Input (Businessplan, Marketing-Kampagne, Policy-
// Aenderung etc.) — der Input wird als seed materials uebergeben, dann
// laeuft eine mehrstufige Pipeline gegen Mirofish.
//
// Lifecycle (alles vom MirofishClient.simulate gekapselt):
//   1. POST /api/graph/ontology/generate  → project_id + ontology
//   2. POST /api/graph/build              → task_id
//   3. GET  /api/graph/task/<task_id>     → poll until completed → graph_id
//   4. POST /api/simulation/create        → simulation_id
//   5. POST /api/simulation/prepare       → prepare-task_id
//   6. POST /api/simulation/prepare/status → poll until ready
//   7. POST /api/simulation/start         → simulation startet im Hintergrund
//   8. GET  /api/simulation/<id>/run-status → poll until completed
//   9. GET  /api/simulation/<id>/timeline + /posts + /comments + /agent-stats

export type MirofishSeedContentType = 'text/markdown' | 'application/pdf' | 'text/plain'

export interface MirofishSeedMaterial {
  filename: string
  contentType: MirofishSeedContentType
  /** Bei text/markdown + text/plain: roher String. Bei application/pdf: base64. */
  content: string
}

export interface MirofishSimulateOptions {
  /** Natuerlichsprachliche Beschreibung, was simuliert werden soll. */
  simulationRequirement: string
  seedMaterials: MirofishSeedMaterial[]
  /** Optionaler Projektname zur Identifikation im Mirofish-UI. */
  projectName?: string
  /** Optionaler zusaetzlicher Kontext. */
  additionalContext?: string
  /** Default true — Twitter-Persona-Simulation aktivieren. */
  enableTwitter?: boolean
  /** Default true — Reddit-Persona-Simulation aktivieren. */
  enableReddit?: boolean
  /** Default 20 — max. Simulations-Runden. Kleiner = schneller, weniger reichhaltig. */
  maxRounds?: number
  /** Polling-Intervall in ms (Default 3000). */
  pollIntervalMs?: number
  /** Hard cap fuer die ganze Pipeline in ms (Default 20 Min). */
  totalTimeoutMs?: number
}

export interface MirofishSimulationResult {
  simulationId: string
  projectId: string
  graphId: string
  status: 'completed' | 'partial' | 'failed'
  /** Aggregierter Bericht — was Mirofish im Simulationslauf produziert hat. */
  timeline: unknown[]
  posts: unknown[]
  comments: unknown[]
  agentStats: unknown[]
  /** Wieviele Sekunden hat die ganze Pipeline gebraucht. */
  durationSeconds: number
  /** Detaillierter Run-Status zum Zeitpunkt der finalen Abfrage. */
  finalRunStatus: Record<string, unknown>
  /** Fehlertext falls status != 'completed'. */
  error?: string
}

// ─── Interne Step-Response-Typen (snake_case vom Mirofish-Backend) ──────

export interface MirofishApiResponse<T> {
  success: boolean
  error?: string
  data?: T
}

export interface OntologyGenerateData {
  project_id: string
  ontology: unknown
  files: unknown[]
  total_text_length: number
}

export interface GraphBuildData {
  project_id: string
  task_id: string
  message: string
}

export interface GraphTaskData {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  result?: { graph_id?: string; [key: string]: unknown }
  error?: string
}

export interface SimulationCreateData {
  simulation_id: string
  project_id: string
  graph_id: string
  status: string
}

export interface SimulationPrepareData {
  task_id: string
  simulation_id?: string
}

export interface SimulationPrepareStatusData {
  task_id?: string
  status: 'processing' | 'completed' | 'ready' | 'failed'
  progress?: number
  message?: string
  already_prepared?: boolean
  prepare_info?: unknown
  error?: string
}

export interface SimulationRunStatusData {
  simulation_id: string
  runner_status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped'
  current_round?: number
  total_rounds?: number
  progress_percent?: number
  total_actions_count?: number
  [key: string]: unknown
}

// Legacy alias — backward-compatibility fuer den alten einfachen Result-Shape,
// damit aufrufender Code (z.B. analyzeSimulationAction, UI) weiterhin lesen kann.
export interface MirofishLegacyResult {
  summary: string
  riskSignals: Array<{ severity: 'low' | 'medium' | 'high'; description: string }>
  narrativePaths: Array<{ persona: string; reaction: string; reasoning: string }>
  followUpQuestions: string[]
  rawResponse: unknown
}
