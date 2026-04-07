import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { z } from 'zod'
import { CmsBlockTemplateService } from '@/lib/services/cms-block-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  blockType: z.string().min(1).max(50),
  content: z.record(z.string(), z.unknown()).default({}),
  settings: z.record(z.string(), z.unknown()).default({}),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'cms', 'read', async () => {
    const { searchParams } = new URL(request.url)
    const blockType = searchParams.get('blockType') || undefined
    const templates = await CmsBlockTemplateService.list(blockType)
    return apiSuccess(templates)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'cms', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createTemplateSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const template = await CmsBlockTemplateService.create(validation.data)
      return apiSuccess(template, undefined, 201)
    } catch (error) {
      logger.error('Error creating CMS template', error, { module: 'CmsTemplatesAPI' })
      return apiServerError()
    }
  })
}
