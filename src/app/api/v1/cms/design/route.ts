import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { cmsSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

const SETTINGS_KEY = 'design'

export async function GET(request: NextRequest) {
  return withPermission(request, 'cms', 'read', async () => {
    const [row] = await db
      .select({ value: cmsSettings.value })
      .from(cmsSettings)
      .where(eq(cmsSettings.key, SETTINGS_KEY))
      .limit(1)

    return apiSuccess(row?.value ?? {})
  })
}

export async function PUT(request: NextRequest) {
  return withPermission(request, 'cms', 'update', async () => {
    try {
      const body = await request.json()

      const [existing] = await db
        .select({ id: cmsSettings.id })
        .from(cmsSettings)
        .where(eq(cmsSettings.key, SETTINGS_KEY))
        .limit(1)

      let result: Record<string, unknown>

      if (existing) {
        const [updated] = await db
          .update(cmsSettings)
          .set({ value: body, updatedAt: new Date() })
          .where(eq(cmsSettings.id, existing.id))
          .returning({ value: cmsSettings.value })
        result = (updated?.value ?? body) as Record<string, unknown>
      } else {
        const [inserted] = await db
          .insert(cmsSettings)
          .values({ key: SETTINGS_KEY, value: body })
          .returning({ value: cmsSettings.value })
        result = (inserted?.value ?? body) as Record<string, unknown>
      }

      return apiSuccess(result)
    } catch (error) {
      logger.error('Failed to update design settings', error, { module: 'CmsDesignAPI' })
      return apiError('UPDATE_FAILED', 'Failed to update design settings', 500)
    }
  })
}
