/**
 * Debug-Endpoint fuer Agent-Runs.
 *
 * Liefert ALLES was zum Debuggen eines stranded/failed Goals noetig ist:
 *   - Run + Goal + Steps + Cost-Events
 *   - Alle task_queue-Eintraege fuer den Run (mit error/result/Stale-Detection)
 *   - Letzte audit_logs fuer den Run
 *   - Aktuelle aiProviders-Konfiguration (welche aktiv?)
 *   - Tool-Registry-Status (welche Tools sind verfuegbar?)
 *   - Heuristik-Diagnostics: erkannte Probleme + konkrete Empfehlungen
 *
 * GET /api/agents/runs/[id]/debug
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiNotFound } from '@/lib/utils/api-response'

interface DebugIssue {
  severity: 'critical' | 'warn' | 'info'
  code: string
  message: string
  recommendation: string
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await runDebugHandler(params)
  } catch (e) {
    // Letzter Schutz — wenn etwas Unerwartetes wirft, geben wir die Message
    // zurueck damit der User im UI sieht was los ist (statt nackter HTTP 500).
    const msg = (e as Error).message
    return NextResponse.json({ debugFatalError: msg, stack: (e as Error).stack?.split('\n').slice(0, 5) }, { status: 500 })
  }
}

async function runDebugHandler(params: Promise<{ id: string }>) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const { id: runId } = await params
  const errors: string[] = []

  // Helper: jeden Sub-Block defensiv ausfuehren, Fehler in errors[] sammeln
  // statt 500 zu werfen. So sieht der User im UI was klemmt.
  async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn()
    } catch (e) {
      const msg = `${label}: ${(e as Error).message}`
      errors.push(msg)
      try {
        const { logger } = await import('@/lib/utils/logger')
        logger.error(`Debug-Endpoint: ${msg}`, e, { module: 'AgentDebug', runId })
      } catch { /* noop */ }
      return fallback
    }
  }

  const { db } = await import('@/lib/db')
  const { agentRuns, agentGoals, agentSteps, agentCostEvents, aiProviders, auditLogs } = await import('@/lib/db/schema')
  const { eq, asc, desc, sql, or, and } = await import('drizzle-orm')

  // 1) Run + Goal
  const run = await safe('run-lookup', async () => {
    const [r] = await db.select().from(agentRuns).where(eq(agentRuns.id, runId)).limit(1)
    return r ?? null
  }, null as null | typeof agentRuns.$inferSelect)
  if (!run) return apiNotFound('Run nicht gefunden')

  const goal = await safe('goal-lookup', async () => {
    const [g] = await db.select().from(agentGoals).where(eq(agentGoals.id, run.goalId)).limit(1)
    return g ?? null
  }, null as null | typeof agentGoals.$inferSelect)

  // 2) Steps
  const steps = await safe('steps-lookup', async () =>
    await db.select().from(agentSteps).where(eq(agentSteps.runId, runId)).orderBy(asc(agentSteps.createdAt)),
    [] as Array<typeof agentSteps.$inferSelect>,
  )

  // 3) Tasks — Drizzle-Template-Param fuer Array-Cast funktioniert nicht
  // (serialisiert zu '($1, $2)::uuid[]' statt 'ARRAY[$1, $2]::uuid[]').
  // Loesung: per IN (...) mit sql.join, das produziert valides SQL.
  const stepIds = steps.map((s) => s.id)
  const tasks = await safe('tasks-lookup', async () => {
    const stepIdInClause = stepIds.length > 0
      ? sql`OR reference_id IN (${sql.join(stepIds.map((id) => sql`${id}::uuid`), sql`, `)})`
      : sql``
    // task_queue hat KEINE completed_at-Spalte (Schema: nur executed_at).
    const query = sql`
      SELECT id, type, status, error, result, payload, reference_type, reference_id,
             created_at, scheduled_for, executed_at, updated_at
      FROM task_queue
      WHERE reference_id = ${runId}
         ${stepIdInClause}
         OR payload->>'runId' = ${runId}
      ORDER BY created_at DESC LIMIT 50
    `
    return (await db.execute(query)) as unknown as Array<{
      id: string; type: string; status: string; error: string | null;
      result: Record<string, unknown> | null; payload: Record<string, unknown> | null;
      reference_type: string | null; reference_id: string | null;
      created_at: string; scheduled_for: string | null;
      executed_at: string | null; updated_at: string | null;
    }>
  }, [] as Array<{
    id: string; type: string; status: string; error: string | null;
    result: Record<string, unknown> | null; payload: Record<string, unknown> | null;
    reference_type: string | null; reference_id: string | null;
    created_at: string; scheduled_for: string | null;
    executed_at: string | null; updated_at: string | null;
  }>)

  // 4) Cost-Events
  const costEvents = await safe('cost-events-lookup', async () =>
    await db.select().from(agentCostEvents).where(eq(agentCostEvents.runId, runId)).orderBy(asc(agentCostEvents.occurredAt)),
    [] as Array<typeof agentCostEvents.$inferSelect>,
  )

  // 5) Audit-Log-Events fuer diesen Run + Goal
  const auditEvents = await safe('audit-events-lookup', async () =>
    (await db
      .select()
      .from(auditLogs)
      .where(or(
        and(eq(auditLogs.entityType, 'agent_run'), eq(auditLogs.entityId, runId)),
        and(eq(auditLogs.entityType, 'agent_goal'), eq(auditLogs.entityId, run.goalId)),
      ))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20)) as Array<{ id: string; action: string; entityType: string | null; entityId: string | null; payload: Record<string, unknown> | null; createdAt: Date }>,
    [] as Array<{ id: string; action: string; entityType: string | null; entityId: string | null; payload: Record<string, unknown> | null; createdAt: Date }>,
  )

  // 6) Aktive AI-Provider
  const activeProviders = await safe('providers-lookup', async () =>
    (await db
      .select({ id: aiProviders.id, name: aiProviders.name, providerType: aiProviders.providerType, model: aiProviders.model, isActive: aiProviders.isActive })
      .from(aiProviders)
      .where(eq(aiProviders.isActive, true))) as Array<{ id: string; name: string; providerType: string; model: string | null; isActive: boolean }>,
    [] as Array<{ id: string; name: string; providerType: string; model: string | null; isActive: boolean }>,
  )

  // 7) Tool-Registry-Status
  const registeredTools = await safe('tool-registry', async () => {
    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    const { initializeToolRegistry } = await import('@/lib/services/agents/tools/bootstrap')
    initializeToolRegistry()
    const all = await ToolRegistry.listAll()
    return all.map((t) => ({ ref: t.ref.raw, description: t.description.slice(0, 200) }))
  }, [] as Array<{ ref: string; description: string }>)

  // ─── Heuristik-Diagnostics ───
  const issues: DebugIssue[] = []

  // Check 1: keine AI-Provider
  if (activeProviders.length === 0 && !process.env.GOOGLE_AI_API_KEY && !process.env.OPENAI_API_KEY) {
    issues.push({
      severity: 'critical',
      code: 'NO_AI_PROVIDER',
      message: 'Keine AI-Provider aktiv (weder DB noch ENV)',
      recommendation: 'In /intern/.../ai-providers einen Provider anlegen ODER GOOGLE_AI_API_KEY/OPENAI_API_KEY als Container-ENV setzen.',
    })
  }

  // Check 2: alter Generic-Processor-Bug — Tasks completed mit "Unknown type"
  const unknownTypeTasks = tasks.filter((t) => {
    const r = t.result
    if (!r || typeof r !== 'object') return false
    const reason = (r as { reason?: string }).reason
    return typeof reason === 'string' && reason.includes('Unknown type')
  })
  if (unknownTypeTasks.length > 0) {
    issues.push({
      severity: 'critical',
      code: 'CONTAINER_OUTDATED',
      message: `${unknownTypeTasks.length} Task(s) wurden als "Unknown type" markiert — der Container faehrt eine alte Version vor PR #12.`,
      recommendation: 'Container redeploy (Version >= 1.5.703). Anschliessend SQL: UPDATE task_queue SET status=\'pending\', result=NULL WHERE id IN (...).',
    })
  }

  // Check 3: pending Steps ohne pending Task
  const pendingSteps = steps.filter((s) => s.status === 'pending')
  for (const s of pendingSteps) {
    const hasPendingTask = tasks.some((t) =>
      t.type === 'agent_step_run' &&
      (t.reference_id === s.id || (t.payload as { stepId?: string } | null)?.stepId === s.id) &&
      ['pending', 'running'].includes(t.status),
    )
    const deps = (s.dependsOnStepKeys as string[]) ?? []
    const allDepsDone = deps.every((depKey) => steps.find((ss) => ss.stepKey === depKey)?.status === 'succeeded')
    if (!hasPendingTask && allDepsDone) {
      issues.push({
        severity: 'warn',
        code: 'STEP_WITHOUT_TASK',
        message: `Step '${s.stepKey}' ist pending, alle Deps fertig — aber kein agent_step_run-Task in der Queue.`,
        recommendation: `Manuell triggern: POST /api/agents/steps/${s.id}/retry oder im UI "Step retry"-Button.`,
      })
    }
  }

  // Check 4: Run-Status executing aber alle Steps terminal
  const allTerminal = steps.length > 0 && steps.every((s) => ['succeeded', 'failed', 'skipped'].includes(s.status))
  const replanOpen = tasks.some((t) => t.type === 'agent_replan' && ['pending', 'running'].includes(t.status))
  if (run.status === 'executing' && allTerminal && !replanOpen) {
    issues.push({
      severity: 'warn',
      code: 'NEEDS_REPLAN',
      message: 'Alle Steps fertig, aber kein Replan-Task in der Queue — Run wartet auf naechsten Cron-Tick.',
      recommendation: `Manuell triggern: POST /api/agents/runs/${runId}/replan-now`,
    })
  }

  // Check 5: Liveness-Stale (Run >10 min kein Update)
  const lastSeen = run.livenessCheckedAt ?? run.startedAt
  const ageMs = Date.now() - new Date(lastSeen).getTime()
  if (run.status === 'executing' && ageMs > 10 * 60 * 1000) {
    issues.push({
      severity: 'warn',
      code: 'STRANDED',
      message: `Run ist seit ${Math.floor(ageMs / 60000)} Minuten ohne Update — Reconcile sollte ihn beim naechsten Tick aufgreifen.`,
      recommendation: 'Warte 1-5 min auf Reconcile-Loop (cron.service.ts:reconcileStrandedRuns), oder pruefe Container-Logs.',
    })
  }

  // Check 6: Worker-Type referenziert nicht-vorhandenes Tool
  const registeredRefs = new Set(registeredTools.map((t) => t.ref))
  const ghostTools = pendingSteps.filter((s) => !registeredRefs.has(s.workerType))
  for (const s of ghostTools) {
    issues.push({
      severity: 'critical',
      code: 'GHOST_TOOL',
      message: `Step '${s.stepKey}' verwendet Tool '${s.workerType}' das nicht in der Tool-Registry ist.`,
      recommendation: `Pruefe ob Slug korrekt — fuer prompt:* der Slug in aiPromptTemplates, fuer agent:* der Slug in agent_definitions (role=worker), fuer service:* die Whitelist in service-adapter.ts.`,
    })
  }

  return NextResponse.json({
    run: {
      id: run.id, goalId: run.goalId, status: run.status, attempt: run.attempt,
      startedAt: run.startedAt, finishedAt: run.finishedAt,
      lastError: run.lastError, livenessCheckedAt: run.livenessCheckedAt,
      costCents: run.costCents,
      inputTokens: String(run.inputTokens ?? 0),
      outputTokens: String(run.outputTokens ?? 0),
    },
    goal: goal ? {
      id: goal.id, title: goal.title, status: goal.status,
      executionMode: goal.executionMode, requirePlanApproval: goal.requirePlanApproval,
      spentCents: goal.spentCents, budgetCents: goal.budgetCents,
    } : null,
    steps: steps.map((s) => ({
      id: s.id, stepKey: s.stepKey, workerType: s.workerType, status: s.status,
      dependsOnStepKeys: s.dependsOnStepKeys,
      error: s.error, resultSummary: s.resultSummary,
      startedAt: s.startedAt, finishedAt: s.finishedAt, costCents: s.costCents,
    })),
    tasks: tasks.map((t) => ({
      id: t.id, type: t.type, status: t.status, error: t.error,
      result: t.result, referenceType: t.reference_type, referenceId: t.reference_id,
      createdAt: t.created_at, scheduledFor: t.scheduled_for,
      executedAt: t.executed_at, completedAt: t.updated_at,
    })),
    costEvents: costEvents.map((c) => ({
      id: c.id, callRole: c.callRole, provider: c.provider, model: c.model,
      inputTokens: c.inputTokens, outputTokens: c.outputTokens, costCents: c.costCents,
      occurredAt: c.occurredAt,
    })),
    auditEvents: auditEvents.map((a) => ({
      id: a.id, action: a.action, entityType: a.entityType, entityId: a.entityId,
      payload: a.payload, createdAt: a.createdAt,
    })),
    activeProviders,
    registeredTools: { count: registeredTools.length, sample: registeredTools.slice(0, 30) },
    issues,
    debugErrors: errors,
  })
}
