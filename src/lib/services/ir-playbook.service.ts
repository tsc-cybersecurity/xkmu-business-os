import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export const IrPlaybookService = {
  /** List all active scenarios (summary view) */
  async listScenarios(filters?: {
    series?: string
    severity?: string
    dsgvo?: boolean
    search?: string
  }) {
    const conditions: ReturnType<typeof sql>[] = [sql`is_active = true`]

    if (filters?.series) {
      conditions.push(sql`series = ${filters.series}`)
    }
    if (filters?.severity) {
      conditions.push(sql`severity = ${filters.severity}`)
    }
    if (filters?.dsgvo) {
      conditions.push(sql`dsgvo_relevant = true`)
    }
    if (filters?.search) {
      conditions.push(sql`title ILIKE ${'%' + filters.search + '%'}`)
    }

    const whereClause = conditions.reduce(
      (acc, cond, i) => (i === 0 ? sql`WHERE ${cond}` : sql`${acc} AND ${cond}`),
      sql``
    )

    const result = await db.execute(
      sql`SELECT * FROM ir_scenario_summary ${whereClause} ORDER BY severity DESC, id`
    )
    const rows = result as unknown as Record<string, unknown>[]
    return rows
  },

  /** Get single scenario with ALL related data */
  async getScenario(scenarioId: string) {
    // 1. Scenario
    const scenarioResult = await db.execute(
      sql`SELECT * FROM ir_scenarios WHERE id = ${scenarioId}`
    )
    const scenarios = scenarioResult as unknown as Record<string, unknown>[]
    if (scenarios.length === 0) return null

    const scenario = scenarios[0]

    // 2. Detection indicators
    const indicatorsResult = await db.execute(
      sql`SELECT * FROM ir_detection_indicators WHERE scenario_id = ${scenarioId} ORDER BY sequence`
    )
    const detection_indicators = indicatorsResult as unknown as Record<string, unknown>[]

    // 3. Actions (phase order, priority, warnings last)
    const actionsResult = await db.execute(
      sql`SELECT * FROM ir_actions WHERE scenario_id = ${scenarioId}
          ORDER BY
            CASE phase WHEN 'IMMEDIATE' THEN 1 WHEN 'SHORT' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LONG' THEN 4 END,
            CASE WHEN do_not THEN 9999 ELSE priority END`
    )
    const actions = actionsResult as unknown as Record<string, unknown>[]

    // 4. Escalation levels with recipients
    const levelsResult = await db.execute(
      sql`SELECT * FROM ir_escalation_levels WHERE scenario_id = ${scenarioId} ORDER BY level`
    )
    const levels = levelsResult as unknown as Record<string, unknown>[]

    const escalation = await Promise.all(
      levels.map(async (lvl) => {
        const recipientsResult = await db.execute(
          sql`SELECT * FROM ir_escalation_recipients WHERE escalation_level_id = ${lvl.id as string} ORDER BY sequence`
        )
        const recipients = recipientsResult as unknown as Record<string, unknown>[]
        return { ...lvl, recipients }
      })
    )

    // 5. Recovery steps
    const recoveryResult = await db.execute(
      sql`SELECT * FROM ir_recovery_steps WHERE scenario_id = ${scenarioId} ORDER BY sequence`
    )
    const recovery_steps = recoveryResult as unknown as Record<string, unknown>[]

    // 6. Checklist items
    const checklistResult = await db.execute(
      sql`SELECT * FROM ir_checklist_items WHERE scenario_id = ${scenarioId} ORDER BY sequence`
    )
    const checklist = checklistResult as unknown as Record<string, unknown>[]

    // 7. Lessons learned
    const lessonsResult = await db.execute(
      sql`SELECT * FROM ir_lessons_learned WHERE scenario_id = ${scenarioId}`
    )
    const lessons_learned = lessonsResult as unknown as Record<string, unknown>[]

    // 8. References
    const referencesResult = await db.execute(
      sql`SELECT * FROM ir_references WHERE scenario_id = ${scenarioId}`
    )
    const references = referencesResult as unknown as Record<string, unknown>[]

    return {
      ...scenario,
      detection_indicators,
      actions,
      escalation,
      recovery_steps,
      checklist,
      lessons_learned,
      references,
    }
  },

  /** Import a scenario from JSON using the ir_import_scenario function */
  async importScenario(scenarioJson: Record<string, unknown>) {
    const wrapped = JSON.stringify({ scenario: scenarioJson })
    const result = await db.execute(
      sql`SELECT ir_import_scenario(${wrapped}::jsonb) as scenario_id`
    )
    const rows = result as unknown as Array<{ scenario_id: string }>
    return rows[0]?.scenario_id
  },

  /** Import multiple scenarios in batch */
  async importBatch(scenarios: Record<string, unknown>[]) {
    const imported: string[] = []
    for (const s of scenarios) {
      try {
        const id = await this.importScenario(s)
        if (id) imported.push(id)
      } catch (err) {
        logger.error(`Failed to import scenario ${(s as Record<string, unknown>).id}`, err, { module: 'IrPlaybook' })
      }
    }
    return imported
  },

  /** Get immediate actions across all scenarios */
  async getImmediateActions() {
    const result = await db.execute(sql`SELECT * FROM ir_immediate_actions`)
    const rows = result as unknown as Record<string, unknown>[]
    return rows
  },

  /** Get DSGVO checklist items */
  async getDsgvoChecklist() {
    const result = await db.execute(sql`SELECT * FROM ir_dsgvo_checklist`)
    const rows = result as unknown as Record<string, unknown>[]
    return rows
  },

  /** Get BSI control mapping */
  async getBsiControlMapping() {
    const result = await db.execute(sql`SELECT * FROM ir_bsi_control_mapping`)
    const rows = result as unknown as Record<string, unknown>[]
    return rows
  },

  /** Delete a scenario */
  async deleteScenario(scenarioId: string) {
    await db.execute(sql`DELETE FROM ir_scenarios WHERE id = ${scenarioId}`)
  },

  /** Get aggregate stats */
  async getStats() {
    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE deprecated_at IS NULL)::int as active,
        COUNT(*) FILTER (WHERE dsgvo_relevant)::int as dsgvo_count,
        COUNT(*) FILTER (WHERE nis2_relevant)::int as nis2_count,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL')::int as critical_count
      FROM ir_scenarios
    `)
    const rows = result as unknown as Record<string, unknown>[]
    return rows[0] || {}
  },
}
