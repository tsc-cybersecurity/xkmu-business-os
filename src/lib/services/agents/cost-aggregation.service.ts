/**
 * Aggregiert agent_cost_events fuer die Cost-Analytics-UI.
 * Liefert pre-aggregierte Buckets (Tag/Goal/Modell), nicht Roh-Events.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §7.1 (cost page)
 */

export interface CostByDayRow {
  day: string
  totalCents: number
  totalTokens: number
  callCount: number
}

export interface CostByGoalRow {
  goalId: string
  goalTitle: string
  totalCents: number
  totalTokens: number
}

export interface CostByModelRow {
  provider: string
  model: string
  totalCents: number
  totalTokens: number
  callCount: number
}

export const CostAggregation = {
  async byDay(opts: { rangeDays?: number } = {}): Promise<CostByDayRow[]> {
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')
    const range = opts.rangeDays ?? 7
    const rows = (await db.execute(sql`
      SELECT
        TO_CHAR(date_trunc('day', occurred_at), 'YYYY-MM-DD') AS "day",
        COALESCE(SUM(cost_cents), 0)::int AS "totalCents",
        COALESCE(SUM(input_tokens + output_tokens), 0)::text AS "totalTokens",
        COUNT(*)::text AS "callCount"
      FROM agent_cost_events
      WHERE occurred_at >= NOW() - (${range}::int * INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1 ASC
    `)) as unknown as Array<{ day: string; totalCents: number; totalTokens: string; callCount: string }>
    return rows.map((r) => ({
      day: r.day,
      totalCents: Number(r.totalCents),
      totalTokens: Number(r.totalTokens),
      callCount: Number(r.callCount),
    }))
  },

  async byGoal(opts: { limit?: number; rangeDays?: number } = {}): Promise<CostByGoalRow[]> {
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')
    const limit = opts.limit ?? 10
    const range = opts.rangeDays ?? 30
    const rows = (await db.execute(sql`
      SELECT
        c.goal_id AS "goalId",
        g.title AS "goalTitle",
        COALESCE(SUM(c.cost_cents), 0)::int AS "totalCents",
        COALESCE(SUM(c.input_tokens + c.output_tokens), 0)::text AS "totalTokens"
      FROM agent_cost_events c
      LEFT JOIN agent_goals g ON g.id = c.goal_id
      WHERE c.occurred_at >= NOW() - (${range}::int * INTERVAL '1 day')
        AND c.goal_id IS NOT NULL
      GROUP BY c.goal_id, g.title
      ORDER BY "totalCents" DESC
      LIMIT ${limit}
    `)) as unknown as Array<{ goalId: string; goalTitle: string | null; totalCents: number; totalTokens: string }>
    return rows.map((r) => ({
      goalId: r.goalId,
      goalTitle: r.goalTitle ?? '(geloescht)',
      totalCents: Number(r.totalCents),
      totalTokens: Number(r.totalTokens),
    }))
  },

  async byModel(opts: { rangeDays?: number } = {}): Promise<CostByModelRow[]> {
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')
    const range = opts.rangeDays ?? 30
    const rows = (await db.execute(sql`
      SELECT
        provider, model,
        COALESCE(SUM(cost_cents), 0)::int AS "totalCents",
        COALESCE(SUM(input_tokens + output_tokens), 0)::text AS "totalTokens",
        COUNT(*)::text AS "callCount"
      FROM agent_cost_events
      WHERE occurred_at >= NOW() - (${range}::int * INTERVAL '1 day')
      GROUP BY provider, model
      ORDER BY "totalCents" DESC
    `)) as unknown as Array<{ provider: string; model: string; totalCents: number; totalTokens: string; callCount: string }>
    return rows.map((r) => ({
      provider: r.provider,
      model: r.model,
      totalCents: Number(r.totalCents),
      totalTokens: Number(r.totalTokens),
      callCount: Number(r.callCount),
    }))
  },
}
