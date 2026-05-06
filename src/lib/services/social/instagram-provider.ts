import { db } from '@/lib/db'
import { socialOauthAccounts, type SocialMediaPost } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { decryptToken } from '@/lib/crypto/token-crypto'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { getSocialTokenKey } from './crypto-config'
import { InstagramPublishClient } from './instagram-publish.client'
import type { SocialProvider, PublishResult } from './social-provider'

async function toAbsoluteImageUrl(imageUrl: string | null | undefined): Promise<string | null> {
  if (!imageUrl) return null
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  const origin = await CmsDesignService.getAppUrl()
  return `${origin.replace(/\/+$/, '')}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
}

function composeBody(content: string, hashtags: unknown): string {
  const list = Array.isArray(hashtags) ? hashtags.map(String).filter(Boolean) : []
  if (list.length === 0) return content
  const tags = list.map((h) => (h.startsWith('#') ? h : `#${h}`))
  const missing = tags.filter((t) => !content.includes(t))
  if (missing.length === 0) return content
  return `${content}\n\n${missing.join(' ')}`
}

async function loadIgAccount() {
  const [row] = await db.select().from(socialOauthAccounts)
    .where(and(eq(socialOauthAccounts.provider, 'instagram'), eq(socialOauthAccounts.status, 'connected')))
    .limit(1)
  return row
}

export const InstagramProvider: SocialProvider = {
  name: 'instagram',

  async publish(post: SocialMediaPost): Promise<PublishResult> {
    if (post.platform !== 'instagram') throw new Error('only_instagram_posts')
    const account = await loadIgAccount()
    if (!account) return { ok: false, error: 'no_connected_account', revokeAccount: false }
    const token = decryptToken(account.accessTokenEnc, await getSocialTokenKey())
    return InstagramPublishClient.publishImage({
      igUserId: account.externalAccountId,
      accessToken: token,
      caption: composeBody(post.content, post.hashtags),
      imageUrl: await toAbsoluteImageUrl(post.imageUrl),
    })
  },
}
