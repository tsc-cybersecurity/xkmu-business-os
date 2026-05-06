import { db } from '@/lib/db'
import { socialOauthAccounts, type SocialMediaPost } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { decryptToken } from '@/lib/crypto/token-crypto'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { getSocialTokenKey } from './crypto-config'
import { MetaPublishClient } from './meta-publish.client'
import type { SocialProvider, PublishResult } from './social-provider'

/**
 * Meta verlangt absolute, öffentlich erreichbare URLs fuer Bilder. Relative
 * Pfade wie "/api/v1/media/serve/..." muss der Provider mit dem App-Origin
 * praefixieren bevor sie an die Graph-API weitergeleitet werden.
 */
async function toAbsoluteImageUrl(imageUrl: string | null | undefined): Promise<string | null> {
  if (!imageUrl) return null
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  const origin = await CmsDesignService.getAppUrl()
  return `${origin.replace(/\/+$/, '')}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
}

/**
 * Haengt Hashtags an den Body, wenn sie nicht schon im content stehen.
 * FB/IG zeigen Hashtags nur an, wenn sie wirklich im Post-Text sind — die DB-
 * `hashtags`-Spalte wird sonst beim Publish ignoriert.
 */
function composeBody(content: string, hashtags: unknown): string {
  const list = Array.isArray(hashtags) ? hashtags.map(String).filter(Boolean) : []
  if (list.length === 0) return content
  // Hash sicherstellen + Duplikate gegen content vermeiden
  const tags = list.map((h) => (h.startsWith('#') ? h : `#${h}`))
  const missing = tags.filter((t) => !content.includes(t))
  if (missing.length === 0) return content
  return `${content}\n\n${missing.join(' ')}`
}

async function loadAccount(provider: 'facebook' | 'instagram') {
  const [row] = await db.select().from(socialOauthAccounts)
    .where(and(eq(socialOauthAccounts.provider, provider), eq(socialOauthAccounts.status, 'connected')))
    .limit(1)
  return row
}

export const MetaProvider: SocialProvider = {
  // Note: this provider serves both 'facebook' and 'instagram' via post.platform.
  name: 'facebook',

  async publish(post: SocialMediaPost): Promise<PublishResult> {
    const platform = post.platform
    if (platform !== 'facebook' && platform !== 'instagram') {
      throw new Error('unsupported_provider_for_meta')
    }
    const account = await loadAccount(platform)
    if (!account) return { ok: false, error: 'no_connected_account', revokeAccount: false }

    const key = await getSocialTokenKey()
    const pageAccessToken = decryptToken(account.accessTokenEnc, key)
    const body = composeBody(post.content, post.hashtags)
    const imageUrl = await toAbsoluteImageUrl(post.imageUrl)

    if (platform === 'facebook') {
      return MetaPublishClient.publishToFacebookPage({
        pageId: account.externalAccountId,
        pageAccessToken,
        message: body,
        imageUrl,
      })
    }
    return MetaPublishClient.publishToInstagram({
      igUserId: account.externalAccountId,
      pageAccessToken,
      caption: body,
      imageUrl,
    })
  },
}
