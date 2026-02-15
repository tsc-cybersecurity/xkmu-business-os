import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { CmsBlockTypeService } from '@/lib/services/cms-block-type.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'cms', 'read', async () => {
    try {
      let types = await CmsBlockTypeService.list()
      if (types.length === 0) {
        await CmsBlockTypeService.seedDefaults()
        types = await CmsBlockTypeService.list()
      }
      return apiSuccess(types)
    } catch (error) {
      console.error('Error fetching block types:', error)
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
      console.error('Error seeding block types:', error)
      return apiServerError()
    }
  })
}
