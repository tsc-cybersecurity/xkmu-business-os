import { db } from '@/lib/db'
import { socialOauthAccounts, type SocialPost, type SocialPostTarget } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { decryptToken } from '@/lib/crypto/token-crypto'
import { getSocialTokenKey } from './crypto-config'
import { MetaPublishClient } from './meta-publish.client'
import type { SocialProvider, PublishResult } from './social-provider'

async function loadAccount(provider: 'facebook' | 'instagram') {
  const [row] = await db.select().from(socialOauthAccounts)
    .where(and(eq(socialOauthAccounts.provider, provider), eq(socialOauthAccounts.status, 'connected')))
    .limit(1)
  return row
}

export const MetaProvider: SocialProvider = {
  // Note: this provider serves both 'facebook' and 'instagram' targets.
  // The dispatcher in SocialPostService.publish uses target.provider, not provider.name.
  name: 'facebook',

  async publish(target: SocialPostTarget, post: SocialPost): Promise<PublishResult> {
    const provider = target.provider
    if (provider !== 'facebook' && provider !== 'instagram') {
      throw new Error('unsupported_provider_for_meta')
    }
    const account = await loadAccount(provider)
    if (!account) return { ok: false, error: 'no_connected_account', revokeAccount: false }

    const key = await getSocialTokenKey()
    const pageAccessToken = decryptToken(account.accessTokenEnc, key)
    const body = target.bodyOverride ?? post.masterBody
    const imageUrl = post.masterImagePath

    if (provider === 'facebook') {
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
