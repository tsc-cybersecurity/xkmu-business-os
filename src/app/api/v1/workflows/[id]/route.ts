import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { workflows } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

interface RouteParams { params: Promise<{ id: string }> }

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
      const update: Record<string, unknown> = { updatedAt: new Date() }
      if (body.name !== undefined) update.name = body.name
      if (body.description !== undefined) update.description = body.description
      if (body.trigger !== undefined) update.trigger = body.trigger
      if (body.steps !== undefined) update.steps = body.steps
      if (body.isActive !== undefined) update.isActive = body.isActive

      const [workflow] = await db.update(workflows).set(update).where(eq(workflows.id, id)).returning()
      if (!workflow) return apiError('NOT_FOUND', 'Workflow nicht gefunden', 404)
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
    return apiSuccess({ deleted: true })
  })
}
