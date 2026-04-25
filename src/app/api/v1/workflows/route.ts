import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { workflows } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

function validateSchedule(s: unknown): { ok: true } | { ok: false; error: string } {
  if (s == null) return { ok: true }
  if (typeof s !== 'object') return { ok: false, error: 'schedule must be object or null' }
  const schedule = s as Record<string, unknown>
  const valid = ['5min', '15min', '30min', '60min', 'daily']
  if (!valid.includes(schedule.interval as string)) {
    return { ok: false, error: `schedule.interval must be one of: ${valid.join(', ')}` }
  }
  if (schedule.interval === 'daily' && schedule.dailyAt) {
    if (typeof schedule.dailyAt !== 'string' || !/^\d{2}:\d{2}$/.test(schedule.dailyAt)) {
      return { ok: false, error: 'schedule.dailyAt must be HH:MM format' }
    }
  }
  return { ok: true }
}

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    const items = await db.select().from(workflows).orderBy(asc(workflows.createdAt))
    return apiSuccess(items)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'create', async (auth) => {
    try {
      const body = await request.json()

      if (body.schedule !== undefined) {
        const validation = validateSchedule(body.schedule)
        if (!validation.ok) return apiError('VALIDATION', validation.error, 400)
      }

      const [workflow] = await db.insert(workflows).values({
        name: body.name || 'Neuer Workflow',
        description: body.description || '',
        trigger: body.trigger || 'contact.submitted',
        steps: body.steps || [],
        schedule: body.schedule ?? null,
        isActive: body.isActive ?? false,
        createdBy: auth.userId,
      }).returning()

      const { WorkflowService } = await import('@/lib/services/workflow.service')
      await WorkflowService.syncSchedule(workflow.id)

      return apiSuccess(workflow, undefined, 201)
    } catch (error) {
      logger.error('Failed to create workflow', error, { module: 'WorkflowsAPI' })
      return apiError('CREATE_FAILED', 'Workflow konnte nicht erstellt werden', 500)
    }
  })
}
