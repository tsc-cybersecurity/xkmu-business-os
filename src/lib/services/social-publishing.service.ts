// ============================================
// Social Media Publishing Service
// Direct posting to LinkedIn, Twitter/X, Facebook, Instagram APIs
// ============================================
//
// Credentials werden als AI-Provider gespeichert:
//   - linkedin:   apiKey = "accessToken|authorUrn"           (OAuth 2.0 Token + urn:li:person:xxx oder urn:li:organization:xxx)
//   - twitter:    apiKey = "apiKey|apiSecret|accessToken|accessTokenSecret"  (OAuth 1.0a — alle 4 Keys)
//   - facebook:   apiKey = "pageAccessToken|pageId"          (Langlebiges Page-Token + Page-ID)
//   - instagram:  apiKey = "pageAccessToken|igUserId"         (Selbes Page-Token + Instagram Business Account ID)
// ============================================

import { AiProviderService } from '@/lib/services/ai-provider.service'
import { logger } from '@/lib/utils/logger'
import crypto from 'crypto'

export interface PublishResult {
  success: boolean
  postId?: string
  postUrl?: string
  error?: string
}

export interface PublishOptions {
  content: string
  imageUrl?: string
  link?: string
}

// ============================================
// Twitter OAuth 1.0a Signature Helper
// ============================================

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

function generateOAuth1Signature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedKeys = Object.keys(params).sort()
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&')
  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')
}

function generateOAuth1Header(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  bodyParams: Record<string, string> = {}
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  const allParams = { ...oauthParams, ...bodyParams }
  const signature = generateOAuth1Signature(method, url, allParams, apiSecret, accessTokenSecret)
  oauthParams.oauth_signature = signature

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
  return `OAuth ${headerParts.join(', ')}`
}

// ============================================
// Publishing Service
// ============================================

