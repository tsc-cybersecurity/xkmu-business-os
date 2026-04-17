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
import { TENANT_ID } from '@/lib/constants/tenant'

const optStr = z.string().max(255).optional().or(z.literal(''))

const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes')
    .optional(),
  street: optStr,
  houseNumber: z.string().max(20).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  city: optStr,
  country: z.string().max(10).optional().or(z.literal('')),
  legalForm: z.string().max(100).optional().or(z.literal('')),
  managingDirector: optStr,
  tradeRegister: optStr,
  vatId: z.string().max(50).optional().or(z.literal('')),
  taxNumber: z.string().max(50).optional().or(z.literal('')),
  bankName1: optStr,
  bankIban1: z.string().max(40).optional().or(z.literal('')),
  bankBic1: z.string().max(20).optional().or(z.literal('')),
  bankName2: optStr,
  bankIban2: z.string().max(40).optional().or(z.literal('')),
  bankBic2: z.string().max(20).optional().or(z.literal('')),
  phone: z.string().max(100).optional().or(z.literal('')),
  email: z.string().max(255).optional().or(z.literal('')),
  website: z.string().max(500).optional().or(z.literal('')),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async (auth) => {
    const tenant = await TenantService.getById(TENANT_ID)

    if (!tenant) {
      return apiError('NOT_FOUND', 'Tenant not found', 404)
    }

    return apiSuccess(tenant)
  })
}

export async function PUT(request: NextRequest) {
  return withPermission(request, 'settings', 'update', async (_auth) => {
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
          TENANT_ID
        )
        if (slugExists) {
          return apiError('SLUG_EXISTS', 'This slug is already in use', 400)
        }
      }

      const tenant = await TenantService.update(
        TENANT_ID,
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
