// ============================================
// BusinessPlanService
// ============================================
// CRUD + start() + stop() fuer business_plans-Eintraege. start() enqueued
// einen taskQueue-Eintrag des Typs 'business_plan_iteration', der spaeter
// vom Worker (task-queue.service.ts) gepickt wird und IterationService
// .runIteration() aufruft.
//
// Iteration-Loop selbst: IterationService.runIteration() persistiert die
// Iteration-Ergebnisse und enqueued — falls Score noch nicht erreicht und
// max iterations noch nicht aus — gleich den naechsten Worker-Task.

import { db } from '@/lib/db'
import { businessPlans, businessPlanIterations, taskQueue } from '@/lib/db/schema'
import { and, desc, eq, inArray, count } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import type { BusinessPlan } from '@/lib/db/schema'

export type BusinessPlanMode = 'canvas' | 'kfw' | 'both'
export type BusinessPlanInputType = 'quick' | 'briefing'
export type BusinessPlanStatus = 'idle' | 'running' | 'completed' | 'failed' | 'stopped'

export interface CreateBusinessPlanInput {
  mode: BusinessPlanMode
  inputType: BusinessPlanInputType
  seedInput: Record<string, unknown>
  maxIterations?: number
  scoreThreshold?: number
}

export interface ListFilters {
  status?: BusinessPlanStatus
  mode?: BusinessPlanMode
  createdBy?: string
  page?: number
  limit?: number
}

function deriveTitle(input: CreateBusinessPlanInput): string {
  const seed = input.seedInput || {}
  // Quick-Mode: idea ist ein 1-Satz-String → erste 80 Zeichen
  if (input.inputType === 'quick') {
    const idea = String((seed as Record<string, unknown>).idea ?? '').trim()
    if (idea) return idea.slice(0, 80) + (idea.length > 80 ? '…' : '')
  }
  // Briefing-Mode: industry + audience-Kombination
  if (input.inputType === 'briefing') {
    const industry = String((seed as Record<string, unknown>).industry ?? '').trim()
    const audience = String((seed as Record<string, unknown>).audience ?? '').trim()
    if (industry || audience) {
      return [industry, audience].filter(Boolean).join(' fuer ').slice(0, 80)
    }
  }
  return `Businessplan ${new Date().toISOString().slice(0, 10)}`
}

export const BusinessPlanService = {
  /**
   * Plan anlegen — kein Auto-Start, dafuer ist start() zustaendig.
   */
  async create(input: CreateBusinessPlanInput, createdBy?: string): Promise<BusinessPlan> {
    const [plan] = await db
      .insert(businessPlans)
      .values({
        title: deriveTitle(input),
        mode: input.mode,
        inputType: input.inputType,
        seedInput: input.seedInput,
        maxIterations: input.maxIterations ?? 5,
        scoreThreshold: input.scoreThreshold ?? 80,
        status: 'idle',
        createdBy: createdBy ?? null,
      })
      .returning()
    return plan
  },

  /**
   * Plan starten — Status auf 'running', neuen taskQueue-Eintrag fuer
   * die erste Iteration anlegen.
   */
  async start(planId: string): Promise<void> {
    const plan = await this.get(planId)
    if (!plan) throw new Error(`Plan ${planId} nicht gefunden`)
    if (plan.status === 'running') {
      logger.warn(`Plan ${planId} laeuft bereits — start() ignored`, { module: 'BusinessPlanService' })
      return
    }
    await db.update(businessPlans)
      .set({ status: 'running', error: null, updatedAt: new Date() })
      .where(eq(businessPlans.id, planId))
    await this.enqueueNextIteration(planId)
  },

  /**
   * Naechste Iteration in die taskQueue stellen. Wird sowohl von start()
   * als auch vom IterationService nach einer erfolgreichen Runde aufgerufen.
   * Cancelt vorher pending/running tasks fuer denselben Plan, damit kein
   * Doppellauf passiert.
   */
  async enqueueNextIteration(planId: string): Promise<void> {
    // Pending/Running-Tasks canceln (Plan-Stop oder Re-Iterate-Szenarien)
    await db.update(taskQueue)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(
        eq(taskQueue.referenceType, 'business_plans'),
        eq(taskQueue.referenceId, planId),
        eq(taskQueue.type, 'business_plan_iteration'),
        inArray(taskQueue.status, ['pending', 'running']),
      ))

    const [task] = await db.insert(taskQueue).values({
      type: 'business_plan_iteration',
      status: 'pending',
      priority: 2,
      scheduledFor: new Date(),
      payload: { planId },
      referenceType: 'business_plans',
      referenceId: planId,
    }).returning()

    await db.update(businessPlans)
      .set({ currentIterationTaskId: task.id, updatedAt: new Date() })
      .where(eq(businessPlans.id, planId))
  },

  /**
   * Plan stoppen — Status auf 'stopped', pending tasks canceln.
   */
  async stop(planId: string): Promise<void> {
    await db.update(taskQueue)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(
        eq(taskQueue.referenceType, 'business_plans'),
        eq(taskQueue.referenceId, planId),
        eq(taskQueue.type, 'business_plan_iteration'),
        inArray(taskQueue.status, ['pending', 'running']),
      ))
    await db.update(businessPlans)
      .set({ status: 'stopped', updatedAt: new Date() })
      .where(eq(businessPlans.id, planId))
  },

  /**
   * Plan-Detail mit allen Iterationen sortiert nach Iterations-Nr.
   */
  async get(planId: string): Promise<BusinessPlan | null> {
    const [plan] = await db.select().from(businessPlans).where(eq(businessPlans.id, planId)).limit(1)
    return plan ?? null
  },

  async getWithIterations(planId: string) {
    const plan = await this.get(planId)
    if (!plan) return null
    const iterations = await db.select()
      .from(businessPlanIterations)
      .where(eq(businessPlanIterations.planId, planId))
      .orderBy(businessPlanIterations.iterationNumber)
    return { plan, iterations }
  },

  async list(filters: ListFilters = {}) {
    const { status, mode, createdBy, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (status) conditions.push(eq(businessPlans.status, status))
    if (mode) conditions.push(eq(businessPlans.mode, mode))
    if (createdBy) conditions.push(eq(businessPlans.createdBy, createdBy))
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.select()
        .from(businessPlans)
        .where(whereClause)
        .orderBy(desc(businessPlans.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(businessPlans).where(whereClause),
    ])

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async update(planId: string, data: { title?: string; maxIterations?: number; scoreThreshold?: number }) {
    const updateData: Partial<BusinessPlan> = { updatedAt: new Date() }
    if (data.title !== undefined) updateData.title = data.title
    if (data.maxIterations !== undefined) updateData.maxIterations = data.maxIterations
    if (data.scoreThreshold !== undefined) updateData.scoreThreshold = data.scoreThreshold

    const [plan] = await db.update(businessPlans)
      .set(updateData)
      .where(eq(businessPlans.id, planId))
      .returning()
    return plan ?? null
  },

  async delete(planId: string): Promise<boolean> {
    // pending tasks canceln, cascade kuemmert sich um iterations + artifacts
    await this.stop(planId).catch(() => {/* ignore */})
    const result = await db.delete(businessPlans)
      .where(eq(businessPlans.id, planId))
      .returning({ id: businessPlans.id })
    return result.length > 0
  },
}
