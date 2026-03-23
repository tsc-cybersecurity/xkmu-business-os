// ============================================
// WordPress REST API Integration
// Publish blog posts to external WordPress sites
// ============================================

import { logger } from '@/lib/utils/logger'

export interface WpCredentials {
  url: string       // z.B. https://example.com
  user: string      // WordPress username
  appPassword: string // WordPress application password
}

export interface WpPublishResult {
  success: boolean
  wpPostId?: number
  wpUrl?: string
  error?: string
}

export const WordPressService = {
  async publish(credentials: WpCredentials, post: {
    title: string
    content: string
    status?: 'publish' | 'draft'
    excerpt?: string
    featuredImageUrl?: string
  }): Promise<WpPublishResult> {
    try {
      const wpApiUrl = `${credentials.url.replace(/\/+$/, '')}/wp-json/wp/v2/posts`
      const auth = Buffer.from(`${credentials.user}:${credentials.appPassword}`).toString('base64')

      const response = await fetch(wpApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          title: post.title,
          content: post.content,
          status: post.status || 'draft',
          excerpt: post.excerpt || '',
        }),
        signal: AbortSignal.timeout(30_000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, error: `WordPress API Fehler (${response.status}): ${errorText}` }
      }

      const data = await response.json()
      return {
        success: true,
        wpPostId: data.id,
        wpUrl: data.link,
      }
    } catch (error) {
      logger.error('WordPress publish error', error, { module: 'WordPressService' })
      return { success: false, error: error instanceof Error ? error.message : 'WordPress-Verbindung fehlgeschlagen' }
    }
  },

  async testConnection(credentials: WpCredentials): Promise<{ success: boolean; siteName?: string; error?: string }> {
    try {
      const response = await fetch(`${credentials.url.replace(/\/+$/, '')}/wp-json/wp/v2/settings`, {
        headers: { 'Authorization': `Basic ${Buffer.from(`${credentials.user}:${credentials.appPassword}`).toString('base64')}` },
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) return { success: false, error: `HTTP ${response.status}` }
      const data = await response.json()
      return { success: true, siteName: data.title }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Verbindung fehlgeschlagen' }
    }
  },
}
