/**
 * Workflow Engine
 *
 * Executes workflows by:
 * 1. Finding active workflows for a given trigger
 * 2. Creating a workflow run record
 * 3. Executing each step sequentially
 * 4. Evaluating conditions per step
 * 5. Recording results and errors
 */

import { db } from '@/lib/db'
import { workflows, workflowRuns } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getAction, type ActionContext, type ActionResult } from './action-registry'
import { logger } from '@/lib/utils/logger'

interface WorkflowStep {
  action: string
  label?: string
  config?: Record<string, unknown>
  condition?: string // Simple expression: "data.company != null"
}

interface StepResult {
  step: number
  action: string
  label?: string
  status: 'completed' | 'failed' | 'skipped'
  result?: Record<string, unknown>
  error?: string
  durationMs: number
}

/**
 * Evaluate a simple condition string against trigger data
 * Supports: "data.field != null", "data.field == 'value'", "data.field"
 */
function evaluateCondition(condition: string, data: Record<string, unknown>): boolean {
  if (!condition || !condition.trim()) return true

  try {
    // Replace "data." with actual data access
    const expr = condition.trim()

    // "data.field != null" pattern
    const neqNull = expr.match(/^data\.(\w+)\s*!=\s*null$/)
    if (neqNull) {
      const val = data[neqNull[1]]
      return val !== null && val !== undefined && val !== ''
    }

    // "data.field == null" pattern
    const eqNull = expr.match(/^data\.(\w+)\s*==\s*null$/)
    if (eqNull) {
      const val = data[eqNull[1]]
      return val === null || val === undefined || val === ''
    }

    // "data.field == 'value'" pattern
    const eqVal = expr.match(/^data\.(\w+)\s*==\s*'([^']*)'$/)
    if (eqVal) return data[eqVal[1]] === eqVal[2]

    // "data.field != 'value'" pattern
    const neqVal = expr.match(/^data\.(\w+)\s*!=\s*'([^']*)'$/)
    if (neqVal) return data[neqVal[1]] !== neqVal[2]

    // "data.field > number" pattern
    const gtNum = expr.match(/^data\.(\w+)\s*>\s*(\d+)$/)
    if (gtNum) return Number(data[gtNum[1]]) > Number(gtNum[2])

    // Simple truthy: "data.field"
    const simple = expr.match(/^data\.(\w+)$/)
    if (simple) {
      const val = data[simple[1]]
      return !!val && val !== '' && (Array.isArray(val) ? val.length > 0 : true)
    }

    logger.warn(`Unknown condition format: ${expr}`, { module: 'WorkflowEngine' })
    return true // Default: execute step
  } catch {
    return true
  }
}

export const WorkflowEngine = {
  /**
   * Fire a trigger — finds all active workflows for this trigger and runs them
   */
  async fire(trigger: string, tenantId: string, triggerData: Record<string, unknown>): Promise<void> {
    const activeWorkflows = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.trigger, trigger), eq(workflows.isActive, true)))

    if (activeWorkflows.length === 0) {
      logger.info(`No workflows for trigger "${trigger}"`, { module: 'WorkflowEngine' })
      return
    }

    for (const workflow of activeWorkflows) {
      this.executeWorkflow(workflow.id, workflow.name, workflow.steps as WorkflowStep[], tenantId, trigger, triggerData)
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
    tenantId: string,
    trigger: string,
    triggerData: Record<string, unknown>
  ): Promise<void> {
    // Create run record
    const [run] = await db.insert(workflowRuns).values({
      workflowId,
      trigger,
      triggerData,
      status: 'running',
      currentStep: 0,
      totalSteps: steps.length,
      stepResults: [],
    }).returning()

    logger.info(`Workflow "${workflowName}" started (run: ${run.id}, steps: ${steps.length})`, { module: 'WorkflowEngine' })

    const stepResults: StepResult[] = []
    const actionResults: Record<string, unknown> = {} // Results keyed by action name

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        const startTime = Date.now()

        // Update current step
        await db.update(workflowRuns).set({ currentStep: i + 1 }).where(eq(workflowRuns.id, run.id))

        // Check condition
        if (step.condition && !evaluateCondition(step.condition, triggerData)) {
          const result: StepResult = {
            step: i + 1,
            action: step.action,
            label: step.label,
            status: 'skipped',
            durationMs: Date.now() - startTime,
          }
          stepResults.push(result)
          logger.info(`  Step ${i + 1}/${steps.length}: ${step.action} — SKIPPED (condition: ${step.condition})`, { module: 'WorkflowEngine' })
          continue
        }

        // Find and execute action
        const actionDef = getAction(step.action)
        if (!actionDef) {
          const result: StepResult = {
            step: i + 1,
            action: step.action,
            label: step.label,
            status: 'failed',
            error: `Unknown action: ${step.action}`,
            durationMs: Date.now() - startTime,
          }
          stepResults.push(result)
          logger.warn(`  Step ${i + 1}: Unknown action "${step.action}"`, { module: 'WorkflowEngine' })
          continue // Don't stop the whole workflow for one bad step
        }

        const ctx: ActionContext = {
          tenantId,
          triggerData,
          stepResults: actionResults,
        }

        try {
          const actionResult: ActionResult = await actionDef.execute(ctx, step.config || {})
          if (actionResult.data) {
            actionResults[step.action] = actionResult.data
          }

          const result: StepResult = {
            step: i + 1,
            action: step.action,
            label: step.label,
            status: actionResult.success ? 'completed' : 'failed',
            result: actionResult.data,
            error: actionResult.error,
            durationMs: Date.now() - startTime,
          }
          stepResults.push(result)

          logger.info(`  Step ${i + 1}/${steps.length}: ${step.action} — ${actionResult.success ? 'OK' : 'FAIL'}${actionResult.error ? ` (${actionResult.error})` : ''}`, { module: 'WorkflowEngine' })
        } catch (err) {
          const result: StepResult = {
            step: i + 1,
            action: step.action,
            label: step.label,
            status: 'failed',
            error: err instanceof Error ? err.message : String(err),
            durationMs: Date.now() - startTime,
          }
          stepResults.push(result)
          logger.error(`  Step ${i + 1}: ${step.action} threw error`, err, { module: 'WorkflowEngine' })
        }

        // Update step results after each step
        await db.update(workflowRuns).set({ stepResults }).where(eq(workflowRuns.id, run.id))
      }

      // Mark as completed
      const hasFailures = stepResults.some(r => r.status === 'failed')
      await db.update(workflowRuns).set({
        status: hasFailures ? 'completed' : 'completed', // Still completed even with partial failures
        stepResults,
        completedAt: new Date(),
      }).where(eq(workflowRuns.id, run.id))

      logger.info(`Workflow "${workflowName}" completed (${stepResults.filter(r => r.status === 'completed').length}/${steps.length} OK)`, { module: 'WorkflowEngine' })

    } catch (err) {
      // Catastrophic failure
      await db.update(workflowRuns).set({
        status: 'failed',
        stepResults,
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      }).where(eq(workflowRuns.id, run.id))

      logger.error(`Workflow "${workflowName}" FAILED`, err, { module: 'WorkflowEngine' })
    }
  },
}
