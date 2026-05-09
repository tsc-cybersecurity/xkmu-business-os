/**
 * Cost Tracker — schreibt agent_cost_events und aggregiert Run/Goal-Spend.
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
  async record(input: CostEventInput): Promise<void> {
    const { db } = await import('@/lib/db')
    const { agentCostEvents, agentGoals, agentRuns } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const totalTokens = input.inputTokens + input.outputTokens

    await db.insert(agentCostEvents).values({
      runId: input.runId ?? null,
      stepId: input.stepId ?? null,
      goalId: input.goalId ?? null,
      provider: input.provider,
      model: input.model,
      callRole: input.callRole,
      inputTokens: input.inputTokens,
      cachedInputTokens: input.cachedInputTokens ?? 0,
      outputTokens: input.outputTokens,
      costCents: input.costCents,
    })

    if (input.goalId) {
      await db
        .update(agentGoals)
        .set({
          spentTokens: sql`${agentGoals.spentTokens} + ${totalTokens}`,
          spentCents: sql`${agentGoals.spentCents} + ${input.costCents}`,
          updatedAt: sql`now()`,
        })
        .where(eq(agentGoals.id, input.goalId))
    }

    if (input.runId) {
      await db
        .update(agentRuns)
        .set({
          inputTokens: sql`${agentRuns.inputTokens} + ${input.inputTokens}`,
          outputTokens: sql`${agentRuns.outputTokens} + ${input.outputTokens}`,
          cachedInputTokens: sql`${agentRuns.cachedInputTokens} + ${input.cachedInputTokens ?? 0}`,
          costCents: sql`${agentRuns.costCents} + ${input.costCents}`,
          updatedAt: sql`now()`,
        })
        .where(eq(agentRuns.id, input.runId))
    }
  },

  async checkBudget(goalId: string): Promise<BudgetCheckResult> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [row] = await db
      .select({
        spentTokens: agentGoals.spentTokens,
        spentCents: agentGoals.spentCents,
        budgetTokens: agentGoals.budgetTokens,
        budgetCents: agentGoals.budgetCents,
      })
      .from(agentGoals)
      .where(eq(agentGoals.id, goalId))
      .limit(1)

    if (!row) {
      return { exceeded: false, reason: null, spentTokens: 0, spentCents: 0, budgetTokens: null, budgetCents: null }
    }

    const tokensExceeded = row.budgetTokens != null && row.spentTokens >= row.budgetTokens
    const centsExceeded = row.budgetCents != null && row.spentCents >= row.budgetCents

    return {
      exceeded: tokensExceeded || centsExceeded,
      reason: tokensExceeded ? 'tokens' : centsExceeded ? 'cents' : null,
      spentTokens: row.spentTokens,
      spentCents: row.spentCents,
      budgetTokens: row.budgetTokens,
      budgetCents: row.budgetCents,
    }
  },
}
