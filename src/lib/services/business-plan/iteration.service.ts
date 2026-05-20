// ============================================
// IterationService
// ============================================
// Fuehrt EINE Iteration des Businessplan-Loops aus. Wird vom taskQueue-
// Worker aufgerufen (case 'business_plan_iteration' in task-queue.service.ts).
// Pro Iteration:
//   1. Plan + letzte Iteration laden
//   2. Plan-Version generieren (Iter 1: idea→story→plan, Iter ≥ 2: revise)
//   3. Mirofish-Simulation laufen lassen
//   4. KI-Analyse mit Score
//   5. Stop-Check: Score >= threshold ODER iter >= max → completed,
//      sonst → naechste Iteration enqueuen
//
// Bei jedem Schritt wird der iteration-row in business_plan_iterations
// inkrementell aktualisiert (status: pending → generating → simulating →
// analyzing → done/failed), damit der UI-Polling den Fortschritt sieht.

import { db } from '@/lib/db'
import { businessPlans, businessPlanIterations } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import {
  generateBusinessStoryAction,
  generateBusinessPlanAction,
  simulateWithMirofishAction,
  analyzeSimulationAction,
  reviseBusinessPlanAction,
  type CanvasPlan,
  type KfwPlan,
} from './actions'

interface PlanVersion {
  canvas?: CanvasPlan
  kfw?: KfwPlan
}

interface AnalysisData {
  score: number
  reasoning: string
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
}

const EMPTY_CTX = { triggerData: {}, stepResults: {} }

/**
 * Workflow-Trigger fail-soft feuern — Failures duerfen die Iteration nicht
 * killen (analog SocialPublishOrchestrator).
 */
