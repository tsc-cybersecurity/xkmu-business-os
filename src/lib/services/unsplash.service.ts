// ============================================
// Unsplash Image Service
// Fetches images from Unsplash for blog posts
// ============================================

export interface UnsplashPhoto {
  url: string
  alt: string
  credit: string
}

export const UnsplashService = {
  /**
   * Search for a photo on Unsplash by query keywords.
   * Uses the Unsplash API if UNSPLASH_ACCESS_KEY is set,
   * otherwise falls back to source.unsplash.com redirect URL.
   */
  async searchPhoto(query: string): Promise<UnsplashPhoto | null> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY

    if (accessKey) {
      return this.searchWithApi(query, accessKey)
    }

    return this.searchWithSource(query)
  },

  async searchWithApi(query: string, accessKey: string): Promise<UnsplashPhoto | null> {
    try {
      const params = new URLSearchParams({
        query,
        per_page: '1',
        orientation: 'landscape',
      })

      const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      })

      if (!response.ok) {
        console.warn(`[Unsplash API] HTTP ${response.status}, falling back to source URL`)
        return this.searchWithSource(query)
      }

      const data = await response.json()
      const photo = data.results?.[0]

      if (!photo) return this.searchWithSource(query)

      return {
        url: photo.urls?.regular || photo.urls?.full,
        alt: photo.alt_description || query,
        credit: photo.user?.name ? `Photo by ${photo.user.name} on Unsplash` : 'Unsplash',
      }
    } catch (error) {
      console.error('[Unsplash API] Error:', error)
      return this.searchWithSource(query)
    }
  },

  async searchWithSource(query: string): Promise<UnsplashPhoto | null> {
    // source.unsplash.com was deprecated in 2023 and is unreliable
    // Without an API key, we cannot fetch Unsplash images
    console.warn('[Unsplash] No UNSPLASH_ACCESS_KEY configured, skipping image fetch')
    return null
  },
}
