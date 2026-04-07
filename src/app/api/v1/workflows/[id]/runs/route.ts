import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { workflowRuns } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'read', async () => {
    const { id } = await params
    const runs = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.workflowId, id))
      .orderBy(desc(workflowRuns.startedAt))
      .limit(50)
    return apiSuccess(runs)
  })
}