async function fireTrigger(key: string, data: Record<string, unknown>): Promise<void> {
  try {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')
    await WorkflowEngine.fire(key, data)
  } catch (err) {
    logger.warn(
      `Trigger ${key} fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
      { module: 'IterationService' },
    )
  }
}

async function loadLastIteration(planId: string) {
  const [iter] = await db.select()
    .from(businessPlanIterations)
    .where(eq(businessPlanIterations.planId, planId))
    .orderBy(desc(businessPlanIterations.iterationNumber))
    .limit(1)
  return iter ?? null
}

function planFromIterationRow(row: { planCanvas: unknown; planKfwMarkdown: string | null }): PlanVersion {
  const out: PlanVersion = {}
  if (row.planCanvas) out.canvas = row.planCanvas as CanvasPlan
  if (row.planKfwMarkdown) out.kfw = { markdown: row.planKfwMarkdown }
  return out
}

export const IterationService = {
  /**
   * Worker-Entry-Point. Fuehrt eine komplette Iteration durch + entscheidet,
   * ob nochmal iteriert wird. Errors werden in business_plans.error +
   * iteration.error persistiert, Plan-Status auf 'failed' gesetzt.
   */
  async runIteration(planId: string): Promise<void> {
    const { BusinessPlanService } = await import('./business-plan.service')

    const plan = await BusinessPlanService.get(planId)
    if (!plan) throw new Error(`Plan ${planId} nicht gefunden`)
    if (plan.status !== 'running') {
      logger.info(`Plan ${planId} ist nicht running (${plan.status}) — iteration skipped`, {
        module: 'IterationService',
      })
      return
    }

    const lastIter = await loadLastIteration(planId)
    const iterationNumber = (lastIter?.iterationNumber ?? 0) + 1

    // Iteration-Row anlegen (status='generating') — UI sieht sofort den
    // Fortschritt, auch wenn die naechsten Schritte spaeter scheitern.
    const [iter] = await db.insert(businessPlanIterations).values({
      planId,
      iterationNumber,
      status: 'generating',
    }).returning()

    const start = Date.now()
    let planVersion: PlanVersion
    let simulationData: { request: unknown; result: unknown }
    let analysis: AnalysisData

    try {
      // Stufe 1+2: Plan-Version generieren
      if (iterationNumber === 1) {
        // Initial: Story → Plan
        const storyRes = await generateBusinessStoryAction(EMPTY_CTX, {
          seedInput: plan.seedInput,
          inputType: plan.inputType,
          planId,
        })
        if (!storyRes.success) throw new Error(`Story-Generierung: ${storyRes.error}`)

        const planRes = await generateBusinessPlanAction(EMPTY_CTX, {
          story: storyRes.data?.story,
          mode: plan.mode,
          planId,
        })
        if (!planRes.success) throw new Error(`Plan-Generierung: ${planRes.error}`)
        planVersion = planRes.data as PlanVersion
      } else {
        // Iteration 2+: vorherigen Plan ueberarbeiten
        if (!lastIter) throw new Error('lastIter fehlt — kann nicht ueberarbeiten')
        const lastPlan = planFromIterationRow(lastIter)
        const lastAnalysis = (lastIter.analysis as AnalysisData | null)
        if (!lastAnalysis) throw new Error('lastIter.analysis fehlt — kann nicht ueberarbeiten')

        const revRes = await reviseBusinessPlanAction(EMPTY_CTX, {
          previousPlan: lastPlan,
          improvements: lastAnalysis.improvements,
          mode: plan.mode,
          planId,
        })
        if (!revRes.success) throw new Error(`Plan-Revision: ${revRes.error}`)
        planVersion = revRes.data as PlanVersion
      }

      // Plan persistieren + status='simulating'
      await db.update(businessPlanIterations).set({
        planCanvas: planVersion.canvas ?? null,
        planKfwMarkdown: planVersion.kfw?.markdown ?? null,
        status: 'simulating',
        updatedAt: new Date(),
      }).where(eq(businessPlanIterations.id, iter.id))

      // Stufe 3: Mirofish-Simulation
      const simRes = await simulateWithMirofishAction(EMPTY_CTX, {
        plan: planVersion,
        mode: plan.mode,
        seedInput: plan.seedInput,
        planId,
      })
      if (!simRes.success) throw new Error(`Simulation: ${simRes.error}`)
      simulationData = simRes.data as { request: unknown; result: unknown }

      await db.update(businessPlanIterations).set({
        simulationRequest: simulationData.request,
        simulationResult: simulationData.result,
        status: 'analyzing',
        updatedAt: new Date(),
      }).where(eq(businessPlanIterations.id, iter.id))

      // Stufe 4: Analyse
      const analysisRes = await analyzeSimulationAction(EMPTY_CTX, {
        plan: planVersion,
        simulationResult: simulationData.result,
        planId,
      })
      if (!analysisRes.success) throw new Error(`Analyse: ${analysisRes.error}`)
      analysis = analysisRes.data as unknown as AnalysisData

      // Iteration final persistieren
      const durationMs = Date.now() - start
      await db.update(businessPlanIterations).set({
        analysis,
        durationMs,
        status: 'done',
        updatedAt: new Date(),
      }).where(eq(businessPlanIterations.id, iter.id))

      // Plan-Counter + finalScore aktualisieren
      await db.update(businessPlans).set({
        currentIteration: iterationNumber,
        finalScore: analysis.score,
        updatedAt: new Date(),
      }).where(eq(businessPlans.id, planId))

      // Iteration-completed-Trigger feuern (fail-soft — Workflow-Fehler
      // duerfen die Pipeline nicht killen).
      await fireTrigger('business_plan.iteration_completed', {
        planId,
        iterationNumber,
        score: analysis.score,
        durationMs,
      })

      // Stop-Check
      const reachedThreshold = analysis.score >= plan.scoreThreshold
      const reachedMax = iterationNumber >= plan.maxIterations
      if (reachedThreshold || reachedMax) {
        await db.update(businessPlans).set({
          status: 'completed',
          updatedAt: new Date(),
        }).where(eq(businessPlans.id, planId))
        logger.info(
          `Plan ${planId} completed (score=${analysis.score}, threshold=${plan.scoreThreshold}, iter=${iterationNumber}/${plan.maxIterations})`,
          { module: 'IterationService' },
        )
        await fireTrigger('business_plan.completed', {
          planId,
          finalScore: analysis.score,
          iterationsRun: iterationNumber,
          reachedThreshold,
        })
      } else {
        // Naechste Iteration einplanen
        await BusinessPlanService.enqueueNextIteration(planId)
        logger.info(
          `Plan ${planId} requeued for iteration ${iterationNumber + 1} (score=${analysis.score} < ${plan.scoreThreshold})`,
          { module: 'IterationService' },
        )
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error(`Plan ${planId} iteration ${iterationNumber} failed`, err, {
        module: 'IterationService',
      })
      await db.update(businessPlanIterations).set({
        status: 'failed',
        error: errMsg,
        durationMs: Date.now() - start,
        updatedAt: new Date(),
      }).where(eq(businessPlanIterations.id, iter.id))
      await db.update(businessPlans).set({
        status: 'failed',
        error: errMsg,
        updatedAt: new Date(),
      }).where(eq(businessPlans.id, planId))
      await fireTrigger('business_plan.failed', {
        planId,
        iterationNumber,
        error: errMsg,
      })
      throw err
    }
  },
}
