/**
 * Workflow Engine
 *
 * Executes workflows by:
 * 1. Finding active workflows for a given trigger
 * 2. Creating a workflow run record
 * 3. Executing each step recursively (action / branch / parallel)
 * 4. Evaluating conditions per step against trigger data + step results
 * 5. Recording results, errors, and step paths
 */

import { db } from '@/lib/db'
import { workflows, workflowRuns } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getAction } from './action-registry'
import { logger } from '@/lib/utils/logger'

type StepKind = 'action' | 'branch' | 'parallel'

interface BaseStep {
  id?: string
  label?: string
  /** Skip-Verhalten — nur auf Action-Steps relevant. */
  condition?: string
}

interface ActionStep extends BaseStep {
  kind?: 'action'  // Default; Bestandsworkflows haben kind nicht gesetzt.
  action: string
  config?: Record<string, unknown>
}

interface BranchStep extends BaseStep {
  kind: 'branch'
  ifCondition: string
  then: WorkflowStep[]
  else?: WorkflowStep[]
}

interface ParallelStep extends BaseStep {
  kind: 'parallel'
  steps: WorkflowStep[]
}

type WorkflowStep = ActionStep | BranchStep | ParallelStep

interface StepResult {
  step: number
  path: string
  action: string
  kind: StepKind
  label?: string
  status: 'completed' | 'failed' | 'skipped'
  result?: Record<string, unknown>
  error?: string
  durationMs: number
}

/**
 * Evaluate a condition string against runtime context.
 *
 * Pfade:
 *   data.<field>[.<nested>...]      → ctx.triggerData
 *   steps.<id>.<field>[.<nested>...] → ctx.actionResults[<id>]
 *
 * Operatoren:  ==  !=  >  >=  <  <=
 * Spezialfall: == null / != null  (true für null/undefined/leerer-String)
 * Truthy: einzelner Pfad ohne Operator
 *
 * Unbekannte Formate → returns true (default execute, mit logger.warn).
 */
