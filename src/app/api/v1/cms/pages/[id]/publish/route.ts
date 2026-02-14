import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound } from '@/lib/utils/api-response'
import { CmsPageService } from '@/lib/services/cms-page.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'update', async (auth) => {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const unpublish = searchParams.get('unpublish') === 'true'

    const page = unpublish
      ? await CmsPageService.unpublish(auth.tenantId, id)
      : await CmsPageService.publish(auth.tenantId, id)

    if (!page) return apiNotFound('Seite nicht gefunden')
    return apiSuccess(page)
  })
}
