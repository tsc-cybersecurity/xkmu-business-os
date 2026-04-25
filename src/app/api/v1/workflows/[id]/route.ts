import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { workflows } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

interface RouteParams { params: Promise<{ id: string }> }

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

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'read', async () => {
    const { id } = await params
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id)).limit(1)
    if (!workflow) return apiError('NOT_FOUND', 'Workflow nicht gefunden', 404)
    return apiSuccess(workflow)
  })
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()

      if (body.schedule !== undefined) {
        const validation = validateSchedule(body.schedule)
        if (!validation.ok) return apiError('VALIDATION', validation.error, 400)
      }

      const update: Record<string, unknown> = { updatedAt: new Date() }
      if (body.name !== undefined) update.name = body.name
      if (body.description !== undefined) update.description = body.description
      if (body.trigger !== undefined) update.trigger = body.trigger
      if (body.steps !== undefined) update.steps = body.steps
      if (body.schedule !== undefined) update.schedule = body.schedule
      if (body.isActive !== undefined) update.isActive = body.isActive

      const [workflow] = await db.update(workflows).set(update).where(eq(workflows.id, id)).returning()
      if (!workflow) return apiError('NOT_FOUND', 'Workflow nicht gefunden', 404)

      const { WorkflowService } = await import('@/lib/services/workflow.service')
      await WorkflowService.syncSchedule(id)

      return apiSuccess(workflow)
    } catch (error) {
      logger.error('Failed to update workflow', error, { module: 'WorkflowsAPI' })
      return apiError('UPDATE_FAILED', 'Workflow konnte nicht aktualisiert werden', 500)
    }
  })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'delete', async () => {
    const { id } = await params
    const result = await db.delete(workflows).where(eq(workflows.id, id)).returning({ id: workflows.id })
    if (result.length === 0) return apiError('NOT_FOUND', 'Workflow nicht gefunden', 404)

    const { WorkflowService } = await import('@/lib/services/workflow.service')
    await WorkflowService.syncSchedule(id)

    return apiSuccess({ deleted: true })
  })
}
