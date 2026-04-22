import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { CompanyService } from '@/lib/services/company.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPortalAuth(request, async (auth) => {
    try {
      const company = await CompanyService.getById(auth.companyId)
      if (!company) return apiNotFound('Firma nicht gefunden')

      // Portal-safe projection — no internal fields
      return apiSuccess({
        id: company.id,
        name: company.name,
        legalForm: company.legalForm,
        street: company.street,
        houseNumber: company.houseNumber,
        postalCode: company.postalCode,
        city: company.city,
        country: company.country,
        phone: company.phone,
        email: company.email,
        website: company.website,
        industry: company.industry,
        vatId: company.vatId,
      })
    } catch (error) {
      logger.error('portal me/company error', error, { module: 'PortalAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden', 500)
    }
  })
}
