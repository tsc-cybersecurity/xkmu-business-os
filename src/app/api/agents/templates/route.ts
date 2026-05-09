import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiError } from '@/lib/utils/api-response'

export async function GET(_req: Request) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const { TemplateService } = await import('@/lib/services/agents/template.service')
  const templates = await TemplateService.list()
  return NextResponse.json({ templates })
}

interface CreateInput {
  slug?: unknown
  name?: unknown
  description?: unknown
  titleTemplate?: unknown
  descriptionTemplate?: unknown
  requiredVariables?: unknown
  defaultBudgetCents?: unknown
  defaultBudgetTokens?: unknown
  defaultExecutionMode?: unknown
  defaultPriority?: unknown
  defaultRequirePlanApproval?: unknown
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  let body: CreateInput
  try { body = await req.json() } catch { return apiError('BAD_REQUEST', 'Body nicht parseable', 400) }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const titleTemplate = typeof body.titleTemplate === 'string' ? body.titleTemplate : ''
  if (!slug || !name || !titleTemplate) return apiError('BAD_REQUEST', 'slug + name + titleTemplate erforderlich', 400)

  const requiredVariables = Array.isArray(body.requiredVariables)
    ? body.requiredVariables.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : []

  const { db } = await import('@/lib/db')
  const { agentGoalTemplates } = await import('@/lib/db/schema')
  const [row] = await db
    .insert(agentGoalTemplates)
    .values({
      slug,
      name,
      description: typeof body.description === 'string' ? body.description : null,
      titleTemplate,
      descriptionTemplate: typeof body.descriptionTemplate === 'string' ? body.descriptionTemplate : null,
      requiredVariables,
      defaultBudgetCents: typeof body.defaultBudgetCents === 'number' ? body.defaultBudgetCents : null,
      defaultBudgetTokens: typeof body.defaultBudgetTokens === 'number' ? body.defaultBudgetTokens : null,
      defaultExecutionMode: typeof body.defaultExecutionMode === 'string' ? body.defaultExecutionMode : 'cron',
      defaultPriority: typeof body.defaultPriority === 'number' ? body.defaultPriority : 2,
      defaultRequirePlanApproval: typeof body.defaultRequirePlanApproval === 'boolean' ? body.defaultRequirePlanApproval : false,
    })
    .returning({ id: agentGoalTemplates.id })

  return NextResponse.json({ id: row.id }, { status: 201 })
}
