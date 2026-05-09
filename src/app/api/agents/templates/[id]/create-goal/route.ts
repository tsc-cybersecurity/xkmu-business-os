import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiError } from '@/lib/utils/api-response'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id: templateId } = await params

  let body: { variables?: Record<string, unknown> }
  try { body = await req.json() } catch { return apiError('BAD_REQUEST', 'Body nicht parseable', 400) }

  const variables: Record<string, string> = {}
  if (body.variables && typeof body.variables === 'object') {
    for (const [k, v] of Object.entries(body.variables)) {
      if (typeof v === 'string') variables[k] = v
    }
  }

  try {
    const { TemplateService } = await import('@/lib/services/agents/template.service')
    const r = await TemplateService.createGoalFromTemplate(templateId, variables)
    return NextResponse.json(r, { status: 201 })
  } catch (e) {
    return apiError('BAD_REQUEST', (e as Error).message, 400)
  }
}
