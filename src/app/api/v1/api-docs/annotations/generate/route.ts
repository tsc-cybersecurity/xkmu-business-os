import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { ApiDocAnnotationService } from '@/lib/services/api-docs-annotation.service'
import { logger } from '@/lib/utils/logger'

const schema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().min(1).max(500),
})

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(schema, body)
      if (!validation.success) {
        return apiError('VALIDATION_ERROR', 'Validierungsfehler', 400, formatZodErrors(validation.errors))
      }

      const { method, path } = validation.data
      const annotation = await ApiDocAnnotationService.generate(method, path, auth.userId ?? 'system')
      return apiSuccess(annotation)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
      logger.error('API-Doc Annotation Generierung fehlgeschlagen', error, { module: 'ApiDocAnnotationAPI' })
      if (message.includes('nicht gefunden')) {
        return apiError('NOT_FOUND', message, 404)
      }
      if (message.includes('JSON')) {
        return apiError('AI_PARSE_ERROR', message, 422)
      }
      return apiServerError()
    }
  })
}
