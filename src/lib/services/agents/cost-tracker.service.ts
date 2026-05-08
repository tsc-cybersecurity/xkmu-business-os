/**
 * Cost Tracker — schreibt agent_cost_events und aggregiert Run/Goal-Spend.
 * Phase 1: Skeleton. Implementation in Phase 4 (Orchestrator-Loop).
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.3
 */

import type { CallRole } from './types'

export interface CostEventInput {
  runId?: string
  stepId?: string
  goalId?: string
  provider: string
  model: string
  callRole: CallRole
  inputTokens: number
  cachedInputTokens?: number
  outputTokens: number
  costCents: number
}

export interface BudgetCheckResult {
  exceeded: boolean
  reason: 'tokens' | 'cents' | null
  spentTokens: number
  spentCents: number
  budgetTokens: number | null
  budgetCents: number | null
}

export const CostTrackerService = {
  async record(_input: CostEventInput): Promise<void> {
    throw new Error('CostTrackerService.record: nicht implementiert (Phase 4)')
  },

  async checkBudget(_goalId: string): Promise<BudgetCheckResult> {
    throw new Error('CostTrackerService.checkBudget: nicht implementiert (Phase 4)')
  },
}