export const SocialPublishingService = {
  /**
   * Publish to LinkedIn using Posts API (modern endpoint)
   * Provider type='linkedin', apiKey='accessToken|authorUrn'
   */
  async publishToLinkedIn(post: PublishOptions): Promise<PublishResult> {
    try {
      const providers = await AiProviderService.getActiveProviders()
      const provider = providers.find((p) => p.providerType === 'linkedin')

      if (!provider?.apiKey) {
        return { success: false, error: 'LinkedIn nicht konfiguriert. AI-Provider type=linkedin anlegen. Format: accessToken|urn:li:person:xxx' }
      }

      const parts = provider.apiKey.split('|')
      const accessToken = parts[0]
      const authorUrn = parts[1] || ''

      if (!authorUrn) {
        return { success: false, error: 'LinkedIn Author URN fehlt. Format: accessToken|urn:li:person:xxx' }
      }

      // Build post body (LinkedIn Posts API)
      const body: Record<string, unknown> = {
        author: authorUrn,
        commentary: post.content,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
      }

      // Add article/link if provided
      if (post.link || post.imageUrl) {
        body.content = {
          article: {
            source: post.link || post.imageUrl,
            title: post.content.substring(0, 100),
            ...(post.imageUrl && { thumbnail: post.imageUrl }),
          },
        }
      }

      const response = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: `LinkedIn API Fehler (${response.status}): ${error}` }
      }

      // Posts API returns post URN in x-restli-id header
      const postUrn = response.headers.get('x-restli-id') || ''
      const activityId = postUrn.replace('urn:li:share:', '').replace('urn:li:ugcPost:', '')

      return {
        success: true,
        postId: postUrn,
        postUrl: activityId ? `https://www.linkedin.com/feed/update/${postUrn}` : undefined,
      }
    } catch (error) {
      logger.error('LinkedIn publish error', error, { module: 'SocialPublishing' })
      return { success: false, error: error instanceof Error ? error.message : 'LinkedIn-Verbindung fehlgeschlagen' }
    }
  },

  /**
   * Publish to Twitter/X using Twitter API v2 with OAuth 1.0a
   * Provider type='twitter', apiKey='apiKey|apiSecret|accessToken|accessTokenSecret'
   */
  async publishToTwitter(post: PublishOptions): Promise<PublishResult> {
    try {
      const providers = await AiProviderService.getActiveProviders()
      const provider = providers.find((p) => p.providerType === 'twitter')

      if (!provider?.apiKey) {
        return { success: false, error: 'Twitter/X nicht konfiguriert. AI-Provider type=twitter anlegen. Format: apiKey|apiSecret|accessToken|accessTokenSecret' }
      }

      const parts = provider.apiKey.split('|')
      if (parts.length < 4) {
        return { success: false, error: 'Twitter Credentials unvollstaendig. Format: apiKey|apiSecret|accessToken|accessTokenSecret' }
      }

      const [apiKey, apiSecret, accessToken, accessTokenSecret] = parts
      const tweetUrl = 'https://api.twitter.com/2/tweets'

      // Truncate to 280 chars
      let tweetText = post.content
      if (post.link) {
        // Leave room for link (t.co URLs are max 23 chars)
        const maxText = 280 - 24
        tweetText = tweetText.substring(0, maxText) + '\n' + post.link
      }
      tweetText = tweetText.substring(0, 280)

      const tweetBody = JSON.stringify({ text: tweetText })

      const authHeader = generateOAuth1Header(
        'POST',
        tweetUrl,
        apiKey,
        apiSecret,
        accessToken,
        accessTokenSecret
      )

      const response = await fetch(tweetUrl, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: tweetBody,
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
   * Publish to Facebook Page using Graph API
   * Provider type='facebook', apiKey='pageAccessToken|pageId'
   */
  async publishToFacebook(post: PublishOptions): Promise<PublishResult> {
    try {
      const providers = await AiProviderService.getActiveProviders()
      const provider = providers.find((p) => p.providerType === 'facebook')

      if (!provider?.apiKey) {
        return { success: false, error: 'Facebook nicht konfiguriert. AI-Provider type=facebook anlegen. Format: pageAccessToken|pageId' }
      }

      const parts = provider.apiKey.split('|')
      if (parts.length < 2) {
        return { success: false, error: 'Facebook Credentials unvollstaendig. Format: pageAccessToken|pageId' }
      }

      const [pageAccessToken, pageId] = parts

      // Build request body
      const body: Record<string, string> = {
        message: post.content,
        access_token: pageAccessToken,
      }

      if (post.link) {
        body.link = post.link
      }

      const params = new URLSearchParams(body)

      // Photo post if image provided (different endpoint)
      let endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`
      if (post.imageUrl && !post.link) {
        endpoint = `https://graph.facebook.com/v21.0/${pageId}/photos`
        params.set('url', post.imageUrl)
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: AbortSignal.timeout(30_000),
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: `Facebook API Fehler (${response.status}): ${error}` }
      }

      const data = await response.json()
      const postId = data.id || data.post_id
      return {
        success: true,
        postId,
        postUrl: `https://www.facebook.com/${postId?.replace('_', '/posts/')}`,
      }
    } catch (error) {
      logger.error('Facebook publish error', error, { module: 'SocialPublishing' })
      return { success: false, error: error instanceof Error ? error.message : 'Facebook-Verbindung fehlgeschlagen' }
    }
  },

  /**
   * Publish to Instagram using Instagram Graph API (via Meta)
   * Provider type='instagram', apiKey='pageAccessToken|igUserId'
   *
   * Instagram erfordert IMMER ein Bild. Nur-Text-Posts sind nicht moeglich.
   * Ohne imageUrl wird der Post uebersprungen.
   */
  async publishToInstagram(post: PublishOptions): Promise<PublishResult> {
    try {
      const providers = await AiProviderService.getActiveProviders()
      const provider = providers.find((p) => p.providerType === 'instagram')

      if (!provider?.apiKey) {
        return { success: false, error: 'Instagram nicht konfiguriert. AI-Provider type=instagram anlegen. Format: pageAccessToken|igBusinessAccountId' }
      }

      const parts = provider.apiKey.split('|')
      if (parts.length < 2) {
        return { success: false, error: 'Instagram Credentials unvollstaendig. Format: pageAccessToken|igBusinessAccountId' }
      }

      const [pageAccessToken, igUserId] = parts

      if (!post.imageUrl) {
        return { success: false, error: 'Instagram erfordert ein Bild (imageUrl). Nur-Text-Posts nicht moeglich.' }
      }

      // Step 1: Create media container
      const containerParams = new URLSearchParams({
        image_url: post.imageUrl,
        caption: post.content,
        access_token: pageAccessToken,
      })

      const containerResponse = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: containerParams.toString(),
          signal: AbortSignal.timeout(30_000),
        }
      )

      if (!containerResponse.ok) {
        const error = await containerResponse.text()
        return { success: false, error: `Instagram Container Fehler (${containerResponse.status}): ${error}` }
      }

      const containerData = await containerResponse.json()
      const creationId = containerData.id

      if (!creationId) {
        return { success: false, error: 'Instagram Container ID nicht erhalten' }
      }

      // Step 2: Wait briefly for media processing, then publish
      await new Promise((r) => setTimeout(r, 3000))

      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: pageAccessToken,
      })

      const publishResponse = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: publishParams.toString(),
          signal: AbortSignal.timeout(60_000),
        }
      )

      if (!publishResponse.ok) {
        const error = await publishResponse.text()
        return { success: false, error: `Instagram Publish Fehler (${publishResponse.status}): ${error}` }
      }

      const publishData = await publishResponse.json()
      return {
        success: true,
        postId: publishData.id,
        postUrl: `https://www.instagram.com/p/${publishData.id}/`,
      }
    } catch (error) {
      logger.error('Instagram publish error', error, { module: 'SocialPublishing' })
      return { success: false, error: error instanceof Error ? error.message : 'Instagram-Verbindung fehlgeschlagen' }
    }
  },

  /**
   * Publish to one or more platforms
   */
  async publish(platforms: string[], content: string, options?: { imageUrl?: string; link?: string }): Promise<Record<string, PublishResult>> {
    const results: Record<string, PublishResult> = {}
    const post: PublishOptions = { content, imageUrl: options?.imageUrl, link: options?.link }

    for (const platform of platforms) {
      switch (platform.toLowerCase()) {
        case 'linkedin':
          results.linkedin = await this.publishToLinkedIn(post)
          break
        case 'twitter':
        case 'x':
          results.twitter = await this.publishToTwitter(post)
          break
        case 'facebook':
          results.facebook = await this.publishToFacebook(post)
          break
        case 'instagram':
          results.instagram = await this.publishToInstagram(post)
          break
        default:
          results[platform] = { success: false, error: `Plattform '${platform}' nicht unterstuetzt` }
      }
    }

    return results
  },

  /**
   * Test connection to a platform
   */
  async testConnection(platform: string): Promise<PublishResult> {
    try {
      const providers = await AiProviderService.getActiveProviders()

      switch (platform.toLowerCase()) {
        case 'linkedin': {
          const p = providers.find((pr) => pr.providerType === 'linkedin')
          if (!p?.apiKey) return { success: false, error: 'LinkedIn nicht konfiguriert' }
          const token = p.apiKey.split('|')[0]
          const res = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(10_000),
          })
          if (!res.ok) return { success: false, error: `LinkedIn Token ungueltig (${res.status})` }
          const data = await res.json()
          return { success: true, postId: data.sub, postUrl: `Name: ${data.name || data.email || 'OK'}` }
        }

        case 'twitter':
        case 'x': {
          const p = providers.find((pr) => pr.providerType === 'twitter')
          if (!p?.apiKey) return { success: false, error: 'Twitter nicht konfiguriert' }
          const parts = p.apiKey.split('|')
          if (parts.length < 4) return { success: false, error: 'Twitter Credentials unvollstaendig' }
          const [apiKey, apiSecret, accessToken, accessTokenSecret] = parts
          const url = 'https://api.twitter.com/2/users/me'
          const authHeader = generateOAuth1Header('GET', url, apiKey, apiSecret, accessToken, accessTokenSecret)
          const res = await fetch(url, {
            headers: { Authorization: authHeader },
            signal: AbortSignal.timeout(10_000),
          })
          if (!res.ok) return { success: false, error: `Twitter Token ungueltig (${res.status})` }
          const data = await res.json()
          return { success: true, postId: data.data?.id, postUrl: `@${data.data?.username || 'OK'}` }
        }

        case 'facebook': {
          const p = providers.find((pr) => pr.providerType === 'facebook')
          if (!p?.apiKey) return { success: false, error: 'Facebook nicht konfiguriert' }
          const [token, pageId] = p.apiKey.split('|')
          if (!pageId) return { success: false, error: 'PageId fehlt' }
          const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=name,id&access_token=${token}`, {
            signal: AbortSignal.timeout(10_000),
          })
          if (!res.ok) return { success: false, error: `Facebook Token ungueltig (${res.status})` }
          const data = await res.json()
          return { success: true, postId: data.id, postUrl: `Page: ${data.name || 'OK'}` }
        }

        case 'instagram': {
          const p = providers.find((pr) => pr.providerType === 'instagram')
          if (!p?.apiKey) return { success: false, error: 'Instagram nicht konfiguriert' }
          const [token, igUserId] = p.apiKey.split('|')
          if (!igUserId) return { success: false, error: 'IG User ID fehlt' }
          const res = await fetch(`https://graph.facebook.com/v21.0/${igUserId}?fields=username,id&access_token=${token}`, {
            signal: AbortSignal.timeout(10_000),
          })
          if (!res.ok) return { success: false, error: `Instagram Token ungueltig (${res.status})` }
          const data = await res.json()
          return { success: true, postId: data.id, postUrl: `@${data.username || 'OK'}` }
        }

        default:
          return { success: false, error: `Unbekannte Plattform: ${platform}` }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen' }
    }
  },
}
