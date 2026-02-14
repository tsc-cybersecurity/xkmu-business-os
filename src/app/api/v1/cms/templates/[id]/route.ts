import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound } from '@/lib/utils/api-response'
import { CmsBlockTemplateService } from '@/lib/services/cms-block-template.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await CmsBlockTemplateService.delete(auth.tenantId, id)
    if (!deleted) return apiNotFound('Vorlage nicht gefunden oder ist eine Systemvorlage')
    return apiSuccess({ deleted: true })
  })
}
