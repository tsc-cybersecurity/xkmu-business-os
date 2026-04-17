// ============================================
// SerpAPI Service - Google Maps Business Search
// Searches for businesses via SerpAPI's Google Maps engine
// ============================================

import { logger } from '@/lib/utils/logger'
import { AiProviderService } from '@/lib/services/ai-provider.service'

async function getProviderId(tenantId?: string): Promise<string | null> {
  if (!tenantId) return null
  try {
    const providers = await AiProviderService.list(tenantId)
    return providers.find((p) => p.providerType === 'serpapi' && p.isActive)?.id || null
  } catch { return null }
}

interface SerpApiPlace {
  title: string
  place_id: string
  address: string
  phone?: string
  website?: string
  rating?: number
  reviews?: number
  reviews_link?: string
  type?: string
  types?: string[]
  description?: string
  service_options?: Record<string, boolean>
  price?: string
  hours?: string
  gps_coordinates?: { latitude: number; longitude: number }
  operating_hours?: Record<string, string>
  thumbnail?: string
  images?: string[]
  extensions?: string[]
}

interface SerpApiResponse {
  local_results?: SerpApiPlace[]
  search_metadata?: { status: string }
  error?: string
}

export interface OpportunityResult {
  name: string
  placeId: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string | null
  email: string | null
  website: string | null
  rating: number | null
  reviewCount: number | null
  industry: string
  metadata: Record<string, unknown>
}

async function getApiKey(tenantId?: string): Promise<string> {
  // 1. Try DB (AI Provider with type 'serpapi')
  if (tenantId) {
    try {
      const providers = await AiProviderService.list(tenantId)
      const serpapi = providers.find((p) => p.providerType === 'serpapi' && p.isActive && p.apiKey)
      if (serpapi?.apiKey) return serpapi.apiKey
    } catch {
      // Fall through to env
    }
  }
  // 2. Fallback to env
  const key = process.env.SERPAPI_KEY
  if (!key) throw new Error('SerpAPI ist nicht konfiguriert. Bitte unter Einstellungen → KI-Provider einen SerpAPI-Anbieter anlegen.')
  return key
}

function parseAddress(address: string): { street: string; city: string; postalCode: string; country: string } {
  if (!address) return { street: '', city: '', postalCode: '', country: 'DE' }

  // Typical formats:
  // "Musterstr. 1, 80331 München, Germany"
  // "Musterstr. 1, München, Deutschland"
  // "80331 München"
  // "Musterstr. 1, 80331 München"
  const parts = address.split(',').map(p => p.trim())

  let street = ''
  let city = ''
  let postalCode = ''
  let country = 'DE'

  // Last part might be country
  const lastPart = parts[parts.length - 1] || ''
  if (/^(Germany|Deutschland|DE|AT|CH|Österreich|Schweiz)$/i.test(lastPart)) {
    country = lastPart.includes('sterreich') || lastPart === 'AT' ? 'AT'
      : lastPart.includes('Schweiz') || lastPart === 'CH' ? 'CH' : 'DE'
    parts.pop()
  }

  // First part is usually street
  if (parts.length >= 1) {
    street = parts[0]
  }

  // Look for PLZ+City in any remaining part
  for (let i = 1; i < parts.length; i++) {
    const plzMatch = parts[i].match(/(\d{4,5})\s+(.+)/)
    if (plzMatch) {
      postalCode = plzMatch[1]
      city = plzMatch[2]
      break
    }
  }

  // If no PLZ found, second part is city
  if (!city && parts.length >= 2) {
    // Maybe the second part contains PLZ without space separator
    const plzMatch2 = parts[1].match(/^(\d{4,5})\s*(.*)/)
    if (plzMatch2) {
      postalCode = plzMatch2[1]
      city = plzMatch2[2] || ''
    } else {
      city = parts[1]
    }
  }

  // If street itself contains PLZ (e.g. "80331 München" with no street)
  if (!postalCode && !city) {
    const plzMatch3 = street.match(/^(\d{4,5})\s+(.+)/)
    if (plzMatch3) {
      postalCode = plzMatch3[1]
      city = plzMatch3[2]
      street = ''
    }
  }

  return { street, city, postalCode, country }
}

