import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiError,
} from '@/lib/utils/api-response'
import { searchOpportunitiesSchema,
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

      // Step 1: Search via SerpAPI
      let searchResults
      try {
        searchResults = await SerpApiService.searchMultiple(
          queryList,
          locationList,
          radius || 25,
          maxPerLocation || 20,
          TENANT_ID
        )
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
        logger.error('SerpAPI search failed', error, { module: 'OpportunitiesAPI' })
        return apiError('SERPAPI_ERROR', `SerpAPI Fehler: ${msg}`, 500)
      }

      // Step 2: Save results
      try {
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

        const saveResult = await OpportunityService.createMany(items
        )

        // Repair addresses for all opportunities (including just-inserted ones)
        await OpportunityService.repairAddresses().catch(() => {})

        return apiSuccess({
          saved: saveResult.inserted,
          enriched: saveResult.enriched,
          duplicates: saveResult.skipped,
          errors: searchResults.errors,
        })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
        logger.error('Save opportunities failed', error, { module: 'OpportunitiesAPI' })
        return apiError('SAVE_ERROR', `Speichern fehlgeschlagen: ${msg}`, 500)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
      logger.error('Search opportunities error', error, { module: 'OpportunitiesAPI' })
      return apiError('SEARCH_FAILED', message, 500)
    }
  })
}
