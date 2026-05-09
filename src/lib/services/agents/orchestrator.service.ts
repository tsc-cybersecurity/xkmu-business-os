/**
 * Orchestrator Service — Hauptagent-Loop.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §2.2 + §6
 */

import type { ExecutionMode, PlannedStep } from './types'
import { InitialPlanSchema, type InitialPlan } from './orchestrator/plan-types'
import { PLAN_SYSTEM_PROMPT, REPLAN_SYSTEM_PROMPT, ORCHESTRATOR_DEFAULT_MODEL_PLAN, ORCHESTRATOR_DEFAULT_MODEL_REPLAN } from './orchestrator/prompts'
import { parseOrchestratorJson } from './orchestrator/json-parser'

export interface ReplanDecision {
  action: 'continue' | 'goal_complete' | 'pause' | 'fail'
  newSteps?: PlannedStep[]
  nextStepMode?: ExecutionMode
  /** IDs der gerade frisch gequeuten agent_steps — fuer Immediate-Lane-Inline-Loop. */
  nextStepIds?: string[]
  reason?: string
}

async function buildToolListPrompt(): Promise<string> {
  const { ToolRegistry } = await import('./tool-registry')
  const { initializeToolRegistry } = await import('./tools/bootstrap')
  initializeToolRegistry()
  const tools = await ToolRegistry.listAll()
  if (tools.length === 0) return '(keine Tools verfuegbar)'
  return tools.map((t) => `- ${t.ref.raw}: ${t.description}`).join('\n')
}

async function callLLM(systemPrompt: string, userPrompt: string, model: string, costContext: { runId: string; goalId: string; callRole: 'orchestrator_plan' | 'orchestrator_replan' }): Promise<string> {
  const { AIService } = await import('@/lib/services/ai')
  const { CostTrackerService } = await import('./cost-tracker.service')

  const response = await AIService.complete(userPrompt, {
    systemPrompt,
    model,
    temperature: 0.2,
    maxTokens: 2048,
  })

  await CostTrackerService.record({
    runId: costContext.runId,
    goalId: costContext.goalId,
    provider: response.provider,
    model: response.model,
    callRole: costContext.callRole,
    inputTokens: response.usage?.promptTokens ?? 0,
    outputTokens: response.usage?.completionTokens ?? 0,
    costCents: 0, // TODO: pricing-table
  })

  return response.text
}

