import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiError,
} from '@/lib/utils/api-response'
import {
  searchOpportunitiesSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { OpportunityService } from '@/lib/services/opportunity.service'
import { SerpApiService } from '@/lib/services/serpapi.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  return withPermission(request, 'opportunities', 'create', async (auth) => {
    try {
      const body = await request.json()

      const validation = validateAndParse(searchOpportunitiesSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const { queries, locations, radius, maxPerLocation } = validation.data

      // Split comma-separated values and trim
      const queryList = queries.split(',').map((q: string) => q.trim()).filter(Boolean)
      const locationList = locations.split(',').map((l: string) => l.trim()).filter(Boolean)

      if (queryList.length === 0 || locationList.length === 0) {
        return apiError('INVALID_INPUT', 'Mindestens eine Branche und ein Ort erforderlich', 400)
      }

      // Search via SerpAPI
      const searchResults = await SerpApiService.searchMultiple(
        queryList,
        locationList,
        radius || 25,
        maxPerLocation || 20
      )

      // Save results as opportunities - convert nulls to undefined for compatibility
      const items = searchResults.results.map((r) => ({
        ...r,
        phone: r.phone ?? undefined,
        email: r.email ?? undefined,
        website: r.website ?? undefined,
        rating: r.rating ?? undefined,
        reviewCount: r.reviewCount ?? undefined,
        searchQuery: queryList.join(', '),
        searchLocation: locationList.join(', '),
      }))

      const saveResult = await OpportunityService.createMany(
        auth.tenantId,
        items
      )

      return apiSuccess({
        saved: saveResult.inserted,
        duplicates: saveResult.skipped,
        errors: searchResults.errors,
      })
    } catch (error) {
      logger.error('Search opportunities error', error, { module: 'OpportunitiesAPI' })
      return apiError('SEARCH_FAILED', 'Failed to search opportunities', 500)
    }
  })
}