export const SerpApiService = {
  async searchPlaces(query: string, location: string, radius: number = 25, maxResults: number = 20, tenantId?: string): Promise<OpportunityResult[]> {
    const apiKey = await getApiKey(tenantId)
    const startTime = Date.now()
    const prompt = `${query} in ${location}`
    const providerId = await getProviderId(tenantId)

    const params = new URLSearchParams({
      engine: 'google_maps',
      q: prompt,
      type: 'search',
      hl: 'de',
      gl: 'de',
      num: String(Math.min(maxResults, 20)),
    })

    const url = `https://serpapi.com/search?${params}&api_key=${apiKey}`

    let response: Response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    } catch (error) {
      const durationMs = Date.now() - startTime
      if (tenantId) {
        AiProviderService.createLog({
          providerId, providerType: 'serpapi', model: 'google_maps',
          prompt, status: 'error', errorMessage: error instanceof Error ? error.message : 'Timeout',
          durationMs, feature: 'opportunity_search',
        }).catch(() => {})
      }
      throw error
    }

    if (!response.ok) {
      const text = await response.text()
      const durationMs = Date.now() - startTime
      if (tenantId) {
        AiProviderService.createLog({
          providerId, providerType: 'serpapi', model: 'google_maps',
          prompt, status: 'error', errorMessage: `HTTP ${response.status}: ${text.substring(0, 200)}`,
          durationMs, feature: 'opportunity_search',
        }).catch(() => {})
      }
      throw new Error(`SerpAPI Fehler: ${response.status}`)
    }

    const data: SerpApiResponse = await response.json()

    if (data.error) {
      const durationMs = Date.now() - startTime
      if (tenantId) {
        AiProviderService.createLog({
          providerId, providerType: 'serpapi', model: 'google_maps',
          prompt, status: 'error', errorMessage: data.error,
          durationMs, feature: 'opportunity_search',
        }).catch(() => {})
      }
      throw new Error(`SerpAPI: ${data.error}`)
    }

    const results: OpportunityResult[] = (data.local_results || []).map(place => {
      const parsed = parseAddress(place.address || '')
      return {
        name: place.title,
        placeId: place.place_id,
        address: parsed.street || place.address || '',
        city: parsed.city || location,
        postalCode: parsed.postalCode,
        country: parsed.country,
        phone: place.phone || null,
        email: null,
        website: place.website || null,
        rating: place.rating || null,
        reviewCount: place.reviews || null,
        industry: query,
        metadata: {
          fullAddress: place.address || null,
          gpsCoordinates: place.gps_coordinates || null,
          operatingHours: place.operating_hours || null,
          thumbnail: place.thumbnail || null,
          type: place.type || null,
          types: place.types || null,
          description: place.description || null,
          serviceOptions: place.service_options || null,
          price: place.price || null,
          hours: place.hours || null,
          reviewsLink: place.reviews_link || null,
          extensions: place.extensions || null,
        },
      }
    })

    // Log success
    const durationMs = Date.now() - startTime
    if (tenantId) {
      AiProviderService.createLog({
        providerId, providerType: 'serpapi', model: 'google_maps',
        prompt, response: `${results.length} Ergebnisse gefunden`,
        status: 'success', durationMs, feature: 'opportunity_search',
      }).catch(() => {})
    }

    return results
  },

  async searchMultiple(
    queries: string[],
    locations: string[],
    radius: number = 25,
    maxPerLocation: number = 20,
    tenantId?: string
  ): Promise<{ results: OpportunityResult[]; totalSearches: number; errors: string[] }> {
    const allResults: OpportunityResult[] = []
    const seenPlaceIds = new Set<string>()
    const errors: string[] = []
    let totalSearches = 0

    for (const location of locations) {
      for (const query of queries) {
        totalSearches++
        try {
          // Rate limit: 1s between requests
          if (totalSearches > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

          const results = await this.searchPlaces(query.trim(), location.trim(), radius, maxPerLocation, tenantId)

          for (const result of results) {
            if (!seenPlaceIds.has(result.placeId)) {
              seenPlaceIds.add(result.placeId)
              allResults.push(result)
            }
          }

          logger.info(`SerpAPI: ${results.length} results for "${query}" in "${location}"`, { module: 'SerpApiService' })
        } catch (error) {
          const msg = `Suche "${query}" in "${location}" fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
          errors.push(msg)
          logger.error(msg, error, { module: 'SerpApiService' })
        }
      }
    }

    return { results: allResults, totalSearches, errors }
  },
}
