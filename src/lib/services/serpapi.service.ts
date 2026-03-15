// ============================================
// SerpAPI Service - Google Maps Business Search
// Searches for businesses via SerpAPI's Google Maps engine
// ============================================

import { logger } from '@/lib/utils/logger'

interface SerpApiPlace {
  title: string
  place_id: string
  address: string
  phone?: string
  website?: string
  rating?: number
  reviews?: number
  type?: string
  gps_coordinates?: { latitude: number; longitude: number }
  operating_hours?: Record<string, string>
  thumbnail?: string
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

function getApiKey(): string {
  const key = process.env.SERPAPI_KEY
  if (!key) throw new Error('SERPAPI_KEY ist nicht konfiguriert. Bitte in den Umgebungsvariablen setzen.')
  return key
}

function parseAddress(address: string): { street: string; city: string; postalCode: string; country: string } {
  // German address: "Musterstr. 1, 80331 München, Germany"
  const parts = address.split(',').map(p => p.trim())
  const street = parts[0] || ''
  const cityPart = parts[1] || ''
  const country = parts[2] || 'Deutschland'

  const plzMatch = cityPart.match(/(\d{4,5})\s+(.+)/)
  return {
    street,
    city: plzMatch ? plzMatch[2] : cityPart,
    postalCode: plzMatch ? plzMatch[1] : '',
    country: country.includes('Germany') || country.includes('Deutschland') ? 'DE' : country.substring(0, 10),
  }
}

export const SerpApiService = {
  async searchPlaces(query: string, location: string, radius: number = 25, maxResults: number = 20): Promise<OpportunityResult[]> {
    const apiKey = getApiKey()

    const params = new URLSearchParams({
      engine: 'google_maps',
      q: `${query} in ${location}`,
      type: 'search',
      hl: 'de',
      gl: 'de',
      num: String(Math.min(maxResults, 20)), // SerpAPI max per request
    })

    const url = `https://serpapi.com/search?${params}&api_key=${apiKey}`

    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const text = await response.text()
      logger.error('SerpAPI request failed', new Error(text), { module: 'SerpApiService', query, location })
      throw new Error(`SerpAPI Fehler: ${response.status}`)
    }

    const data: SerpApiResponse = await response.json()

    if (data.error) {
      throw new Error(`SerpAPI: ${data.error}`)
    }

    const results: OpportunityResult[] = (data.local_results || []).map(place => {
      const parsed = parseAddress(place.address || '')
      return {
        name: place.title,
        placeId: place.place_id,
        address: place.address || '',
        city: parsed.city || location,
        postalCode: parsed.postalCode,
        country: parsed.country,
        phone: place.phone || null,
        email: null, // SerpAPI doesn't return email
        website: place.website || null,
        rating: place.rating || null,
        reviewCount: place.reviews || null,
        industry: query,
        metadata: {
          gpsCoordinates: place.gps_coordinates || null,
          operatingHours: place.operating_hours || null,
          thumbnail: place.thumbnail || null,
          type: place.type || null,
        },
      }
    })

    return results
  },

  async searchMultiple(
    queries: string[],
    locations: string[],
    radius: number = 25,
    maxPerLocation: number = 20
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

          const results = await this.searchPlaces(query.trim(), location.trim(), radius, maxPerLocation)

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
