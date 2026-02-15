import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { CmsNavigationService } from '@/lib/services/cms-navigation.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function POST(request: NextRequest) {
  return withPermission(request, 'cms', 'create', async (auth) => {
    try {
      const result = await CmsNavigationService.seedDefaults(auth.tenantId)
      return apiSuccess(result)
    } catch (error) {
      console.error('Error seeding navigation defaults:', error)
      return apiServerError()
    }
  })
}
