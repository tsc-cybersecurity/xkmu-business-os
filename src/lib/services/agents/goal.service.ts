/**
 * GoalService — Goal-Lifecycle (CRUD + Start/Pause/Resume/Cancel).
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.1
 */

import type { ExecutionMode, GoalStatus } from './types'

export interface CreateGoalInput {
  title: string
  description?: string
  executionMode?: ExecutionMode
  budgetTokens?: number
  budgetCents?: number
  priority?: 1 | 2 | 3
  requirePlanApproval?: boolean
  createdByUserId?: string
}

export interface GoalListItem {
  id: string
  title: string
  status: GoalStatus
  priority: number
  spentCents: number
  createdAt: Date
}

export const GoalService = {
  async create(input: CreateGoalInput): Promise<{ id: string }> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')

    const [row] = await db
      .insert(agentGoals)
      .values({
        title: input.title,
        description: input.description ?? null,
        executionMode: input.executionMode ?? 'cron',
        status: 'draft',
        budgetTokens: input.budgetTokens ?? null,
        budgetCents: input.budgetCents ?? null,
        priority: input.priority ?? 2,
        requirePlanApproval: input.requirePlanApproval ?? false,
        createdByUserId: input.createdByUserId ?? null,
      })
      .returning({ id: agentGoals.id })
    return { id: row.id }
  },

  async start(goalId: string): Promise<{ runId: string; immediate?: { iterations: number; terminalReason: string } }> {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentSteps } = await import('@/lib/db/schema')
    const { eq, and } = await import('drizzle-orm')

    const [goal] = await db
      .select({ id: agentGoals.id, status: agentGoals.status, executionMode: agentGoals.executionMode })
      .from(agentGoals)
      .where(eq(agentGoals.id, goalId))
      .limit(1)
    if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
    if (goal.status !== 'draft') {
      throw new Error(`Goal ${goalId} bereits gestartet (status=${goal.status}) — nur draft-Goals koennen start() aufrufen`)
    }

    const { OrchestratorService } = await import('./orchestrator.service')
    const result = await OrchestratorService.plan(goalId)

    if (goal.executionMode === 'immediate') {
      // ready-Steps des frischen Run holen (status=pending)
      const readySteps = await db
        .select({ id: agentSteps.id })
        .from(agentSteps)
        .where(and(eq(agentSteps.runId, result.runId), eq(agentSteps.status, 'pending')))

      // Nur wenn genau 1 ready-Step: inline laufen lassen. Sonst Cron-Lane.
      if (readySteps.length === 1) {
        const { runImmediate } = await import('./immediate-lane.service')
        const inline = await runImmediate({ runId: result.runId, startStepIds: [readySteps[0].id] })
        return { runId: result.runId, immediate: inline }
      }
    }

    return { runId: result.runId }
  },

  async pause(goalId: string): Promise<void> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const [goal] = await db.select({ status: agentGoals.status }).from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
    if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
    if (goal.status !== 'running' && goal.status !== 'planning') {
      throw new Error(`pause() nur fuer running/planning Goals erlaubt (aktuell: ${goal.status})`)
    }

    await db.update(agentGoals).set({ status: 'paused', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
  },

  async resume(goalId: string): Promise<void> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const [goal] = await db.select({ status: agentGoals.status }).from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
    if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
    if (goal.status !== 'paused') {
      throw new Error(`resume() nur fuer paused Goals (aktuell: ${goal.status})`)
    }

    await db.update(agentGoals).set({ status: 'running', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
  },

  async cancel(goalId: string): Promise<void> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')
    const { logAgentEvent } = await import('./recovery/activity-log')

    const [goal] = await db.select({ status: agentGoals.status }).from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
    if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
    if (goal.status === 'done' || goal.status === 'failed' || goal.status === 'cancelled') {
      throw new Error(`Goal ${goalId} bereits terminal (status=${goal.status})`)
    }

    // Goal auf cancelled
    await db.update(agentGoals).set({ status: 'cancelled', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))

    // Pending Tasks aller Runs des Goals abraeumen — verhindert Geister-Steps nach Cancel.
    const cleanup = await db.execute(sql`
      UPDATE task_queue
      SET status='cancelled', error='goal cancelled by user', completed_at=NOW()
      WHERE status='pending'
        AND type IN ('agent_step_run','agent_replan','agent_continuation')
        AND (
          reference_id IN (SELECT id FROM agent_runs WHERE goal_id=${goalId})
          OR reference_id IN (SELECT id FROM agent_steps WHERE goal_id=${goalId})
        )
      RETURNING id
    `) as unknown as Array<{ id: string }>

    await logAgentEvent({
      action: 'agent.goal.cancel_cleanup',
      goalId,
      detail: `${cleanup.length} pending Task(s) abgeraeumt`,
      metadata: { cleanedTaskCount: cleanup.length },
    })
  },

  async list(limit = 50): Promise<GoalListItem[]> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { desc } = await import('drizzle-orm')

    const rows = await db
      .select({
        id: agentGoals.id,
        title: agentGoals.title,
        status: agentGoals.status,
        priority: agentGoals.priority,
        spentCents: agentGoals.spentCents,
        createdAt: agentGoals.createdAt,
      })
      .from(agentGoals)
      .orderBy(desc(agentGoals.createdAt))
      .limit(limit)

    return rows as GoalListItem[]
  },

  async getDetail(goalId: string) {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns, agentSteps } = await import('@/lib/db/schema')
    const { eq, desc } = await import('drizzle-orm')

    const [goal] = await db.select().from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
    if (!goal) return null

    const runs = await db.select().from(agentRuns).where(eq(agentRuns.goalId, goalId)).orderBy(desc(agentRuns.createdAt))
    const latestRunId = runs[0]?.id ?? null
    const steps = latestRunId
      ? await db.select().from(agentSteps).where(eq(agentSteps.runId, latestRunId)).orderBy(agentSteps.createdAt)
      : []

    return { goal, runs, steps, latestRunId }
  },
}
