import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { CmsBlockTypeService } from '@/lib/services/cms-block-type.service'
import { db } from '@/lib/db'
import { cmsBlockTypeDefinitions } from '@/lib/db/schema'
import { withPermission } from '@/lib/auth/require-permission'
import { eq, and, asc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'cms', 'read', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const onlyForLessons = searchParams.get('available_in_lessons') === 'true'

      if (onlyForLessons) {
        const rows = await db
          .select()
          .from(cmsBlockTypeDefinitions)
          .where(and(
            eq(cmsBlockTypeDefinitions.isActive, true),
            eq(cmsBlockTypeDefinitions.availableInLessons, true),
          ))
          .orderBy(asc(cmsBlockTypeDefinitions.sortOrder))
        return apiSuccess(rows)
      }

      let types = await CmsBlockTypeService.list()
      if (types.length === 0) {
        await CmsBlockTypeService.seedDefaults()
        types = await CmsBlockTypeService.list()
      }
      return apiSuccess(types)
    } catch (error) {
      logger.error('Error fetching block types', error, { module: 'CmsBlockTypesAPI' })
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'cms', 'create', async () => {
    try {
      const seeded = await CmsBlockTypeService.seedDefaults()
      return apiSuccess({ seeded })
    } catch (error) {
      logger.error('Error seeding block types', error, { module: 'CmsBlockTypesAPI' })
      return apiServerError()
    }
  })
}
