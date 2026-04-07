import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { workflows } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

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
      const [workflow] = await db.insert(workflows).values({
        name: body.name || 'Neuer Workflow',
        description: body.description || '',
        trigger: body.trigger || 'contact.submitted',
        steps: body.steps || [],
        isActive: body.isActive ?? false,
        createdBy: auth.userId,
      }).returning()
      return apiSuccess(workflow, undefined, 201)
    } catch (error) {
      logger.error('Failed to create workflow', error, { module: 'WorkflowsAPI' })
      return apiError('CREATE_FAILED', 'Workflow konnte nicht erstellt werden', 500)
    }
  })
}