export const OrchestratorService = {
  async plan(goalId: string): Promise<{ runId: string; steps: PlannedStep[] }> {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns, agentSteps, taskQueue } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    // Goal laden
    const [goal] = await db
      .select({ id: agentGoals.id, title: agentGoals.title, description: agentGoals.description })
      .from(agentGoals)
      .where(eq(agentGoals.id, goalId))
      .limit(1)
    if (!goal) {
      throw new Error(`Goal ${goalId} nicht gefunden`)
    }

    // Goal-Status auf 'planning'
    await db.update(agentGoals).set({ status: 'planning', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))

    // Run anlegen (status='planning')
    const [run] = await db
      .insert(agentRuns)
      .values({ goalId, status: 'planning' })
      .returning({ id: agentRuns.id })

    // Tool-Liste fuer System-Prompt
    const toolList = await buildToolListPrompt()
    const userPrompt = `GOAL:\n  Titel: ${goal.title}\n  Beschreibung: ${goal.description ?? '(keine)'}\n\nVERFUEGBARE TOOLS:\n${toolList}\n\nErstelle den Plan als JSON.`

    // LLM-Call
    const rawText = await callLLM(PLAN_SYSTEM_PROMPT, userPrompt, ORCHESTRATOR_DEFAULT_MODEL_PLAN, {
      runId: run.id,
      goalId,
      callRole: 'orchestrator_plan',
    })

    // JSON parsen
    let plan: InitialPlan
    try {
      plan = parseOrchestratorJson(rawText, InitialPlanSchema)
    } catch (e) {
      // Run als failed markieren
      await db.update(agentRuns).set({
        status: 'failed',
        lastError: (e as Error).message,
        finishedAt: sql`now()`,
        updatedAt: sql`now()`,
      }).where(eq(agentRuns.id, run.id))
      await db.update(agentGoals).set({ status: 'failed', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
      throw e
    }

    // Steps in DB schreiben
    const stepRows = plan.steps.map((s) => ({
      runId: run.id,
      goalId,
      stepKey: s.stepKey,
      workerType: s.workerType,
      config: s.config,
      contextRefs: s.contextRefs,
      dependsOnStepKeys: s.dependsOnStepKeys,
      status: 'pending' as const,
    }))
    const insertedSteps = await db.insert(agentSteps).values(stepRows).returning({ id: agentSteps.id, stepKey: agentSteps.stepKey })

    // Plan-JSON + status auf Run schreiben
    await db.update(agentRuns).set({
      planJson: plan as unknown as Record<string, unknown>,
      status: 'executing',
      updatedAt: sql`now()`,
    }).where(eq(agentRuns.id, run.id))

    await db.update(agentGoals).set({ status: 'running', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))

    // Steps ohne unaufgeloeste Dependencies queuen
    const stepKeyToId = new Map(insertedSteps.map((s) => [s.stepKey, s.id]))
    const readySteps = plan.steps.filter((s) => s.dependsOnStepKeys.length === 0)
    for (const s of readySteps) {
      const stepId = stepKeyToId.get(s.stepKey)
      if (!stepId) continue
      await db.insert(taskQueue).values({
        type: 'agent_step_run',
        status: 'pending',
        priority: 2,
        payload: { stepId, runId: run.id, goalId },
        referenceType: 'agent_step',
        referenceId: stepId,
      }).returning({ id: taskQueue.id })
    }

    return { runId: run.id, steps: plan.steps as unknown as PlannedStep[] }
  },

  async replan(runId: string): Promise<ReplanDecision> {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns, agentSteps, taskQueue } = await import('@/lib/db/schema')
    const { eq, and, sql } = await import('drizzle-orm')
    const { ReplanDecisionSchema } = await import('./orchestrator/plan-types')
    const { MemoryService } = await import('./memory.service')
    let queuedStepIds: string[] = []

    // Run + Goal laden
    const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, runId)).limit(1)
    if (!run) throw new Error(`Run ${runId} nicht gefunden`)

    const [goal] = await db
      .select({ id: agentGoals.id, title: agentGoals.title, description: agentGoals.description })
      .from(agentGoals)
      .where(eq(agentGoals.id, run.goalId))
      .limit(1)
    if (!goal) throw new Error(`Goal ${run.goalId} nicht gefunden`)

    // Pruefe ob alle Steps terminal sind ODER ob noch pending/running existieren
    const allSteps = await db
      .select({ id: agentSteps.id, stepKey: agentSteps.stepKey, status: agentSteps.status, workerType: agentSteps.workerType, dependsOnStepKeys: agentSteps.dependsOnStepKeys })
      .from(agentSteps)
      .where(eq(agentSteps.runId, runId))
    const pendingOrRunning = allSteps.filter((s) => s.status === 'pending' || s.status === 'running')

    // Falls noch pending/running existieren, sind moeglicherweise Dependencies aufgeloest worden — neue ready-Tasks queuen
    if (pendingOrRunning.length > 0) {
      const succeededKeys = new Set(allSteps.filter((s) => s.status === 'succeeded').map((s) => s.stepKey))
      const readyToQueue = pendingOrRunning.filter((s) => {
        if (s.status !== 'pending') return false
        const deps = (s.dependsOnStepKeys as string[]) ?? []
        return deps.every((d) => succeededKeys.has(d))
      })
      // Pruefe ob diese Steps schon eine Task-Queue-Row haben
      for (const s of readyToQueue) {
        const existingTasks = await db
          .select({ id: taskQueue.id })
          .from(taskQueue)
          .where(and(eq(taskQueue.referenceId, s.id), eq(taskQueue.type, 'agent_step_run')))
          .limit(1)
        if (existingTasks.length === 0) {
          await db.insert(taskQueue).values({
            type: 'agent_step_run',
            status: 'pending',
            priority: 2,
            payload: { stepId: s.id, runId, goalId: run.goalId },
            referenceType: 'agent_step',
            referenceId: s.id,
          })
          queuedStepIds.push(s.id)
        }
      }
      return { action: 'continue', reason: `${readyToQueue.length} weitere Steps bereit, ${pendingOrRunning.length - readyToQueue.length} blockiert`, nextStepIds: queuedStepIds }
    }

    // Alle Steps terminal — LLM entscheidet
    const compactedHistory = await MemoryService.compactRunHistory(runId, 5)
    const { ToolRegistry } = await import('./tool-registry')
    const { initializeToolRegistry } = await import('./tools/bootstrap')
    initializeToolRegistry()
    const tools = await ToolRegistry.listAll()
    const toolList = tools.length === 0 ? '(keine Tools verfuegbar)' : tools.map((t) => `- ${t.ref.raw}: ${t.description}`).join('\n')

    const userPrompt = `GOAL:\n  Titel: ${goal.title}\n  Beschreibung: ${goal.description ?? '(keine)'}\n\nRUN-STATE:\n${compactedHistory || '(keine Steps)'}\n\nVERFUEGBARE TOOLS:\n${toolList}\n\nWelche Aktion?`

    const rawText = await callLLM(REPLAN_SYSTEM_PROMPT, userPrompt, ORCHESTRATOR_DEFAULT_MODEL_REPLAN, {
      runId,
      goalId: run.goalId,
      callRole: 'orchestrator_replan',
    })

    let decision: { action: ReplanDecision['action']; reasoning: string; newSteps: PlannedStep[]; nextStepMode?: 'cron' | 'immediate' }
    try {
      decision = parseOrchestratorJson(rawText, ReplanDecisionSchema) as unknown as typeof decision
    } catch (e) {
      await db.update(agentRuns).set({
        status: 'failed',
        lastError: `Replan JSON-Parse: ${(e as Error).message}`,
        finishedAt: sql`now()`,
        updatedAt: sql`now()`,
      }).where(eq(agentRuns.id, runId))
      await db.update(agentGoals).set({ status: 'failed', updatedAt: sql`now()` }).where(eq(agentGoals.id, run.goalId))
      throw e
    }

    if (decision.action === 'goal_complete') {
      await db.update(agentRuns).set({
        status: 'succeeded',
        finishedAt: sql`now()`,
        updatedAt: sql`now()`,
      }).where(eq(agentRuns.id, runId))
      await db.update(agentGoals).set({
        status: 'done',
        completedAt: sql`now()`,
        updatedAt: sql`now()`,
      }).where(eq(agentGoals.id, run.goalId))
      return { action: 'goal_complete', reason: decision.reasoning }
    }

    if (decision.action === 'pause') {
      await db.update(agentGoals).set({ status: 'paused', updatedAt: sql`now()` }).where(eq(agentGoals.id, run.goalId))
      return { action: 'pause', reason: decision.reasoning }
    }

    if (decision.action === 'fail') {
      await db.update(agentRuns).set({
        status: 'failed',
        lastError: decision.reasoning,
        finishedAt: sql`now()`,
        updatedAt: sql`now()`,
      }).where(eq(agentRuns.id, runId))
      await db.update(agentGoals).set({ status: 'failed', updatedAt: sql`now()` }).where(eq(agentGoals.id, run.goalId))
      return { action: 'fail', reason: decision.reasoning }
    }

    // continue: neue Steps anlegen und ggf. queuen
    if (decision.newSteps && decision.newSteps.length > 0) {
      const stepRows = decision.newSteps.map((s) => ({
        runId,
        goalId: run.goalId,
        stepKey: s.stepKey,
        workerType: s.workerType,
        config: s.config,
        contextRefs: s.contextRefs,
        dependsOnStepKeys: s.dependsOnStepKeys,
        status: 'pending' as const,
      }))
      const inserted = await db.insert(agentSteps).values(stepRows).returning({ id: agentSteps.id, stepKey: agentSteps.stepKey })
      const stepKeyToId = new Map(inserted.map((i) => [i.stepKey, i.id]))
      const readySteps = decision.newSteps.filter((s) => s.dependsOnStepKeys.length === 0)
      for (const s of readySteps) {
        const stepId = stepKeyToId.get(s.stepKey)
        if (!stepId) continue
        await db.insert(taskQueue).values({
          type: 'agent_step_run',
          status: 'pending',
          priority: 2,
          payload: { stepId, runId, goalId: run.goalId },
          referenceType: 'agent_step',
          referenceId: stepId,
        })
        queuedStepIds.push(stepId)
      }
    } else {
      // continue ohne newSteps + alle Steps terminal -> Goal vermutlich done, aber LLM unschluessig.
      // Pause statt blind goal_complete.
      await db.update(agentGoals).set({ status: 'paused', updatedAt: sql`now()` }).where(eq(agentGoals.id, run.goalId))
      return { action: 'pause', reason: 'Replan continue ohne newSteps und keine pending steps -> manuell pruefen' }
    }

    return {
      action: 'continue',
      newSteps: decision.newSteps,
      nextStepMode: decision.nextStepMode,
      reason: decision.reasoning,
      nextStepIds: queuedStepIds,
    }
  },
}
