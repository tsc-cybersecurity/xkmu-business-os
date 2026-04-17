import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import { withPermission } from '@/lib/auth/require-permission'
type Params = Promise<{ id: string }>

// POST /api/v1/document-templates/[id]/generate - KI fuellt Template
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const { context } = body as { context: string }

      const html = await DocumentTemplateService.generateWithAI(id, context || '')
      return apiSuccess({ html })
    } catch (error) {
      if (error instanceof Error && error.message.includes('nicht gefunden')) {
        return apiNotFound(error.message)
      }
      return apiServerError()
    }
  })
}
