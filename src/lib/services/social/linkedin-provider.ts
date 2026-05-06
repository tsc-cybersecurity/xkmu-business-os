import { db } from '@/lib/db'
import { socialOauthAccounts, type SocialMediaPost } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { decryptToken } from '@/lib/crypto/token-crypto'
import { getSocialTokenKey } from './crypto-config'
import { LinkedInPublishClient } from './linkedin-publish.client'
import type { SocialProvider, PublishResult } from './social-provider'

// LinkedIn akzeptiert lange Texte (Limit ~3000 Zeichen). Wir lassen Hashtags
// im Body wie sie sind (LinkedIn rendert # automatisch als Tag-Link).
function composeBody(content: string, hashtags: unknown): string {
  const list = Array.isArray(hashtags) ? hashtags.map(String).filter(Boolean) : []
  if (list.length === 0) return content
  const tags = list.map((h) => (h.startsWith('#') ? h : `#${h}`))
  const missing = tags.filter((t) => !content.includes(t))
  if (missing.length === 0) return content
  return `${content}\n\n${missing.join(' ')}`
}

async function loadLinkedInAccount() {
  const [row] = await db.select().from(socialOauthAccounts)
    .where(and(eq(socialOauthAccounts.provider, 'linkedin'), eq(socialOauthAccounts.status, 'connected')))
    .limit(1)
  return row
}

export const LinkedInProvider: SocialProvider = {
  name: 'linkedin',

  async publish(post: SocialMediaPost): Promise<PublishResult> {
    if (post.platform !== 'linkedin') throw new Error('only_linkedin_posts')
    const account = await loadLinkedInAccount()
    if (!account) return { ok: false, error: 'no_connected_account', revokeAccount: false }

    // externalAccountId ist der OIDC-sub (Member-ID). LinkedIn-API erwartet als
    // Author-URN das Format urn:li:person:{id}.
    const authorUrn = `urn:li:person:${account.externalAccountId}`
    const text = composeBody(post.content, post.hashtags)

    const key = await getSocialTokenKey()
    const accessToken = decryptToken(account.accessTokenEnc, key)

    return LinkedInPublishClient.publish({
      accessToken,
      authorUrn,
      text,
    })
  },
}
