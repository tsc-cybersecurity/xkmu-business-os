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

  /** Import a full playbook JSON file (scenarios + actions + escalation + recovery + checklist + lessons + references) */
  async importFullPlaybook(data: Record<string, unknown>) {
    const scenarios = (data.scenarios || []) as Array<Record<string, unknown>>
    const actions = (data.actions || []) as Array<Record<string, unknown>>
    const escalation = (data.escalation_levels || []) as Array<Record<string, unknown>>
    const recovery = (data.recovery_steps || []) as Array<Record<string, unknown>>
    const checklist = (data.checklist_items || []) as Array<Record<string, unknown>>
    const lessons = (data.lessons_learned || []) as Array<Record<string, unknown>>
    const references = (data.references || []) as Array<Record<string, unknown>>
    const meta = (data.meta || {}) as Record<string, unknown>

    const imported: string[] = []

    for (const s of scenarios) {
      try {
        const scenarioId = s.id as string
        if (!scenarioId) continue

        const slug = scenarioId.toLowerCase().replace(/[^a-z0-9]/g, '-')

        // Upsert scenario
        await db.execute(sql`
          INSERT INTO ir_scenarios (id, slug, version, series, title, overview, severity, likelihood, dsgvo_relevant, nis2_relevant, financial_risk, created_by)
          VALUES (
            ${scenarioId},
            ${slug},
            ${(meta.version as string) || '1.0'},
            ${(s.series as string) || (s.band as string) || (meta.series as string) || 'I'},
            ${s.title as string},
            ${(s.description as string) || ''},
            ${(s.severity as string) || 'MEDIUM'},
            ${'MEDIUM'},
            ${!!(s.description as string)?.toLowerCase().includes('dsgvo')},
            ${!!(s.description as string)?.toLowerCase().includes('nis-2')},
            ${'MEDIUM'},
            ${(meta.author as string) || 'xKMU'}
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            overview = EXCLUDED.overview,
            severity = EXCLUDED.severity,
            series = EXCLUDED.series,
            version = EXCLUDED.version,
            updated_at = NOW()
        `)

        // Import trigger_indicators as detection_indicators
        const triggers = (s.trigger_indicators || []) as string[]
        if (triggers.length > 0) {
          await db.execute(sql`DELETE FROM ir_detection_indicators WHERE scenario_id = ${scenarioId}`)
          for (let i = 0; i < triggers.length; i++) {
            await db.execute(sql`
              INSERT INTO ir_detection_indicators (scenario_id, type, description, sequence)
              VALUES (${scenarioId}, 'trigger', ${triggers[i]}, ${i + 1})
            `)
          }
        }

        // Import BSI controls as references
        const bsiControls = (s.bsi_controls || []) as string[]
        for (const ctrl of bsiControls) {
          await db.execute(sql`
            INSERT INTO ir_references (scenario_id, title, url)
            VALUES (${scenarioId}, ${'BSI ' + ctrl}, ${'https://www.bsi.bund.de/grundschutz'})
            ON CONFLICT DO NOTHING
          `)
        }

        imported.push(scenarioId)
      } catch (err) {
        logger.error(`Failed to import scenario ${s.id}`, err, { module: 'IrPlaybook' })
      }
    }

    // Import actions
    for (const a of actions) {
      try {
        const actionId = a.id as string
        const scenarioId = a.scenario_id as string
        if (!actionId || !scenarioId) continue

        await db.execute(sql`
          INSERT INTO ir_actions (id, scenario_id, phase, priority, category, responsible, action, detail)
          VALUES (
            ${actionId},
            ${scenarioId},
            ${'immediate'},
            ${(a.step as number) || 1},
            ${'response'},
            ${'IT/GF'},
            ${(a.title as string) || ''},
            ${(a.description as string) || ''}
          )
          ON CONFLICT (id) DO UPDATE SET
            action = EXCLUDED.action,
            detail = EXCLUDED.detail,
            priority = EXCLUDED.priority
        `)
      } catch (err) {
        logger.error(`Failed to import action ${a.id}`, err, { module: 'IrPlaybook' })
      }
    }

    // Import escalation levels
    for (const e of escalation) {
      try {
        const scenarioId = e.scenario_id as string
        if (!scenarioId) continue
        await db.execute(sql`
          INSERT INTO ir_escalation_levels (scenario_id, level, trigger_condition, action, condition_expression)
          VALUES (
            ${scenarioId},
            ${(e.level as number) || 1},
            ${(e.trigger as string) || ''},
            ${(e.action as string) || ''},
            ${(e.condition as string) || null}
          )
          ON CONFLICT DO NOTHING
        `)
      } catch (err) {
        logger.error(`Failed to import escalation ${e.id}`, err, { module: 'IrPlaybook' })
      }
    }

    // Import recovery steps
    for (const r of recovery) {
      try {
        const scenarioId = r.scenario_id as string
        if (!scenarioId) continue
        await db.execute(sql`
          INSERT INTO ir_recovery_steps (scenario_id, phase, step_order, action, detail)
          VALUES (
            ${scenarioId},
            ${'recovery'},
            ${(r.step as number) || 1},
            ${(r.title as string) || ''},
            ${(r.description as string) || ''}
          )
          ON CONFLICT DO NOTHING
        `)
      } catch (err) {
        logger.error(`Failed to import recovery ${r.id}`, err, { module: 'IrPlaybook' })
      }
    }

    // Import checklist items
    for (const c of checklist) {
      try {
        const scenarioId = c.scenario_id as string
        if (!scenarioId) continue
        await db.execute(sql`
          INSERT INTO ir_checklist_items (scenario_id, phase, item, sequence)
          VALUES (
            ${scenarioId},
            ${'response'},
            ${(c.item as string) || ''},
            ${1}
          )
          ON CONFLICT DO NOTHING
        `)
      } catch (err) {
        logger.error(`Failed to import checklist ${c.id}`, err, { module: 'IrPlaybook' })
      }
    }

    // Import lessons learned
    for (const l of lessons) {
      try {
        const scenarioId = l.scenario_id as string
        if (!scenarioId) continue
        await db.execute(sql`
          INSERT INTO ir_lessons_learned (scenario_id, finding, improvement, bsi_mapping)
          VALUES (
            ${scenarioId},
            ${(l.finding as string) || ''},
            ${(l.improvement as string) || ''},
            ${(l.bsi_mapping as string) || null}
          )
          ON CONFLICT DO NOTHING
        `)
      } catch (err) {
        logger.error(`Failed to import lesson ${l.id}`, err, { module: 'IrPlaybook' })
      }
    }

    // Import references
    for (const ref of references) {
      try {
        const relevantScenarios = (ref.relevant_scenarios || []) as string[]
        for (const scenarioId of relevantScenarios) {
          await db.execute(sql`
            INSERT INTO ir_references (scenario_id, title, url)
            VALUES (${scenarioId}, ${(ref.title as string) || ''}, ${(ref.url as string) || ''})
            ON CONFLICT DO NOTHING
          `)
        }
      } catch (err) {
        logger.error(`Failed to import reference ${ref.id}`, err, { module: 'IrPlaybook' })
      }
    }

    logger.info(`IR Playbook import: ${imported.length} scenarios, ${actions.length} actions, ${escalation.length} escalations`, { module: 'IrPlaybook' })
    return imported
  },

  /** Import a single scenario (legacy wrapper) */
  async importScenario(scenarioJson: Record<string, unknown>) {
    const result = await this.importFullPlaybook({ scenarios: [scenarioJson] })
    return result[0]
  },

  /** Import multiple scenarios in batch (legacy wrapper) */
  async importBatch(scenarios: Record<string, unknown>[]) {
    return this.importFullPlaybook({ scenarios })
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
