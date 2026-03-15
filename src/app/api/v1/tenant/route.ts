import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
  apiValidationError,
} from '@/lib/utils/api-response'
import { TenantService } from '@/lib/services/tenant.service'
import { withPermission } from '@/lib/auth/require-permission'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes')
    .optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async (auth) => {
    const tenant = await TenantService.getById(auth.tenantId)

    if (!tenant) {
      return apiError('NOT_FOUND', 'Tenant not found', 404)
    }

    return apiSuccess(tenant)
  })
}

export async function PUT(request: NextRequest) {
  return withPermission(request, 'settings', 'update', async (auth) => {
    try {
      const body = await request.json()
      const validation = updateTenantSchema.safeParse(body)

      if (!validation.success) {
        return apiValidationError(
          validation.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        )
      }

      // Check if slug is unique (if being changed)
      if (validation.data.slug) {
        const slugExists = await TenantService.slugExists(
          validation.data.slug,
          auth.tenantId
        )
        if (slugExists) {
          return apiError('SLUG_EXISTS', 'This slug is already in use', 400)
        }
      }

      const tenant = await TenantService.update(
        auth.tenantId,
        validation.data
      )

      if (!tenant) {
        return apiError('NOT_FOUND', 'Tenant not found', 404)
      }

      return apiSuccess(tenant)
    } catch (error) {
      logger.error('Update tenant error', error, { module: 'TenantAPI' })
      return apiError('UPDATE_FAILED', 'Failed to update tenant', 500)
    }
  })
}
