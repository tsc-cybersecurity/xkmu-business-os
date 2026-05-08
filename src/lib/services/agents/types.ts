/**
 * Shared TypeScript-Types für das Agent-Subsystem.
 * Wird in Phase 1 als Skelett angelegt, in Folge-Phasen erweitert.
 */

import type { AgentGoal, AgentRun, AgentStep, AgentDefinition, AgentMemoryEntry } from '@/lib/db/schema'

// ── Public Re-Exports ──────────────────────────────────────────────────────
export type { AgentGoal, AgentRun, AgentStep, AgentDefinition, AgentMemoryEntry }

// ── Tool-Namespace-Schema ──────────────────────────────────────────────────
export type ToolNamespace = 'memory' | 'workflow' | 'prompt' | 'service' | 'agent'

export interface ToolRef {
  namespace: ToolNamespace
  name: string                  // e.g. 'search', 'lead.created', 'lead_research'
  raw: string                   // 'memory:search'
}

// ── Run-Lifecycle-Status ───────────────────────────────────────────────────
export type GoalStatus =
  | 'draft' | 'planning' | 'awaiting_approval'
  | 'running' | 'paused' | 'done' | 'failed' | 'cancelled'

export type RunStatus =
  | 'planning' | 'executing' | 'replanning'
  | 'succeeded' | 'failed' | 'cancelled'

export type StepStatus =
  | 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'

export type ExecutionMode = 'cron' | 'immediate'

// ── Memory-Refs ────────────────────────────────────────────────────────────
/** memory://<scope> oder memory://<scope>#<itemId> */
export type MemoryRef = `memory://${string}`

// ── Step-Plan (vom Orchestrator erzeugt) ───────────────────────────────────
export interface PlannedStep {
  stepKey: string
  workerType: string            // 'workflow:lead.created' | 'prompt:research' | 'service:lead-research' | 'agent:writer'
  config: Record<string, unknown>
  contextRefs: MemoryRef[]
  dependsOnStepKeys: string[]
  nextStepMode?: ExecutionMode
}

// ── Worker-Result ──────────────────────────────────────────────────────────
export interface WorkerResult {
  status: 'succeeded' | 'failed'
  resultJson?: Record<string, unknown>
  resultSummary: string         // max 500 chars
  resultDocumentId?: string
  inputTokens?: number
  outputTokens?: number
  costCents?: number
  error?: string
  /** Optionale Auto-Memory-Persistierung. */
  memoryWrite?: { para: string; scope: string; body: string }
}

// ── Cost-Event-Roles ───────────────────────────────────────────────────────
export type CallRole =
  | 'orchestrator_plan'
  | 'orchestrator_replan'
  | 'smart_worker'
  | 'memory_embed'
  | 'memory_compact'

// ── Task-Queue-Types fürs Agent-Subsystem ──────────────────────────────────
export const AGENT_TASK_TYPES = {
  STEP_RUN: 'agent_step_run',
  REPLAN: 'agent_replan',
  CONTINUATION: 'agent_continuation',
} as const

export type AgentTaskType = typeof AGENT_TASK_TYPES[keyof typeof AGENT_TASK_TYPES]