export function evaluateCondition(
  condition: string,
  scope: { triggerData: Record<string, unknown>; actionResults: Record<string, unknown> },
): boolean {
  if (!condition || !condition.trim()) return true

  try {
    const expr = condition.trim()

    function resolvePath(path: string): unknown {
      const parts = path.split('.')
      let cur: unknown
      if (parts[0] === 'data') cur = scope.triggerData
      else if (parts[0] === 'steps') cur = scope.actionResults
      else return undefined
      for (let i = 1; i < parts.length; i++) {
        if (cur == null || typeof cur !== 'object') return undefined
        cur = (cur as Record<string, unknown>)[parts[i]]
      }
      return cur
    }

    const PATH = String.raw`(?:data|steps)(?:\.\w+)+`

    // == null / != null
    let m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=)\\s*null$`))
    if (m) {
      const val = resolvePath(m[1])
      const isNullish = val === null || val === undefined || val === ''
      return m[2] === '==' ? isNullish : !isNullish
    }

    // == 'value' / != 'value'
    m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=)\\s*'([^']*)'$`))
    if (m) {
      const val = resolvePath(m[1])
      return m[2] === '==' ? String(val) === m[3] : String(val) !== m[3]
    }

    // numerische Operatoren
    m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=|>=|<=|>|<)\\s*(-?\\d+(?:\\.\\d+)?)$`))
    if (m) {
      const raw = resolvePath(m[1])
      const val = Number(raw)
      const num = Number(m[3])
      if (Number.isNaN(val)) return false
      switch (m[2]) {
        case '==': return val === num
        case '!=': return val !== num
        case '>':  return val > num
        case '>=': return val >= num
        case '<':  return val < num
        case '<=': return val <= num
      }
    }

    // truthy
    m = expr.match(new RegExp(`^(${PATH})$`))
    if (m) {
      const val = resolvePath(m[1])
      if (val == null || val === '' || val === false || val === 0) return false
      if (Array.isArray(val) && val.length === 0) return false
      return true
    }

    logger.warn(`Unknown condition format: ${expr}`, { module: 'WorkflowEngine' })
    return true
  } catch {
    return true
  }
}

interface RunContext {
  runId: string
  triggerData: Record<string, unknown>
  stepResults: StepResult[]
  actionResults: Record<string, unknown>
  stepCounter: { current: number }
  depth: number
}

const MAX_DEPTH = 10
const MAX_PARALLEL_FANOUT = 100

async function persistStepResults(ctx: RunContext): Promise<void> {
  await db.update(workflowRuns)
    .set({ stepResults: ctx.stepResults })
    .where(eq(workflowRuns.id, ctx.runId))
}

async function executeStepList(
  steps: WorkflowStep[],
  basePath: string,
  ctx: RunContext,
): Promise<void> {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const path = basePath ? `${basePath}.${i + 1}` : String(i + 1)
    await executeOneStep(step, path, ctx)
  }
}

async function executeOneStep(
  step: WorkflowStep,
  path: string,
  ctx: RunContext,
): Promise<void> {
  const startTime = Date.now()
  ctx.stepCounter.current += 1
  const stepNum = ctx.stepCounter.current

  await db.update(workflowRuns)
    .set({ currentStep: stepNum })
    .where(eq(workflowRuns.id, ctx.runId))

  if (ctx.depth > MAX_DEPTH) {
    const kindForReport: StepKind = (step as { kind?: StepKind }).kind ?? 'action'
    ctx.stepResults.push({
      step: stepNum, path,
      action: (step as ActionStep).action || kindForReport,
      kind: kindForReport,
      label: step.label,
      status: 'failed',
      error: 'Max nesting depth exceeded',
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)
    return
  }

  const kind: StepKind = (step as { kind?: StepKind }).kind ?? 'action'

  // ── BRANCH ──────────────────────────────────────────────────
  if (kind === 'branch') {
    const bs = step as BranchStep
    const taken = evaluateCondition(bs.ifCondition, {
      triggerData: ctx.triggerData,
      actionResults: ctx.actionResults,
    }) ? 'then' : (bs.else ? 'else' : 'none')

    ctx.stepResults.push({
      step: stepNum, path, action: 'branch', kind: 'branch', label: bs.label,
      status: 'completed', result: { taken },
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)

    const childCtx: RunContext = { ...ctx, depth: ctx.depth + 1 }
    if (taken === 'then') await executeStepList(bs.then, `${path}.then`, childCtx)
    else if (taken === 'else') await executeStepList(bs.else!, `${path}.else`, childCtx)
    return
  }

  // ── PARALLEL ────────────────────────────────────────────────
  if (kind === 'parallel') {
    const ps = step as ParallelStep

    if (ps.steps.length > MAX_PARALLEL_FANOUT) {
      ctx.stepResults.push({
        step: stepNum, path, action: 'parallel', kind: 'parallel', label: ps.label,
        status: 'failed',
        error: `Parallel cardinality > ${MAX_PARALLEL_FANOUT}`,
        durationMs: Date.now() - startTime,
      })
      await persistStepResults(ctx)
      return
    }

    const summaryIdx = ctx.stepResults.length
    ctx.stepResults.push({
      step: stepNum, path, action: 'parallel', kind: 'parallel', label: ps.label,
      status: 'completed',
      result: { ranSubSteps: ps.steps.length, failedCount: 0 },
      durationMs: 0,
    })
    await persistStepResults(ctx)

    const subResultBundles = await Promise.allSettled(
      ps.steps.map((sub, i) => runSubStepIsolated(sub, `${path}.parallel.${i + 1}`, ctx)),
    )

    let failedCount = 0
    for (const sr of subResultBundles) {
      if (sr.status === 'fulfilled') {
        ctx.stepResults.push(...sr.value)
        for (const r of sr.value) if (r.status === 'failed') failedCount++
      }
      // rejected sollte nie passieren — runSubStepIsolated catched intern
    }

    ctx.stepResults[summaryIdx] = {
      ...ctx.stepResults[summaryIdx],
      result: { ranSubSteps: ps.steps.length, failedCount },
      durationMs: Date.now() - startTime,
    }
    await persistStepResults(ctx)
    return
  }

  // ── ACTION (default) ────────────────────────────────────────
  const as = step as ActionStep

  if (as.condition && !evaluateCondition(as.condition, {
    triggerData: ctx.triggerData,
    actionResults: ctx.actionResults,
  })) {
    ctx.stepResults.push({
      step: stepNum, path, action: as.action, kind: 'action', label: as.label,
      status: 'skipped',
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)
    return
  }

  const actionDef = getAction(as.action)
  if (!actionDef) {
    ctx.stepResults.push({
      step: stepNum, path, action: as.action, kind: 'action', label: as.label,
      status: 'failed',
      error: `Unknown action: ${as.action}`,
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)
    return
  }

  try {
    const res = await actionDef.execute(
      { triggerData: ctx.triggerData, stepResults: ctx.actionResults },
      as.config || {},
    )
    if (res.data) {
      const stepKey = as.id || as.action
      ctx.actionResults[stepKey] = res.data
      if (!(as.action in ctx.actionResults)) ctx.actionResults[as.action] = res.data
    }
    ctx.stepResults.push({
      step: stepNum, path, action: as.action, kind: 'action', label: as.label,
      status: res.success ? 'completed' : 'failed',
      result: res.data, error: res.error,
      durationMs: Date.now() - startTime,
    })
  } catch (err) {
    ctx.stepResults.push({
      step: stepNum, path, action: as.action, kind: 'action', label: as.label,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startTime,
    })
  }
  await persistStepResults(ctx)
}

async function runSubStepIsolated(
  sub: WorkflowStep,
  path: string,
  parentCtx: RunContext,
): Promise<StepResult[]> {
  const localCtx: RunContext = {
    ...parentCtx,
    stepResults: [],
    depth: parentCtx.depth + 1,
  }
  await executeOneStep(sub, path, localCtx)
  return localCtx.stepResults
}

export const WorkflowEngine = {
  /**
   * Fire a trigger — finds all active workflows for this trigger and runs them
   */
  async fire(trigger: string, triggerData: Record<string, unknown>): Promise<void> {
    const activeWorkflows = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.trigger, trigger), eq(workflows.isActive, true)))

    if (activeWorkflows.length === 0) {
      logger.info(`No workflows for trigger "${trigger}"`, { module: 'WorkflowEngine' })
      return
    }

    for (const workflow of activeWorkflows) {
      this.executeWorkflow(workflow.id, workflow.name, workflow.steps as WorkflowStep[], trigger, triggerData)
        .catch(err => logger.error(`Workflow "${workflow.name}" failed`, err, { module: 'WorkflowEngine' }))
    }
  },

  /**
   * Execute a single workflow
   */
  async executeWorkflow(
    workflowId: string,
    workflowName: string,
    steps: WorkflowStep[],
    trigger: string,
    triggerData: Record<string, unknown>,
  ): Promise<void> {
    const [run] = await db.insert(workflowRuns).values({
      workflowId,
      trigger,
      triggerData,
      status: 'running',
      currentStep: 0,
      totalSteps: steps.length,
      stepResults: [],
    }).returning()

    logger.info(`Workflow "${workflowName}" started (run: ${run.id}, top-level steps: ${steps.length})`, {
      module: 'WorkflowEngine',
    })

    const ctx: RunContext = {
      runId: run.id,
      triggerData,
      stepResults: [],
      actionResults: {},
      stepCounter: { current: 0 },
      depth: 0,
    }

    try {
      await executeStepList(steps, '', ctx)
      await db.update(workflowRuns).set({
        status: 'completed',
        stepResults: ctx.stepResults,
        completedAt: new Date(),
      }).where(eq(workflowRuns.id, run.id))
      const okCount = ctx.stepResults.filter(r => r.status === 'completed' && r.kind === 'action').length
      const totalAction = ctx.stepResults.filter(r => r.kind === 'action').length
      logger.info(`Workflow "${workflowName}" completed (${okCount}/${totalAction} actions OK)`, { module: 'WorkflowEngine' })
    } catch (err) {
      await db.update(workflowRuns).set({
        status: 'failed',
        stepResults: ctx.stepResults,
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      }).where(eq(workflowRuns.id, run.id))
      logger.error(`Workflow "${workflowName}" FAILED`, err, { module: 'WorkflowEngine' })
    }
  },
}
