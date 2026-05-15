import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError, apiError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { z } from 'zod'
import { CmsPromoSlotService, isValidPromoSlug } from '@/lib/services/cms-promo-slot.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

const createPromoSchema = z.object({
  slug: z.string().min(1).max(120).refine(isValidPromoSlug, {
    message: 'Slug darf nur a-z, 0-9 und Bindestriche enthalten.',
  }),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  blockType: z.string().min(1).max(50),
  content: z.record(z.string(), z.unknown()).default({}),
  settings: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'cms', 'read', async () => {
    const slots = await CmsPromoSlotService.list()
    return apiSuccess(slots)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'cms', 'create', async () => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createPromoSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      // Slug-Eindeutigkeit pruefen — DB-Constraint wuerde es auch fangen,
      // aber so geben wir dem Editor eine sprechende Fehlermeldung.
      const existing = await CmsPromoSlotService.getBySlug(validation.data.slug)
      if (existing) {
        return apiError('CONFLICT', 'Slug ist bereits vergeben.', 409)
      }

      const slot = await CmsPromoSlotService.create(validation.data)
      return apiSuccess(slot, undefined, 201)
    } catch (error) {
      logger.error('Error creating promo slot', error, { module: 'CmsPromosAPI' })
      return apiServerError()
    }
  })
}
