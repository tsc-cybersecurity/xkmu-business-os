// ============================================
// Social Media Publishing Service
// Direct posting to LinkedIn and Twitter/X APIs
// ============================================

import { AiProviderService } from '@/lib/services/ai-provider.service'
import { logger } from '@/lib/utils/logger'

export interface PublishResult {
  success: boolean
  postId?: string
  postUrl?: string
  error?: string
}

export const SocialPublishingService = {
  /**
   * Publish to LinkedIn using LinkedIn API v2
   * Requires: AI Provider type='linkedin' with apiKey='accessToken'
   */
  async publishToLinkedIn(tenantId: string, post: {
    content: string
    authorUrn?: string // urn:li:person:xxx or urn:li:organization:xxx
  }): Promise<PublishResult> {
    try {
      const providers = await AiProviderService.getActiveProviders(tenantId)
      const linkedinProvider = providers.find(p => p.providerType === 'linkedin')

      if (!linkedinProvider?.apiKey) {
        return { success: false, error: 'LinkedIn nicht konfiguriert. AI-Provider type=linkedin mit Access Token anlegen.' }
      }

      // apiKey format: "accessToken|authorUrn"
      const parts = linkedinProvider.apiKey.split('|')
      const accessToken = parts[0]
      const authorUrn = post.authorUrn || parts[1] || ''

      if (!authorUrn) {
        return { success: false, error: 'LinkedIn Author URN fehlt (Format: accessToken|urn:li:person:xxx)' }
      }

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: post.content },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        }),
        signal: AbortSignal.timeout(30_000),
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: `LinkedIn API Fehler (${response.status}): ${error}` }
      }

      const data = await response.json()
      return {
        success: true,
        postId: data.id,
        postUrl: `https://www.linkedin.com/feed/update/${data.id}`,
      }
    } catch (error) {
      logger.error('LinkedIn publish error', error, { module: 'SocialPublishing' })
      return { success: false, error: error instanceof Error ? error.message : 'LinkedIn-Verbindung fehlgeschlagen' }
    }
  },

  /**
   * Publish to Twitter/X using Twitter API v2
   * Requires: AI Provider type='twitter' with apiKey='bearerToken'
   */
  async publishToTwitter(tenantId: string, post: {
    content: string
  }): Promise<PublishResult> {
    try {
      const providers = await AiProviderService.getActiveProviders(tenantId)
      const twitterProvider = providers.find(p => p.providerType === 'twitter')

      if (!twitterProvider?.apiKey) {
        return { success: false, error: 'Twitter/X nicht konfiguriert. AI-Provider type=twitter mit Bearer Token anlegen.' }
      }

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${twitterProvider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: post.content.substring(0, 280) }),
        signal: AbortSignal.timeout(30_000),
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: `Twitter API Fehler (${response.status}): ${error}` }
      }

      const data = await response.json()
      return {
        success: true,
        postId: data.data?.id,
        postUrl: `https://x.com/i/status/${data.data?.id}`,
      }
    } catch (error) {
      logger.error('Twitter publish error', error, { module: 'SocialPublishing' })
      return { success: false, error: error instanceof Error ? error.message : 'Twitter-Verbindung fehlgeschlagen' }
    }
  },

  /**
   * Publish to one or more platforms
   */
  async publish(tenantId: string, platforms: string[], content: string): Promise<Record<string, PublishResult>> {
    const results: Record<string, PublishResult> = {}

    for (const platform of platforms) {
      switch (platform.toLowerCase()) {
        case 'linkedin':
          results.linkedin = await this.publishToLinkedIn(tenantId, { content })
          break
        case 'twitter':
        case 'x':
          results.twitter = await this.publishToTwitter(tenantId, { content })
          break
        default:
          results[platform] = { success: false, error: `Plattform '${platform}' nicht unterstuetzt. Aktuell: LinkedIn, Twitter/X` }
      }
    }

    return results
  },
}
