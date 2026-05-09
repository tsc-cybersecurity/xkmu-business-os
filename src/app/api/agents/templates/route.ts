import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/utils/api-response'

export async function GET(_req: Request) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const { TemplateService } = await import('@/lib/services/agents/template.service')
  const templates = await TemplateService.list()
  return NextResponse.json({ templates })
}
