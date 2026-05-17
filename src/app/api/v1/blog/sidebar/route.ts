import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { BlogSidebarService } from '@/lib/services/blog-sidebar.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'blog', 'read', async () => {
    try {
      const settings = await BlogSidebarService.get()
      return apiSuccess(settings)
    } catch (error) {
      logger.error('Error loading blog sidebar settings', error, { module: 'BlogSidebarAPI' })
      return apiServerError()
    }
  })
}

export async function PUT(request: NextRequest) {
  return withPermission(request, 'blog', 'update', async () => {
    try {
      const body = await request.json().catch(() => ({}))
      if (body && typeof body !== 'object') {
        return apiValidationError([{ field: 'body', message: 'Erwarte JSON-Objekt' }])
      }
      const updated = await BlogSidebarService.update({
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        markdown: typeof body.markdown === 'string' ? body.markdown : undefined,
      })
      return apiSuccess(updated)
    } catch (error) {
      logger.error('Error updating blog sidebar settings', error, { module: 'BlogSidebarAPI' })
      return apiServerError()
    }
  })
}
