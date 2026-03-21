import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { CompanyActionsService } from '@/lib/services/ai/company-actions.service'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

const generateActionSchema = z.object({
  actionSlug: z.string().min(1, 'actionSlug ist erforderlich'),
})

// POST /api/v1/companies/[id]/actions/generate
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'companies', 'read', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()
      const validation = validateAndParse(generateActionSchema, body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', 'Ungültige Eingabe', 400)
      }

      const { actionSlug } = validation.data

      const result = await CompanyActionsService.generate(
        auth.tenantId,
        id,
        actionSlug,
        auth.userId
      )

      return apiSuccess(result)
    } catch (error) {
      logger.error('Company action generation error', error, { module: 'CompanyActionsAPI' })

      return apiError(
        'ACTION_GENERATION_FAILED',
        error instanceof Error ? error.message : 'KI-Aktion fehlgeschlagen',
        500
      )
    }
  })
}
