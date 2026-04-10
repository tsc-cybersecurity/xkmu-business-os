import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

/** Extract the most useful message from a postgres/drizzle error */
function formatPgError(err: unknown): string {
  if (err instanceof Error) {
    // Drizzle wraps the underlying pg error in `cause`
    const cause = (err as unknown as { cause?: unknown }).cause as
      | { message?: string; detail?: string; hint?: string; code?: string; column?: string; constraint?: string }
      | undefined
    if (cause && typeof cause === 'object') {
      const parts = [
        cause.message,
        cause.detail ? `detail=${cause.detail}` : null,
        cause.hint ? `hint=${cause.hint}` : null,
        cause.column ? `column=${cause.column}` : null,
        cause.constraint ? `constraint=${cause.constraint}` : null,
        cause.code ? `code=${cause.code}` : null,
      ].filter(Boolean)
      if (parts.length > 0) return parts.join(' | ')
    }
    return err.message
  }
  return String(err)
}

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
    const scenarioResult = await db.execute(
      sql`SELECT * FROM ir_scenarios WHERE id = ${scenarioId}`
    )
    const scenarios = scenarioResult as unknown as Record<string, unknown>[]
    if (scenarios.length === 0) return null

    const scenario = scenarios[0]

    const indicatorsResult = await db.execute(
      sql`SELECT * FROM ir_detection_indicators WHERE scenario_id = ${scenarioId} ORDER BY sequence`
    )
    const detection_indicators = indicatorsResult as unknown as Record<string, unknown>[]

    const actionsResult = await db.execute(
      sql`SELECT * FROM ir_actions WHERE scenario_id = ${scenarioId}
          ORDER BY
            CASE phase WHEN 'IMMEDIATE' THEN 1 WHEN 'SHORT' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LONG' THEN 4 END,
            CASE WHEN do_not THEN 9999 ELSE priority END`
    )
    const actions = actionsResult as unknown as Record<string, unknown>[]

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

    const recoveryResult = await db.execute(
      sql`SELECT * FROM ir_recovery_steps WHERE scenario_id = ${scenarioId} ORDER BY sequence`
    )
    const recovery_steps = recoveryResult as unknown as Record<string, unknown>[]

    const checklistResult = await db.execute(
      sql`SELECT * FROM ir_checklist_items WHERE scenario_id = ${scenarioId} ORDER BY sequence`
    )
    const checklist = checklistResult as unknown as Record<string, unknown>[]

    const lessonsResult = await db.execute(
      sql`SELECT * FROM ir_lessons_learned WHERE scenario_id = ${scenarioId}`
    )
    const lessons_learned = lessonsResult as unknown as Record<string, unknown>[]

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

  /**
   * Import a full playbook JSON file.
   * Expected input shape (scenarios_sXXX_sYYY.json):
   * {
   *   meta: { band, series, version, author },
   *   scenarios: [{ id, title, description, band, series, severity, category, bsi_controls[], trigger_indicators[] }],
   *   actions: [{ id, scenario_id, step, title, description }],
   *   escalation_levels: [{ id, scenario_id, level, trigger, action, condition? }],
   *   escalation_recipients: [{ id, role, contact, relevant_scenarios[] }],
   *   recovery_steps: [{ id, scenario_id, step, title, description }],
   *   checklist_items: [{ id, scenario_id, item }],
   *   lessons_learned: [{ id, scenario_id, finding, bsi_mapping, improvement }],
   *   references: [{ id, title, url, relevant_scenarios[] }]
   * }
   */
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
    const errors: string[] = []

    // ── Scenarios ────────────────────────────────────────────────────────────
    for (const s of scenarios) {
      try {
        const scenarioId = s.id as string
        if (!scenarioId) { errors.push('Szenario ohne ID übersprungen'); continue }

        const slug = scenarioId.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const title = (s.title as string) || scenarioId
        const description = (s.description as string) || ''
        const severity = (s.severity as string) || 'MEDIUM'
        const series = (s.series as string) || (s.band as string) || (meta.series as string) || 'I'
        const version = (meta.version as string) || '1.0'
        const author = ((meta.author as string) || 'xKMU').substring(0, 100)
        const dsgvo = description.toLowerCase().includes('dsgvo')
        const nis2 = description.toLowerCase().includes('nis-2') || description.toLowerCase().includes('nis2')

        await db.execute(sql`
          INSERT INTO ir_scenarios (
            id, slug, version, series, title, overview, severity, likelihood,
            dsgvo_relevant, nis2_relevant, financial_risk, created_by
          )
          VALUES (
            ${scenarioId}, ${slug}, ${version}, ${series}, ${title}, ${description},
            ${severity}, ${'MEDIUM'}, ${dsgvo}, ${nis2}, ${'MEDIUM'}, ${author}
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            overview = EXCLUDED.overview,
            severity = EXCLUDED.severity,
            series = EXCLUDED.series,
            version = EXCLUDED.version,
            slug = EXCLUDED.slug,
            dsgvo_relevant = EXCLUDED.dsgvo_relevant,
            nis2_relevant = EXCLUDED.nis2_relevant,
            updated_at = NOW()
        `)

        // Trigger indicators
        const triggers = (s.trigger_indicators || []) as string[]
        if (triggers.length > 0) {
          await db.execute(sql`DELETE FROM ir_detection_indicators WHERE scenario_id = ${scenarioId}`)
          for (let i = 0; i < triggers.length; i++) {
            await db.execute(sql`
              INSERT INTO ir_detection_indicators (scenario_id, type, description, sequence)
              VALUES (${scenarioId}, ${'USER_REPORT'}, ${triggers[i]}, ${i + 1})
            `)
          }
        }

        // BSI controls → references
        const bsiControls = (s.bsi_controls || []) as string[]
        for (const ctrl of bsiControls) {
          await db.execute(sql`
            INSERT INTO ir_references (scenario_id, type, name, url)
            VALUES (${scenarioId}, ${'STANDARD'}, ${'BSI ' + ctrl}, ${'https://www.bsi.bund.de/grundschutz'})
            ON CONFLICT DO NOTHING
          `)
        }

        imported.push(scenarioId)
      } catch (err) {
        const msg = `Szenario ${s.id}: ${formatPgError(err)}`
        logger.error(msg, err, { module: 'IrPlaybook' })
        errors.push(msg)
      }
    }

    // ── Actions ──────────────────────────────────────────────────────────────
    // Schema: id(PK), scenario_id, phase, priority(smallint), category, responsible, action, detail
    for (const a of actions) {
      try {
        const actionId = a.id as string
        const scenarioId = a.scenario_id as string
        if (!actionId || !scenarioId) continue
        const priority = (a.step as number) || (a.priority as number) || 1
        const actionText = (a.title as string) || (a.action as string) || ''
        const detailText = (a.description as string) || (a.detail as string) || null

        await db.execute(sql`
          INSERT INTO ir_actions (id, scenario_id, phase, priority, category, responsible, action, detail)
          VALUES (
            ${actionId}, ${scenarioId}, ${'IMMEDIATE'}, ${priority},
            ${'CONTAINMENT'}, ${'IT_ADMIN'}, ${actionText}, ${detailText}
          )
          ON CONFLICT (id) DO UPDATE SET
            action = EXCLUDED.action,
            detail = EXCLUDED.detail,
            priority = EXCLUDED.priority
        `)
      } catch (err) {
        const msg = `Action ${a.id}: ${formatPgError(err)}`
        logger.error(msg, err, { module: 'IrPlaybook' })
        errors.push(msg)
      }
    }

    // ── Escalation levels ────────────────────────────────────────────────────
    // Schema: id(PK varchar15), scenario_id, level(smallint), label(NN), color_hex, deadline_hours, condition
    // JSON action/trigger text is merged into `label` (schema has no action text column).
    for (const e of escalation) {
      try {
        const escId = e.id as string
        const scenarioId = e.scenario_id as string
        if (!escId || !scenarioId) continue
        const level = (e.level as number) || 1
        const trigger = (e.trigger as string) || ''
        const actionText = (e.action as string) || ''
        const label = [trigger, actionText].filter(Boolean).join(' → ').substring(0, 100) || `Level ${level}`
        const condition = (e.condition as string) || null

        await db.execute(sql`
          INSERT INTO ir_escalation_levels (id, scenario_id, level, label, condition)
          VALUES (${escId}, ${scenarioId}, ${level}, ${label}, ${condition})
          ON CONFLICT (id) DO UPDATE SET
            label = EXCLUDED.label,
            condition = EXCLUDED.condition,
            level = EXCLUDED.level
        `)
      } catch (err) {
        const msg = `Eskalation ${e.id}: ${formatPgError(err)}`
        logger.error(msg, err, { module: 'IrPlaybook' })
        errors.push(msg)
      }
    }

    // ── Recovery steps ───────────────────────────────────────────────────────
    // Schema: id(PK varchar15), scenario_id, phase_label(NN), sequence(NN), action(NN), detail, responsible(NN), depends_on
    for (const r of recovery) {
      try {
        const recId = r.id as string
        const scenarioId = r.scenario_id as string
        if (!recId || !scenarioId) continue
        const sequence = (r.step as number) || (r.sequence as number) || 1
        const actionText = (r.title as string) || (r.action as string) || ''
        const detailText = (r.description as string) || (r.detail as string) || null

        await db.execute(sql`
          INSERT INTO ir_recovery_steps (id, scenario_id, phase_label, sequence, action, detail, responsible)
          VALUES (
            ${recId}, ${scenarioId}, ${'Recovery'}, ${sequence},
            ${actionText}, ${detailText}, ${'IT_ADMIN'}
          )
          ON CONFLICT (id) DO UPDATE SET
            action = EXCLUDED.action,
            detail = EXCLUDED.detail,
            sequence = EXCLUDED.sequence
        `)
      } catch (err) {
        const msg = `Recovery ${r.id}: ${formatPgError(err)}`
        logger.error(msg, err, { module: 'IrPlaybook' })
        errors.push(msg)
      }
    }

    // ── Checklist items ──────────────────────────────────────────────────────
    // Schema: id(PK varchar15), scenario_id, sequence(NN), category(NN), item(NN), mandatory, dsgvo_required
    const checklistSeqByScenario = new Map<string, number>()
    for (const c of checklist) {
      try {
        const chkId = c.id as string
        const scenarioId = c.scenario_id as string
        if (!chkId || !scenarioId) continue
        const seq = (checklistSeqByScenario.get(scenarioId) || 0) + 1
        checklistSeqByScenario.set(scenarioId, seq)
        const itemText = (c.item as string) || ''
        const isDsgvo = itemText.toLowerCase().includes('dsgvo')

        await db.execute(sql`
          INSERT INTO ir_checklist_items (id, scenario_id, sequence, category, item, dsgvo_required)
          VALUES (
            ${chkId}, ${scenarioId}, ${seq}, ${'TECHNICAL'}, ${itemText}, ${isDsgvo}
          )
          ON CONFLICT (id) DO UPDATE SET
            item = EXCLUDED.item,
            sequence = EXCLUDED.sequence,
            dsgvo_required = EXCLUDED.dsgvo_required
        `)
      } catch (err) {
        const msg = `Checklist ${c.id}: ${formatPgError(err)}`
        logger.error(msg, err, { module: 'IrPlaybook' })
        errors.push(msg)
      }
    }

    // ── Lessons learned ──────────────────────────────────────────────────────
    // Schema: id(PK varchar15), scenario_id, question(NN), category(NN), maps_to_control
    for (const l of lessons) {
      try {
        const llId = l.id as string
        const scenarioId = l.scenario_id as string
        if (!llId || !scenarioId) continue
        const finding = (l.finding as string) || ''
        const improvement = (l.improvement as string) || ''
        const question = [finding, improvement ? `Verbesserung: ${improvement}` : null]
          .filter(Boolean)
          .join('\n\n')
        const bsiMapping = (l.bsi_mapping as string) || null

        await db.execute(sql`
          INSERT INTO ir_lessons_learned (id, scenario_id, question, category, maps_to_control)
          VALUES (
            ${llId}, ${scenarioId}, ${question}, ${'PROCESS'}, ${bsiMapping}
          )
          ON CONFLICT (id) DO UPDATE SET
            question = EXCLUDED.question,
            maps_to_control = EXCLUDED.maps_to_control
        `)
      } catch (err) {
        const msg = `Lesson ${l.id}: ${formatPgError(err)}`
        logger.error(msg, err, { module: 'IrPlaybook' })
        errors.push(msg)
      }
    }

    // ── References (many-to-many via relevant_scenarios) ────────────────────
    // Schema: id(serial), scenario_id, type(NN), name(NN), url
    for (const ref of references) {
      try {
        const relevantScenarios = (ref.relevant_scenarios || []) as string[]
        const title = (ref.title as string) || ''
        const url = (ref.url as string) || ''
        const urlLower = url.toLowerCase()
        const refType = urlLower.includes('dsgvo') || urlLower.includes('gesetz')
          ? 'LEGAL'
          : urlLower.includes('bsi')
          ? 'STANDARD'
          : 'GUIDE'

        for (const scenarioId of relevantScenarios) {
          await db.execute(sql`
            INSERT INTO ir_references (scenario_id, type, name, url)
            VALUES (${scenarioId}, ${refType}, ${title}, ${url})
            ON CONFLICT DO NOTHING
          `)
        }
      } catch (err) {
        const msg = `Reference ${ref.id}: ${formatPgError(err)}`
        logger.error(msg, err, { module: 'IrPlaybook' })
        errors.push(msg)
      }
    }

    logger.info(
      `IR Playbook import: ${imported.length}/${scenarios.length} scenarios, ${actions.length} actions, ${escalation.length} escalations, ${recovery.length} recovery, ${checklist.length} checklist, ${lessons.length} lessons, ${errors.length} errors`,
      { module: 'IrPlaybook' }
    )
    if (errors.length > 0) {
      logger.warn(`IR Playbook import errors: ${errors.slice(0, 5).join(' ||| ')}`, { module: 'IrPlaybook' })
    }
    return { imported, errors }
  },

  /** Import a single scenario (legacy wrapper) */
  async importScenario(scenarioJson: Record<string, unknown>) {
    const result = await this.importFullPlaybook({ scenarios: [scenarioJson] })
    return result.imported[0]
  },

  /** Import multiple scenarios in batch (legacy wrapper) */
  async importBatch(scenarios: Record<string, unknown>[]) {
    const result = await this.importFullPlaybook({ scenarios })
    return result.imported
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
