// ============================================
// Mirofish — Type-Definitionen fuer Request/Response
// ============================================
// Mirofish ist ein selbst gehostetes AGPL-KI-Simulationstool
// (https://github.com/666ghj/MiroFish). Es nimmt eine natuerlichsprachliche
// Frage + seed materials (z.B. ein Businessplan-Markdown) entgegen und
// liefert einen strukturierten Simulationsbericht zurueck.
//
// Backend-Endpoint: POST /simulate (Port 5001 im Docker-Netz, intern als
// http://mirofish:5001 erreichbar).

export type MirofishSeedContentType = 'text/markdown' | 'application/pdf' | 'text/plain'

export interface MirofishSeedMaterial {
  filename: string
  contentType: MirofishSeedContentType
  /** Bei text/markdown + text/plain: roher String. Bei application/pdf: base64-codiert. */
  content: string
}

export interface MirofishSimulateRequest {
  /** Natuerlichsprachliche Frage an die Simulation, Deutsch erlaubt. */
  question: string
  /** Dokumente, die als Kontext fuer die Simulation dienen. */
  seedMaterials: MirofishSeedMaterial[]
}

export type MirofishRiskSeverity = 'low' | 'medium' | 'high'

export interface MirofishRiskSignal {
  severity: MirofishRiskSeverity
  description: string
}

export interface MirofishNarrativePath {
  persona: string
  reaction: string
  reasoning: string
}

export interface MirofishSimulateResult {
  summary: string
  riskSignals: MirofishRiskSignal[]
  narrativePaths: MirofishNarrativePath[]
  followUpQuestions: string[]
  /** Original-Response des Mirofish-Backends fuer Debug + Persistenz. */
  rawResponse: unknown
}
