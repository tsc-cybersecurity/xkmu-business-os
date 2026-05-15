import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiValidationError, apiServerError, apiError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { z } from 'zod'
import { CmsPromoSlotService, isValidPromoSlug } from '@/lib/services/cms-promo-slot.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

const updatePromoSchema = z.object({
  slug: z.string().min(1).max(120).refine(isValidPromoSlug, {
    message: 'Slug darf nur a-z, 0-9 und Bindestriche enthalten.',
  }).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  blockType: z.string().min(1).max(50).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'read', async () => {
    const { id } = await params
    const slot = await CmsPromoSlotService.getById(id)
    if (!slot) return apiNotFound('Promo-Slot nicht gefunden')
    return apiSuccess(slot)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updatePromoSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      // Wenn der Slug geaendert wird, muss er weiterhin eindeutig sein.
      if (validation.data.slug) {
        const existing = await CmsPromoSlotService.getBySlug(validation.data.slug)
        if (existing && existing.id !== id) {
          return apiError('CONFLICT', 'Slug ist bereits vergeben.', 409)
        }
      }

      const slot = await CmsPromoSlotService.update(id, validation.data)
      if (!slot) return apiNotFound('Promo-Slot nicht gefunden')
      return apiSuccess(slot)
    } catch (error) {
      logger.error('Error updating promo slot', error, { module: 'CmsPromosAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'delete', async () => {
    const { id } = await params
    const deleted = await CmsPromoSlotService.delete(id)
    if (!deleted) return apiNotFound('Promo-Slot nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
