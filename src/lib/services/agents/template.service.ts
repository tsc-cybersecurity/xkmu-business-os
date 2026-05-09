/**
 * TemplateService — verwaltet agent_goal_templates und legt Goals daraus an.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §8 (Phase 8)
 */

import type { AgentGoalTemplate } from '@/lib/db/schema'

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => variables[key] ?? '')
}

export const TemplateService = {
  async list(): Promise<AgentGoalTemplate[]> {
    const { db } = await import('@/lib/db')
    const { agentGoalTemplates } = await import('@/lib/db/schema')
    const { eq, asc } = await import('drizzle-orm')
    const rows = await db.select().from(agentGoalTemplates).where(eq(agentGoalTemplates.isActive, true)).orderBy(asc(agentGoalTemplates.name))
    return rows as AgentGoalTemplate[]
  },

  async getById(id: string): Promise<AgentGoalTemplate | null> {
    const { db } = await import('@/lib/db')
    const { agentGoalTemplates } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const [row] = await db.select().from(agentGoalTemplates).where(eq(agentGoalTemplates.id, id)).limit(1)
    return (row as AgentGoalTemplate) ?? null
  },

  async createGoalFromTemplate(
    templateId: string,
    variables: Record<string, string>,
  ): Promise<{ goalId: string; runId: string }> {
    const { db } = await import('@/lib/db')
    const { agentGoalTemplates } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [tmpl] = await db.select().from(agentGoalTemplates).where(eq(agentGoalTemplates.id, templateId)).limit(1)
    if (!tmpl) throw new Error(`Template ${templateId} nicht gefunden`)

    // Required-Variables-Check
    const missing = (tmpl.requiredVariables as string[]).filter((v) => !variables[v] || variables[v].trim().length === 0)
    if (missing.length > 0) throw new Error(`Erforderliche Variablen fehlen: ${missing.join(', ')}`)

    const title = renderTemplate(tmpl.titleTemplate, variables)
    const description = tmpl.descriptionTemplate ? renderTemplate(tmpl.descriptionTemplate, variables) : null

    const { GoalService } = await import('./goal.service')
    const { id: goalId } = await GoalService.create({
      title,
      description: description ?? undefined,
      executionMode: (tmpl.defaultExecutionMode === 'immediate' ? 'immediate' : 'cron'),
      budgetCents: tmpl.defaultBudgetCents ?? undefined,
      budgetTokens: tmpl.defaultBudgetTokens ?? undefined,
      priority: (tmpl.defaultPriority as 1 | 2 | 3) ?? 2,
      requirePlanApproval: tmpl.defaultRequirePlanApproval,
    })
    const startResult = await GoalService.start(goalId)
    return { goalId, runId: startResult.runId }
  },
}
