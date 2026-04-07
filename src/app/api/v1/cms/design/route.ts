import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

const DESIGN_KEYS = [
  'defaultFont', 'defaultAccent', 'defaultRadius', 'defaultTheme',
  'logoUrl', 'logoAlt', 'headerSticky', 'footerText',
  'contactHeadline', 'contactDescription', 'contactInterestTags',
]

export async function GET(request: NextRequest) {
  return withPermission(request, 'cms', 'read', async (auth) => {
    const [tenant] = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, auth.tenantId))
      .limit(1)

    const settings = (tenant?.settings ?? {}) as Record<string, unknown>
    const design: Record<string, unknown> = {}
    for (const key of DESIGN_KEYS) {
      design[key] = settings[key] ?? null
    }

    return apiSuccess(design)
  })
}

export async function PUT(request: NextRequest) {
  return withPermission(request, 'cms', 'update', async (auth) => {
    try {
      const body = await request.json()

      // Only allow design keys to be updated
      const patch: Record<string, unknown> = {}
      for (const key of DESIGN_KEYS) {
        if (key in body) {
          patch[key] = body[key]
        }
      }

      if (Object.keys(patch).length === 0) {
        return apiError('VALIDATION_ERROR', 'No design fields provided', 400)
      }

      // Merge into existing settings using jsonb concatenation
      const [updated] = await db
        .update(tenants)
        .set({
          settings: sql`COALESCE(${tenants.settings}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, auth.tenantId))
        .returning({ settings: tenants.settings })

      return apiSuccess(updated?.settings ?? patch)
    } catch (error) {
      logger.error('Failed to update design settings', error, { module: 'CmsDesignAPI' })
      return apiError('UPDATE_FAILED', 'Failed to update design settings', 500)
    }
  })
}
